#!/usr/bin/env python3
"""Build a compact, browser-friendly summary of Finnish UD word analyses."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 2
MAX_LEMMAS = 8
MAX_ANALYSES = 6
MAX_DEPENDENCY_RELATIONS = 8
MAX_CONTEXT_ITEMS = 3
MAX_FEATURE_VALUES = 12
MAX_UI_EXAMPLES = 3


def compact_context(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    return [
        {
            "form": row.get("form", ""),
            "lemma": row.get("lemma", ""),
            "upos": row.get("upos", "X"),
            "count": int(row.get("count", 0)),
        }
        for row in (rows or [])[:MAX_CONTEXT_ITEMS]
    ]


def compact_example(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not row or not row.get("text"):
        return None
    return {
        "sentence_id": row.get("sentence_id", ""),
        "text": row.get("text", ""),
        "treebank": row.get("treebank", ""),
        "split": row.get("split", ""),
        "target_form": row.get("target_form", ""),
        "target_lemma": row.get("target_lemma", ""),
        "target_upos": row.get("target_upos", ""),
    }


def compact_analysis(row: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {
        "kind": row.get("kind", "token"),
        "lemma": row.get("lemma", ""),
        "count": int(row.get("count", 0)),
        "percent": float(row.get("percent", 0)),
    }
    if row.get("upos"):
        result["upos"] = row["upos"]
    if row.get("feats"):
        result["feats"] = row["feats"]
    if row.get("components"):
        result["components"] = [
            {
                "form": component.get("form", ""),
                "lemma": component.get("lemma", ""),
                "upos": component.get("upos", "X"),
                "feats": component.get("feats", {}),
                "deprel": component.get("deprel", "dep"),
                "head_scope": component.get("head_scope", ""),
            }
            for component in row["components"]
        ]
    return result


def compact_word(row: dict[str, Any]) -> dict[str, Any]:
    dependent = [
        {
            "relation": item.get("relation", "dep"),
            "count": int(item.get("count", 0)),
            "percent": float(item.get("percent", 0)),
            "common_heads": compact_context(item.get("common_heads")),
        }
        for item in row.get("dependency_as_dependent", [])[:MAX_DEPENDENCY_RELATIONS]
    ]

    head_payload = row.get("dependency_as_head") or {}
    as_head = {
        "link_count": int(head_payload.get("link_count", 0)),
        "relations": [
            {
                "relation": item.get("relation", "dep"),
                "count": int(item.get("count", 0)),
                "percent": float(item.get("percent", 0)),
                "common_dependents": compact_context(item.get("common_dependents")),
            }
            for item in head_payload.get("relations", [])[:MAX_DEPENDENCY_RELATIONS]
        ],
    }

    feature_examples = row.get("feature_examples") or {}
    features = []
    for feature in row.get("features", []):
        feature_name = feature.get("name", "")
        value_examples = feature_examples.get(feature_name, {})
        values = []
        for value in feature.get("values", [])[:MAX_FEATURE_VALUES]:
            value_name = value.get("value", "")
            compacted_value = {
                "value": value_name,
                "count": int(value.get("count", 0)),
                "percent": float(value.get("percent", 0)),
            }
            example = compact_example(value_examples.get(value_name))
            if example:
                compacted_value["example"] = example
            values.append(compacted_value)
        features.append(
            {
                "name": feature_name,
                "observed_count": int(feature.get("observed_count", 0)),
                "coverage_percent": float(feature.get("coverage_percent", 0)),
                "values": values,
            }
        )

    result: dict[str, Any] = {
        "word_id": row.get("word_id"),
        "rank": int(row.get("rank", 0)),
        "word": row.get("word", ""),
        "occurrences": int(row.get("occurrences", 0)),
        "treebanks": row.get("treebanks", {}),
        "surface_kinds": row.get(
            "surface_kinds",
            {"token": int(row.get("occurrences", 0)), "multiword_token": 0},
        ),
        "upos_observed_occurrences": int(
            row.get("upos_observed_occurrences", row.get("occurrences", 0))
        ),
        "analysis_confidence": row.get("analysis_confidence", "low"),
        "dominant_analysis_percent": float(row.get("dominant_analysis_percent", 0)),
        "ambiguous_upos": bool(row.get("ambiguous_upos", False)),
        "upos": row.get("upos", []),
        "lemmas": row.get("lemmas", [])[:MAX_LEMMAS],
        "features": features,
        "dependency_as_dependent": dependent,
        "dependency_as_head": as_head,
        "analyses": [
            compact_analysis(item) for item in row.get("analyses", [])[:MAX_ANALYSES]
        ],
        "examples": [
            example
            for item in row.get("ui_examples", [])[:MAX_UI_EXAMPLES]
            if (example := compact_example(item))
        ],
    }
    dominant = row.get("dominant_analysis")
    if dominant:
        result["dominant_analysis"] = compact_analysis(dominant)
    return result


def build(input_path: Path, output_path: Path) -> None:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    words = payload.get("words")
    if not isinstance(words, list) or not words:
        raise ValueError("word-analyses.json must contain a non-empty words array")

    compact_words = [compact_word(row) for row in words]
    if len({row["word"] for row in compact_words}) != len(compact_words):
        raise ValueError("The compact UD summary contains duplicate word forms")

    output = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": payload.get("generated_at"),
        "ud_release": payload.get("ud_release", "2.18"),
        "word_count": len(compact_words),
        "words": compact_words,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/ud/word-analyses.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/ud/word-summary.json"),
    )
    args = parser.parse_args()
    build(args.input, args.output)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
