#!/usr/bin/env python3
"""Extract Finnish Universal Dependencies data for the app vocabulary.

The script reads the temporary CoNLL-U imports and generates compact,
provenance-preserving JSON files under data/ud. It does not modify the app's
main vocabulary file or user interface.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
UD_RELEASE = "2.18"
MAX_EXAMPLES_PER_WORD = 5
MAX_CANDIDATES_PER_WORD = 30
MAX_CONTEXT_WORDS = 5

TREEBANKS = {
    "TDT": {
        "name": "Finnish-TDT",
        "priority": 40,
        "license": "CC BY-SA 4.0",
        "url": "https://universaldependencies.org/treebanks/fi_tdt/",
    },
    "FTB": {
        "name": "Finnish-FTB",
        "priority": 30,
        "license": "CC BY 4.0",
        "url": "https://universaldependencies.org/treebanks/fi_ftb/",
    },
    "PUD": {
        "name": "Finnish-PUD",
        "priority": 20,
        "license": "CC BY-SA 4.0",
        "url": "https://universaldependencies.org/treebanks/fi_pud/",
    },
    "OOD": {
        "name": "Finnish-OOD",
        "priority": 10,
        "license": "CC BY-SA 4.0",
        "url": "https://universaldependencies.org/treebanks/fi_ood/",
    },
}

UPOS_FA = {
    "ADJ": "صفت",
    "ADP": "حرف اضافه یا پس‌اضافه",
    "ADV": "قید",
    "AUX": "فعل کمکی",
    "CCONJ": "حرف ربط هم‌پایه",
    "DET": "تعیین‌گر",
    "INTJ": "حرف ندا",
    "NOUN": "اسم",
    "NUM": "عدد",
    "PART": "ذره",
    "PRON": "ضمیر",
    "PROPN": "اسم خاص",
    "PUNCT": "نشانه‌گذاری",
    "SCONJ": "حرف ربط وابسته‌ساز",
    "SYM": "نماد",
    "VERB": "فعل",
    "X": "سایر یا نامشخص",
}

FEATURE_FA = {
    "Abbr": "مخفف",
    "Case": "حالت دستوری",
    "Clitic": "واژه‌بست",
    "Connegative": "شکل همراه فعل منفی",
    "Degree": "درجه صفت یا قید",
    "Derivation": "اشتقاق",
    "Foreign": "واژه بیگانه",
    "InfForm": "نوع مصدر فنلاندی",
    "Mood": "وجه فعل",
    "Number": "شمار",
    "NumType": "نوع عدد",
    "PartForm": "نوع اسم مفعول یا وجه وصفی",
    "Person": "شخص",
    "Polarity": "قطبیت مثبت یا منفی",
    "Poss": "مالکیت",
    "PronType": "نوع ضمیر یا تعیین‌گر",
    "Reflex": "بازتابی",
    "Style": "سبک کاربرد",
    "Tense": "زمان فعل",
    "Typo": "دارای خطای نوشتاری",
    "VerbForm": "شکل فعل",
    "Voice": "وجه معلوم یا مجهول",
}

DEPREL_FA = {
    "acl": "بند وصفی وابسته به اسم",
    "advcl": "بند قیدی",
    "advmod": "وابسته قیدی",
    "amod": "وابسته وصفی",
    "appos": "بدل",
    "aux": "فعل کمکی",
    "case": "نشانگر حالت یا حرف اضافه",
    "cc": "حرف ربط هم‌پایه",
    "ccomp": "متمم بندی",
    "clf": "طبقه‌بند",
    "compound": "ترکیب واژگانی",
    "conj": "عضو هم‌پایه",
    "cop": "فعل ربطی",
    "csubj": "فاعل بندی",
    "dep": "رابطه وابستگی نامشخص",
    "det": "تعیین‌گر",
    "discourse": "عنصر گفتمانی",
    "dislocated": "عنصر جابه‌جا‌شده",
    "expl": "عنصر صوری",
    "fixed": "عبارت ثابت",
    "flat": "ساخت تخت مانند نام",
    "goeswith": "بخش‌های جداشده یک واژه",
    "iobj": "مفعول غیرمستقیم",
    "list": "عضو فهرست",
    "mark": "نشانگر بند وابسته",
    "nmod": "وابسته اسمی",
    "nsubj": "فاعل اسمی",
    "nummod": "وابسته عددی",
    "obj": "مفعول مستقیم",
    "obl": "وابسته اسمی غیرمرکزی",
    "orphan": "وابسته یتیم در حذف نحوی",
    "parataxis": "هم‌نشینی مستقل",
    "punct": "نشانه‌گذاری",
    "reparandum": "بخش اصلاح‌شده گفتار",
    "root": "ریشه جمله",
    "vocative": "خطاب",
    "xcomp": "متمم باز",
}

URL_RE = re.compile(r"(?:https?://|www\.|\S+@\S+)", re.IGNORECASE)
FILE_RE = re.compile(r"fi_(?P<treebank>[a-z]+)-ud-(?P<split>train|dev|test)\.conllu$", re.IGNORECASE)


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


def canonical_feats(feats: dict[str, list[str]]) -> str:
    if not feats:
        return "_"
    return "|".join(
        f"{name}={','.join(sorted(values))}"
        for name, values in sorted(feats.items())
    )


def infer_source(path: Path) -> tuple[str, str]:
    match = FILE_RE.search(path.name)
    if not match:
        raise ValueError(f"Unexpected CoNLL-U filename: {path.name}")
    treebank = match.group("treebank").upper()
    split = match.group("split").lower()
    if treebank not in TREEBANKS:
        raise ValueError(f"Unsupported Finnish treebank: {treebank}")
    return treebank, split


def make_fallback_text(tokens: list[dict[str, Any]]) -> str:
    pieces: list[str] = []
    for token in tokens:
        pieces.append(token["form"])
        misc = token.get("misc", "")
        if "SpaceAfter=No" not in misc:
            pieces.append(" ")
    return "".join(pieces).strip()


def parse_conllu(path: Path) -> Iterable[dict[str, Any]]:
    comments: dict[str, str] = {}
    tokens: list[dict[str, Any]] = []
    sentence_number = 0

    def flush() -> dict[str, Any] | None:
        nonlocal comments, tokens, sentence_number
        if not tokens:
            comments = {}
            return None
        sentence_number += 1
        sentence = {
            "sent_id": comments.get("sent_id") or f"line-{sentence_number}",
            "text": comments.get("text") or make_fallback_text(tokens),
            "comments": comments,
            "tokens": tokens,
        }
        comments = {}
        tokens = []
        return sentence

    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n\r")
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
            if "-" in token_id or "." in token_id:
                continue
            try:
                numeric_id = int(token_id)
            except ValueError:
                continue
            try:
                head = int(columns[6]) if columns[6] != "_" else 0
            except ValueError:
                head = 0

            tokens.append(
                {
                    "id": numeric_id,
                    "form": columns[1],
                    "lemma": columns[2] if columns[2] != "_" else columns[1],
                    "upos": columns[3] if columns[3] != "_" else "X",
                    "xpos": columns[4],
                    "feats": parse_feats(columns[5]),
                    "head": head,
                    "deprel": columns[7] if columns[7] != "_" else "dep",
                    "deps": columns[8],
                    "misc": columns[9],
                }
            )

    sentence = flush()
    if sentence:
        yield sentence


def load_targets(path: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    words = payload.get("words")
    if not isinstance(words, list) or not words:
        raise ValueError("data/common-words.json must contain a non-empty words array")

    targets: list[dict[str, Any]] = []
    by_form: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(words, start=1):
        if "word" not in item:
            raise ValueError(f"Vocabulary entry {index} is missing word")
        rank = int(item.get("rank", index))
        word = str(item["word"])
        word_id = str(item.get("word_id") or f"fi-{rank:04d}")
        target = {
            "word_id": word_id,
            "rank": rank,
            "frequency_rank": item.get("frequency_rank", rank),
            "word": word,
            "normalized": normalize(word),
        }
        if target["normalized"] in by_form:
            raise ValueError(f"Duplicate normalized word form: {word}")
        targets.append(target)
        by_form[target["normalized"]] = target

    if len({item["word_id"] for item in targets}) != len(targets):
        raise ValueError("Generated or supplied word_id values are not unique")
    return targets, by_form


def blank_stats() -> dict[str, Any]:
    return {
        "occurrences": 0,
        "treebanks": Counter(),
        "splits": Counter(),
        "upos": Counter(),
        "lemmas": Counter(),
        "analyses": Counter(),
        "feature_observed": Counter(),
        "feature_values": defaultdict(Counter),
        "dependent_relations": defaultdict(lambda: {"count": 0, "heads": Counter()}),
        "head_relations": defaultdict(lambda: {"count": 0, "dependents": Counter()}),
        "candidates": [],
    }


def percentage(count: int, total: int) -> float:
    return round((count / total * 100), 4) if total else 0.0


def counter_rows(counter: Counter, total: int, field: str) -> list[dict[str, Any]]:
    return [
        {field: key, "count": count, "percent": percentage(count, total)}
        for key, count in counter.most_common()
    ]


def context_rows(counter: Counter) -> list[dict[str, Any]]:
    rows = []
    for (form, lemma, upos), count in counter.most_common(MAX_CONTEXT_WORDS):
        rows.append(
            {
                "form": form,
                "lemma": lemma,
                "upos": upos,
                "count": count,
            }
        )
    return rows


def score_sentence(
    treebank: str,
    text: str,
    tokens: list[dict[str, Any]],
    target_count: int,
) -> int:
    token_count = len(tokens)
    score = TREEBANKS[treebank]["priority"]

    if 5 <= token_count <= 18:
        score += 24
    elif 3 <= token_count <= 25:
        score += 12
    else:
        score -= min(abs(token_count - 14), 25)

    if target_count == 1:
        score += 14
    else:
        score -= (target_count - 1) * 4

    if 25 <= len(text) <= 180:
        score += 8
    if URL_RE.search(text):
        score -= 100

    proper_nouns = sum(token["upos"] == "PROPN" for token in tokens)
    punctuation = sum(token["upos"] == "PUNCT" for token in tokens)
    unknown = sum(token["upos"] == "X" for token in tokens)
    typo = sum("Typo" in token["feats"] for token in tokens)
    foreign = sum("Foreign" in token["feats"] for token in tokens)

    if token_count:
        if proper_nouns / token_count > 0.35:
            score -= 18
        if punctuation / token_count > 0.35:
            score -= 12
    score -= unknown * 3
    score -= typo * 12
    score -= foreign * 8

    if text and text[0].isupper():
        score += 2
    if text.endswith((".", "?", "!")):
        score += 2
    return score


def add_candidate(stats: dict[str, Any], candidate: dict[str, Any]) -> None:
    stats["candidates"].append(candidate)
    stats["candidates"].sort(
        key=lambda item: (
            item["score"],
            -item["token_count"],
            item["sentence_id"],
        ),
        reverse=True,
    )
    del stats["candidates"][MAX_CANDIDATES_PER_WORD:]


def compact_tokens(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": token["id"],
            "form": token["form"],
            "lemma": token["lemma"],
            "upos": token["upos"],
            "feats": token["feats"],
            "head": token["head"],
            "deprel": token["deprel"],
        }
        for token in tokens
    ]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def process(
    input_dir: Path,
    vocabulary_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    targets, targets_by_form = load_targets(vocabulary_path)
    stats_by_id = {target["word_id"]: blank_stats() for target in targets}
    input_files = sorted(input_dir.glob("*.conllu"))
    if not input_files:
        raise ValueError(f"No .conllu files found in {input_dir}")

    file_metadata: list[dict[str, Any]] = []
    treebank_summary: dict[str, dict[str, int]] = defaultdict(
        lambda: {"files": 0, "sentences": 0, "tokens": 0, "matched_tokens": 0}
    )

    for path in input_files:
        treebank, split = infer_source(path)
        file_sentences = 0
        file_tokens = 0
        file_matches = 0

        for sentence in parse_conllu(path):
            file_sentences += 1
            tokens = sentence["tokens"]
            file_tokens += len(tokens)
            by_id = {token["id"]: token for token in tokens}
            children: dict[int, list[dict[str, Any]]] = defaultdict(list)
            for token in tokens:
                children[token["head"]].append(token)

            matches_by_word: dict[str, list[dict[str, Any]]] = defaultdict(list)
            all_sentence_matches: list[dict[str, Any]] = []
            for token in tokens:
                target = targets_by_form.get(normalize(token["form"]))
                if not target:
                    continue
                file_matches += 1
                matches_by_word[target["word_id"]].append(token)
                all_sentence_matches.append(
                    {
                        "word_id": target["word_id"],
                        "rank": target["rank"],
                        "word": target["word"],
                        "token_id": token["id"],
                    }
                )

                stats = stats_by_id[target["word_id"]]
                stats["occurrences"] += 1
                stats["treebanks"][treebank] += 1
                stats["splits"][split] += 1
                stats["upos"][token["upos"]] += 1
                stats["lemmas"][token["lemma"]] += 1

                feats_string = canonical_feats(token["feats"])
                stats["analyses"][(token["lemma"], token["upos"], feats_string)] += 1
                for feature_name, values in token["feats"].items():
                    stats["feature_observed"][feature_name] += 1
                    for value in values:
                        stats["feature_values"][feature_name][value] += 1

                relation = token["deprel"]
                stats["dependent_relations"][relation]["count"] += 1
                if token["head"] == 0:
                    head_context = ("ROOT", "ROOT", "ROOT")
                else:
                    head = by_id.get(token["head"])
                    head_context = (
                        head["form"] if head else "_",
                        head["lemma"] if head else "_",
                        head["upos"] if head else "X",
                    )
                stats["dependent_relations"][relation]["heads"][head_context] += 1

                for child in children.get(token["id"], []):
                    child_relation = child["deprel"]
                    stats["head_relations"][child_relation]["count"] += 1
                    child_context = (child["form"], child["lemma"], child["upos"])
                    stats["head_relations"][child_relation]["dependents"][child_context] += 1

            if not matches_by_word:
                continue

            sentence_id = f"{treebank.lower()}:{split}:{sentence['sent_id']}"
            text = sentence["text"].strip()
            compact = compact_tokens(tokens)
            for word_id, matching_tokens in matches_by_word.items():
                candidate = {
                    "sentence_id": sentence_id,
                    "sent_id": sentence["sent_id"],
                    "treebank": treebank,
                    "split": split,
                    "source_file": path.name,
                    "text": text,
                    "token_count": len(tokens),
                    "target_token_ids": [token["id"] for token in matching_tokens],
                    "matched_targets": all_sentence_matches,
                    "tokens": compact,
                    "score": score_sentence(treebank, text, tokens, len(matching_tokens)),
                }
                add_candidate(stats_by_id[word_id], candidate)

        treebank_summary[treebank]["files"] += 1
        treebank_summary[treebank]["sentences"] += file_sentences
        treebank_summary[treebank]["tokens"] += file_tokens
        treebank_summary[treebank]["matched_tokens"] += file_matches
        file_metadata.append(
            {
                "file": path.name,
                "treebank": treebank,
                "split": split,
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
                "sentences": file_sentences,
                "tokens": file_tokens,
                "matched_tokens": file_matches,
            }
        )

    examples_by_id: dict[str, dict[str, Any]] = {}
    selected_example_ids: dict[str, list[str]] = {}
    for target in targets:
        stats = stats_by_id[target["word_id"]]
        selected: list[str] = []
        seen_texts: set[str] = set()
        for candidate in stats["candidates"]:
            text_key = normalize(candidate["text"])
            if not text_key or text_key in seen_texts:
                continue
            seen_texts.add(text_key)
            sentence_id = candidate["sentence_id"]
            selected.append(sentence_id)
            if sentence_id not in examples_by_id:
                examples_by_id[sentence_id] = {
                    key: value
                    for key, value in candidate.items()
                    if key != "score"
                }
            if len(selected) >= MAX_EXAMPLES_PER_WORD:
                break
        selected_example_ids[target["word_id"]] = selected

    word_rows: list[dict[str, Any]] = []
    for target in targets:
        stats = stats_by_id[target["word_id"]]
        occurrences = stats["occurrences"]
        analysis_rows: list[dict[str, Any]] = []
        for (lemma, upos, feats_string), count in stats["analyses"].most_common():
            analysis_rows.append(
                {
                    "lemma": lemma,
                    "upos": upos,
                    "feats": parse_feats(feats_string),
                    "count": count,
                    "percent": percentage(count, occurrences),
                }
            )

        feature_rows: list[dict[str, Any]] = []
        for feature_name in sorted(stats["feature_values"]):
            observed_count = stats["feature_observed"][feature_name]
            feature_rows.append(
                {
                    "name": feature_name,
                    "observed_count": observed_count,
                    "coverage_percent": percentage(observed_count, occurrences),
                    "values": counter_rows(
                        stats["feature_values"][feature_name],
                        observed_count,
                        "value",
                    ),
                }
            )

        dependent_rows: list[dict[str, Any]] = []
        for relation, data in sorted(
            stats["dependent_relations"].items(),
            key=lambda item: (-item[1]["count"], item[0]),
        ):
            dependent_rows.append(
                {
                    "relation": relation,
                    "count": data["count"],
                    "percent": percentage(data["count"], occurrences),
                    "common_heads": context_rows(data["heads"]),
                }
            )

        head_link_total = sum(data["count"] for data in stats["head_relations"].values())
        head_rows: list[dict[str, Any]] = []
        for relation, data in sorted(
            stats["head_relations"].items(),
            key=lambda item: (-item[1]["count"], item[0]),
        ):
            head_rows.append(
                {
                    "relation": relation,
                    "count": data["count"],
                    "percent": percentage(data["count"], head_link_total),
                    "common_dependents": context_rows(data["dependents"]),
                }
            )

        dominant_analysis = analysis_rows[0] if analysis_rows else None
        dominant_share = dominant_analysis["percent"] if dominant_analysis else 0.0
        upos_rows = counter_rows(stats["upos"], occurrences, "tag")
        meaningful_upos = [row for row in upos_rows if row["count"] >= 2 and row["percent"] >= 5]
        confidence = "high" if dominant_share >= 90 else "medium" if dominant_share >= 70 else "low"

        word_rows.append(
            {
                "word_id": target["word_id"],
                "rank": target["rank"],
                "frequency_rank": target["frequency_rank"],
                "word": target["word"],
                "occurrences": occurrences,
                "treebanks": dict(stats["treebanks"].most_common()),
                "splits": dict(stats["splits"].most_common()),
                "dominant_analysis": dominant_analysis,
                "analysis_confidence": confidence,
                "dominant_analysis_percent": dominant_share,
                "ambiguous_upos": len(meaningful_upos) > 1,
                "upos": upos_rows,
                "lemmas": counter_rows(stats["lemmas"], occurrences, "lemma"),
                "analyses": analysis_rows,
                "features": feature_rows,
                "dependency_as_dependent": dependent_rows,
                "dependency_as_head": {
                    "link_count": head_link_total,
                    "relations": head_rows,
                },
                "example_ids": selected_example_ids[target["word_id"]],
            }
        )

    found = [row for row in word_rows if row["occurrences"] > 0]
    missing = [
        {"word_id": row["word_id"], "rank": row["rank"], "word": row["word"]}
        for row in word_rows
        if row["occurrences"] == 0
    ]
    low_evidence = [
        {
            "word_id": row["word_id"],
            "rank": row["rank"],
            "word": row["word"],
            "occurrences": row["occurrences"],
        }
        for row in word_rows
        if 0 < row["occurrences"] < 5
    ]
    no_examples = [
        {"word_id": row["word_id"], "rank": row["rank"], "word": row["word"]}
        for row in word_rows
        if row["occurrences"] > 0 and not row["example_ids"]
    ]

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    metadata = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "ud_release": UD_RELEASE,
        "input_directory": str(input_dir),
        "vocabulary_file": str(vocabulary_path),
        "treebanks": {
            key: {
                **TREEBANKS[key],
                **treebank_summary.get(key, {"files": 0, "sentences": 0, "tokens": 0, "matched_tokens": 0}),
            }
            for key in TREEBANKS
        },
        "input_files": file_metadata,
    }
    analyses_payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "ud_release": UD_RELEASE,
        "words": word_rows,
    }
    examples_payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "ud_release": UD_RELEASE,
        "sentences": sorted(examples_by_id.values(), key=lambda item: item["sentence_id"]),
    }
    labels_payload = {
        "schema_version": SCHEMA_VERSION,
        "language": "fa",
        "upos": UPOS_FA,
        "features": FEATURE_FA,
        "dependency_relations": DEPREL_FA,
        "notes": {
            "dependency_subtypes": "برای رابطه‌هایی مانند nmod:poss، ترجمه رابطه پایه پیش از دونقطه مبنا است و زیرنوع به‌صورت فنی حفظ می‌شود.",
            "features": "مقادیر ویژگی‌ها مطابق استاندارد UD و بدون ترجمه ذخیره می‌شوند تا معنای فنی آن‌ها از بین نرود.",
        },
    }
    coverage_payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "target_word_count": len(targets),
        "found_word_count": len(found),
        "missing_word_count": len(missing),
        "coverage_percent": percentage(len(found), len(targets)),
        "total_matched_occurrences": sum(row["occurrences"] for row in word_rows),
        "words_with_multiple_upos": sum(row["ambiguous_upos"] for row in word_rows),
        "words_with_multiple_lemmas": sum(len(row["lemmas"]) > 1 for row in word_rows),
        "words_with_examples": sum(bool(row["example_ids"]) for row in word_rows),
        "selected_sentence_count": len(examples_by_id),
        "treebanks": treebank_summary,
        "missing_words": missing,
        "low_evidence_words": low_evidence,
        "words_without_selected_examples": no_examples,
    }

    if len(word_rows) != len(targets):
        raise RuntimeError("Output word count does not match target word count")
    if not found:
        raise RuntimeError("No vocabulary forms were found in the uploaded treebanks")
    example_ids = set(examples_by_id)
    for row in word_rows:
        unknown = set(row["example_ids"]) - example_ids
        if unknown:
            raise RuntimeError(f"Unknown example references for {row['word']}: {sorted(unknown)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "word-analyses.json": analyses_payload,
        "examples.json": examples_payload,
        "labels-fa.json": labels_payload,
        "metadata.json": metadata,
        "coverage-report.json": coverage_payload,
    }
    for filename, payload in outputs.items():
        destination = output_dir / filename
        destination.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        json.loads(destination.read_text(encoding="utf-8"))

    return coverage_payload


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("ud-import-2.18"))
    parser.add_argument("--vocabulary", type=Path, default=Path("data/common-words.json"))
    parser.add_argument("--output", type=Path, default=Path("data/ud"))
    args = parser.parse_args()

    coverage = process(args.input, args.vocabulary, args.output)
    print(
        "UD extraction complete: "
        f"{coverage['found_word_count']}/{coverage['target_word_count']} forms found, "
        f"{coverage['selected_sentence_count']} selected sentences, "
        f"{coverage['total_matched_occurrences']} matched tokens."
    )


if __name__ == "__main__":
    main()
