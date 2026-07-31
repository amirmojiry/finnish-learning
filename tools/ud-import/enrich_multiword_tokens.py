#!/usr/bin/env python3
"""Add CoNLL-U multiword-token analyses to generated Finnish UD data.

UD multiword token rows (IDs such as 4-5) represent one visible form whose
syntactic components are annotated on the following integer-ID rows. This
post-processing step preserves the visible form and the exact component UPOS,
FEATS and dependency annotations. It is intentionally separate from the base
extractor so the initial output remains easy to validate.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

MAX_EXAMPLES = 5
MAX_CANDIDATES = 30
FILE_RE = re.compile(r"fi_(?P<treebank>[a-z]+)-ud-(?P<split>train|dev|test)\.conllu$", re.I)
PRIORITY = {"TDT": 40, "FTB": 30, "PUD": 20, "OOD": 10}
URL_RE = re.compile(r"(?:https?://|www\.|\S+@\S+)", re.I)


def normalize(value: str) -> str:
    return unicodedata.normalize("NFC", value.strip()).casefold()


def parse_feats(raw: str) -> dict[str, list[str]]:
    if not raw or raw == "_":
        return {}
    result: dict[str, list[str]] = {}
    for item in raw.split("|"):
        if "=" not in item:
            continue
        name, values = item.split("=", 1)
        result[name] = [value for value in values.split(",") if value]
    return result


def source_info(path: Path) -> tuple[str, str]:
    match = FILE_RE.search(path.name)
    if not match:
        raise ValueError(f"Unexpected CoNLL-U filename: {path.name}")
    return match.group("treebank").upper(), match.group("split").lower()


def parse_conllu(path: Path) -> Iterable[dict[str, Any]]:
    comments: dict[str, str] = {}
    tokens: list[dict[str, Any]] = []
    multiwords: list[dict[str, Any]] = []
    number = 0

    def flush() -> dict[str, Any] | None:
        nonlocal comments, tokens, multiwords, number
        if not tokens:
            comments = {}
            multiwords = []
            return None
        number += 1
        sentence = {
            "sent_id": comments.get("sent_id") or f"line-{number}",
            "text": comments.get("text") or " ".join(token["form"] for token in tokens),
            "tokens": tokens,
            "multiword_tokens": multiwords,
        }
        comments = {}
        tokens = []
        multiwords = []
        return sentence

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw in handle:
            line = raw.rstrip("\r\n")
            if not line:
                sentence = flush()
                if sentence:
                    yield sentence
                continue
            if line.startswith("#"):
                if "=" in line:
                    key, value = line[1:].split("=", 1)
                    comments[key.strip()] = value.strip()
                continue
            columns = line.split("\t")
            if len(columns) != 10:
                continue
            token_id = columns[0]
            if "-" in token_id:
                try:
                    start, end = (int(value) for value in token_id.split("-", 1))
                except ValueError:
                    continue
                multiwords.append({
                    "id": token_id,
                    "start": start,
                    "end": end,
                    "form": columns[1],
                })
                continue
            if "." in token_id:
                continue
            try:
                numeric_id = int(token_id)
                head = int(columns[6]) if columns[6] != "_" else 0
            except ValueError:
                continue
            tokens.append({
                "id": numeric_id,
                "form": columns[1],
                "lemma": columns[2] if columns[2] != "_" else columns[1],
                "upos": columns[3] if columns[3] != "_" else "X",
                "feats": parse_feats(columns[5]),
                "head": head,
                "deprel": columns[7] if columns[7] != "_" else "dep",
            })

    sentence = flush()
    if sentence:
        yield sentence


def component_analysis(multiword: dict[str, Any], components: list[dict[str, Any]]) -> dict[str, Any]:
    start, end = multiword["start"], multiword["end"]
    rows = []
    for component in components:
        if component["head"] == 0:
            head_scope = "root"
        elif start <= component["head"] <= end:
            head_scope = "internal"
        else:
            head_scope = "external"
        rows.append({
            "form": component["form"],
            "lemma": component["lemma"],
            "upos": component["upos"],
            "feats": component["feats"],
            "deprel": component["deprel"],
            "head_scope": head_scope,
        })
    return {
        "kind": "multiword_token",
        "lemma": "+".join(component["lemma"] for component in components),
        "components": rows,
    }


def score(treebank: str, text: str, token_count: int) -> int:
    result = PRIORITY.get(treebank, 0)
    result += 24 if 5 <= token_count <= 18 else 12 if 3 <= token_count <= 25 else -10
    if 25 <= len(text) <= 180:
        result += 8
    if text and text[0].isupper():
        result += 2
    if text.endswith((".", "?", "!")):
        result += 2
    if URL_RE.search(text):
        result -= 100
    return result


def percent(count: int, total: int) -> float:
    return round(count / total * 100, 4) if total else 0.0


def compact_tokens(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{
        "id": token["id"],
        "form": token["form"],
        "lemma": token["lemma"],
        "upos": token["upos"],
        "feats": token["feats"],
        "head": token["head"],
        "deprel": token["deprel"],
    } for token in tokens]


def process(input_dir: Path, vocabulary: Path, output_dir: Path) -> None:
    vocabulary_data = json.loads(vocabulary.read_text(encoding="utf-8"))
    targets = {
        normalize(item["word"]): {
            "word_id": str(item.get("word_id") or f"fi-{int(item.get('rank', index)):04d}"),
            "rank": int(item.get("rank", index)),
            "word": str(item["word"]),
        }
        for index, item in enumerate(vocabulary_data["words"], start=1)
    }

    analyses_path = output_dir / "word-analyses.json"
    examples_path = output_dir / "examples.json"
    coverage_path = output_dir / "coverage-report.json"
    metadata_path = output_dir / "metadata.json"
    labels_path = output_dir / "labels-fa.json"

    analyses_data = json.loads(analyses_path.read_text(encoding="utf-8"))
    examples_data = json.loads(examples_path.read_text(encoding="utf-8"))
    coverage_data = json.loads(coverage_path.read_text(encoding="utf-8"))
    metadata_data = json.loads(metadata_path.read_text(encoding="utf-8"))
    labels_data = json.loads(labels_path.read_text(encoding="utf-8"))

    words_by_id = {row["word_id"]: row for row in analyses_data["words"]}
    examples_by_id = {row["sentence_id"]: row for row in examples_data["sentences"]}
    stats: dict[str, dict[str, Any]] = defaultdict(lambda: {
        "occurrences": 0,
        "treebanks": Counter(),
        "splits": Counter(),
        "analyses": Counter(),
        "candidates": [],
    })

    for path in sorted(input_dir.glob("*.conllu")):
        treebank, split = source_info(path)
        for sentence in parse_conllu(path):
            by_id = {token["id"]: token for token in sentence["tokens"]}
            for multiword in sentence["multiword_tokens"]:
                target = targets.get(normalize(multiword["form"]))
                if not target:
                    continue
                components = [
                    by_id[token_id]
                    for token_id in range(multiword["start"], multiword["end"] + 1)
                    if token_id in by_id
                ]
                if not components:
                    continue
                word_stats = stats[target["word_id"]]
                word_stats["occurrences"] += 1
                word_stats["treebanks"][treebank] += 1
                word_stats["splits"][split] += 1
                analysis = component_analysis(multiword, components)
                key = json.dumps(analysis, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
                word_stats["analyses"][key] += 1

                sentence_id = f"{treebank.lower()}:{split}:{sentence['sent_id']}"
                candidate = {
                    "sentence_id": sentence_id,
                    "sent_id": sentence["sent_id"],
                    "treebank": treebank,
                    "split": split,
                    "source_file": path.name,
                    "text": sentence["text"].strip(),
                    "token_count": len(sentence["tokens"]),
                    "target_token_ids": [multiword["id"]],
                    "matched_targets": [{
                        "word_id": target["word_id"],
                        "rank": target["rank"],
                        "word": target["word"],
                        "token_id": multiword["id"],
                        "component_token_ids": [component["id"] for component in components],
                        "kind": "multiword_token",
                    }],
                    "tokens": compact_tokens(sentence["tokens"]),
                    "multiword_tokens": sentence["multiword_tokens"],
                    "score": score(treebank, sentence["text"], len(sentence["tokens"])),
                }
                word_stats["candidates"].append(candidate)
                word_stats["candidates"].sort(
                    key=lambda item: (item["score"], -item["token_count"], item["sentence_id"]),
                    reverse=True,
                )
                del word_stats["candidates"][MAX_CANDIDATES:]

    for row in analyses_data["words"]:
        row.setdefault("surface_kinds", {"token": row["occurrences"], "multiword_token": 0})
        row.setdefault("upos_observed_occurrences", row["occurrences"])
        for analysis in row.get("analyses", []):
            analysis.setdefault("kind", "token")
        if row.get("dominant_analysis"):
            row["dominant_analysis"].setdefault("kind", "token")

    for word_id, word_stats in stats.items():
        row = words_by_id[word_id]
        existing_occurrences = int(row.get("occurrences", 0))
        added_occurrences = word_stats["occurrences"]
        total = existing_occurrences + added_occurrences
        row["occurrences"] = total
        row["surface_kinds"]["multiword_token"] += added_occurrences

        for treebank, count in word_stats["treebanks"].items():
            row.setdefault("treebanks", {})[treebank] = row.get("treebanks", {}).get(treebank, 0) + count
        for split, count in word_stats["splits"].items():
            row.setdefault("splits", {})[split] = row.get("splits", {}).get(split, 0) + count

        combined = []
        for analysis in row.get("analyses", []):
            analysis["percent"] = percent(analysis["count"], total)
            combined.append(analysis)
        for key, count in word_stats["analyses"].most_common():
            analysis = json.loads(key)
            analysis["count"] = count
            analysis["percent"] = percent(count, total)
            combined.append(analysis)
        combined.sort(key=lambda item: (-item["count"], item.get("kind", ""), item.get("lemma", "")))
        row["analyses"] = combined
        row["dominant_analysis"] = combined[0] if combined else None
        row["dominant_analysis_percent"] = combined[0]["percent"] if combined else 0.0
        share = row["dominant_analysis_percent"]
        row["analysis_confidence"] = "high" if share >= 90 else "medium" if share >= 70 else "low"

        selected = list(row.get("example_ids", []))
        seen_text = {normalize(examples_by_id[example_id]["text"]) for example_id in selected if example_id in examples_by_id}
        for candidate in word_stats["candidates"]:
            text_key = normalize(candidate["text"])
            if not text_key or text_key in seen_text:
                continue
            seen_text.add(text_key)
            example_id = candidate["sentence_id"]
            selected.append(example_id)
            examples_by_id.setdefault(example_id, {key: value for key, value in candidate.items() if key != "score"})
            if len(selected) >= MAX_EXAMPLES:
                break
        row["example_ids"] = selected[:MAX_EXAMPLES]

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    analyses_data["generated_at"] = generated_at
    examples_data["generated_at"] = generated_at
    examples_data["sentences"] = sorted(examples_by_id.values(), key=lambda row: row["sentence_id"])

    found = [row for row in analyses_data["words"] if row["occurrences"] > 0]
    missing = [{"word_id": row["word_id"], "rank": row["rank"], "word": row["word"]}
               for row in analyses_data["words"] if row["occurrences"] == 0]
    coverage_data.update({
        "generated_at": generated_at,
        "found_word_count": len(found),
        "missing_word_count": len(missing),
        "coverage_percent": percent(len(found), len(analyses_data["words"])),
        "total_matched_occurrences": sum(row["occurrences"] for row in analyses_data["words"]),
        "words_with_examples": sum(bool(row.get("example_ids")) for row in analyses_data["words"]),
        "selected_sentence_count": len(examples_data["sentences"]),
        "missing_words": missing,
        "low_evidence_words": [
            {"word_id": row["word_id"], "rank": row["rank"], "word": row["word"], "occurrences": row["occurrences"]}
            for row in analyses_data["words"] if 0 < row["occurrences"] < 5
        ],
        "words_without_selected_examples": [
            {"word_id": row["word_id"], "rank": row["rank"], "word": row["word"]}
            for row in analyses_data["words"] if row["occurrences"] > 0 and not row.get("example_ids")
        ],
        "multiword_token_forms": [words_by_id[word_id]["word"] for word_id in sorted(stats)],
        "multiword_token_occurrences": sum(item["occurrences"] for item in stats.values()),
    })
    metadata_data["generated_at"] = generated_at
    metadata_data["multiword_token_support"] = {
        "enabled": True,
        "forms": coverage_data["multiword_token_forms"],
        "occurrences": coverage_data["multiword_token_occurrences"],
    }
    labels_data.setdefault("notes", {})["multiword_tokens"] = (
        "صورت‌های چندواژه‌ای CoNLL-U با تحلیل دقیق اجزای نحوی نمایش داده می‌شوند؛ "
        "برای همین ممکن است UPOS واحدی برای کل صورت وجود نداشته باشد."
    )

    outputs = {
        analyses_path: analyses_data,
        examples_path: examples_data,
        coverage_path: coverage_data,
        metadata_path: metadata_data,
        labels_path: labels_data,
    }
    for path, payload in outputs.items():
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("ud-import-2.18"))
    parser.add_argument("--vocabulary", type=Path, default=Path("data/common-words.json"))
    parser.add_argument("--output", type=Path, default=Path("data/ud"))
    args = parser.parse_args()
    process(args.input, args.vocabulary, args.output)
    print("CoNLL-U multiword token enrichment complete.")


if __name__ == "__main__":
    main()
