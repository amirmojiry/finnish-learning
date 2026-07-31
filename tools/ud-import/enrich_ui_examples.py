#!/usr/bin/env python3
"""Attach compact, feature-specific UD examples to each vocabulary analysis."""

from __future__ import annotations

import argparse
import json
import unicodedata
from pathlib import Path
from typing import Any

MAX_UI_EXAMPLES = 3


def normalize(value: str) -> str:
    return unicodedata.normalize("NFC", str(value or "").strip()).casefold()


def compact_example(
    sentence: dict[str, Any],
    target_form: str,
    target_lemma: str = "",
    target_upos: str = "",
) -> dict[str, Any]:
    return {
        "sentence_id": sentence.get("sentence_id", ""),
        "text": sentence.get("text", ""),
        "treebank": sentence.get("treebank", ""),
        "split": sentence.get("split", ""),
        "source_file": sentence.get("source_file", ""),
        "target_form": target_form,
        "target_lemma": target_lemma,
        "target_upos": target_upos,
    }


def enrich(analyses_path: Path, examples_path: Path) -> None:
    analyses = json.loads(analyses_path.read_text(encoding="utf-8"))
    examples = json.loads(examples_path.read_text(encoding="utf-8"))

    words = analyses.get("words")
    sentences = examples.get("sentences")
    if not isinstance(words, list):
        raise ValueError("word-analyses.json must contain a words array")
    if not isinstance(sentences, list):
        raise ValueError("examples.json must contain a sentences array")

    sentences_by_id = {
        str(sentence.get("sentence_id")): sentence
        for sentence in sentences
        if sentence.get("sentence_id")
    }

    for row in words:
        word = str(row.get("word", ""))
        normalized_word = normalize(word)
        selected_sentences = [
            sentences_by_id[sentence_id]
            for sentence_id in row.get("example_ids", [])
            if sentence_id in sentences_by_id
        ]

        ui_examples: list[dict[str, Any]] = []
        feature_examples: dict[str, dict[str, dict[str, Any]]] = {}
        seen_texts: set[str] = set()

        for sentence in selected_sentences:
            text = str(sentence.get("text", "")).strip()
            matching_tokens = [
                token
                for token in sentence.get("tokens", [])
                if normalize(token.get("form", "")) == normalized_word
            ]
            first_token = matching_tokens[0] if matching_tokens else {}

            if text and text not in seen_texts and len(ui_examples) < MAX_UI_EXAMPLES:
                ui_examples.append(
                    compact_example(
                        sentence,
                        first_token.get("form", word),
                        first_token.get("lemma", ""),
                        first_token.get("upos", ""),
                    )
                )
                seen_texts.add(text)

            for token in matching_tokens:
                example = compact_example(
                    sentence,
                    token.get("form", word),
                    token.get("lemma", ""),
                    token.get("upos", ""),
                )
                feats = token.get("feats") or {}
                if not isinstance(feats, dict):
                    continue
                for feature_name, raw_values in feats.items():
                    values = raw_values if isinstance(raw_values, list) else [raw_values]
                    feature_bucket = feature_examples.setdefault(str(feature_name), {})
                    for value in values:
                        value_key = str(value)
                        if value_key and value_key not in feature_bucket:
                            feature_bucket[value_key] = example

        row["ui_examples"] = ui_examples
        row["feature_examples"] = feature_examples

    analyses_path.write_text(
        json.dumps(analyses, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Enriched {len(words)} word analyses with compact UD examples")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--analyses",
        type=Path,
        default=Path("data/ud/word-analyses.json"),
    )
    parser.add_argument(
        "--examples",
        type=Path,
        default=Path("data/ud/examples.json"),
    )
    args = parser.parse_args()
    enrich(args.analyses, args.examples)


if __name__ == "__main__":
    main()
