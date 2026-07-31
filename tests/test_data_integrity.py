import json
import re
import unicodedata
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAROLE_LINE = re.compile(r"^(\d+)\s+(\d+)\s+(.+?)\s+\(([\d.]+)\s+%\)$")


def load_json(relative_path: str):
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def normalize_word(value: str) -> str:
    return unicodedata.normalize("NFC", value).casefold().strip()


def parse_parole_rows(relative_path: str, limit: int):
    source = (ROOT / relative_path).read_bytes().decode("latin-1")
    lines = [line.strip() for line in source.splitlines() if line.strip()][:limit]
    if len(lines) != limit:
        raise AssertionError(f"Expected {limit} Parole rows, found {len(lines)}")

    rows = []
    for index, line in enumerate(lines, start=1):
        match = PAROLE_LINE.fullmatch(line)
        if not match:
            raise AssertionError(f"Cannot parse Parole row {index}: {line}")
        rows.append(
            {
                "frequency_rank": int(match.group(1)),
                "frequency_count": int(match.group(2)),
                "word": match.group(3),
                "frequency_percent": float(match.group(4)),
            }
        )
    return rows


def example_contains_word(sentence: str, word: str) -> bool:
    pattern = re.compile(
        rf"(^|[^\wÅÄÖåäö]){re.escape(word)}(?=$|[^\wÅÄÖåäö])",
        flags=re.IGNORECASE | re.UNICODE,
    )
    return bool(pattern.search(sentence))


class VocabularyIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulary = load_json("data/common-words.json")
        cls.words = cls.vocabulary["words"]
        cls.source_rows = parse_parole_rows(
            cls.vocabulary["source"]["source_file"],
            len(cls.words),
        )

    def test_top_level_metadata_and_nonempty_vocabulary(self):
        self.assertGreater(len(self.words), 0)
        self.assertTrue(str(self.vocabulary.get("title_fa", "")).strip())
        self.assertTrue(str(self.vocabulary.get("description_fa", "")).strip())
        self.assertTrue(str(self.vocabulary.get("source", {}).get("name", "")).strip())
        self.assertEqual(
            self.vocabulary["source"]["source_file"],
            "data/parole_frek_3.txt",
        )

    def test_positions_and_display_ranks_are_unique_and_sequential(self):
        expected = list(range(1, len(self.words) + 1))
        self.assertEqual([word["position"] for word in self.words], expected)
        self.assertEqual([word["rank"] for word in self.words], expected)

    def test_source_ranks_are_positive_and_nondecreasing(self):
        ranks = [word["frequency_rank"] for word in self.words]
        self.assertTrue(all(isinstance(rank, int) and rank > 0 for rank in ranks))
        self.assertEqual(ranks, sorted(ranks))

    def test_words_are_unique_after_unicode_normalization(self):
        normalized = [normalize_word(word["word"]) for word in self.words]
        self.assertTrue(all(normalized))
        self.assertEqual(len(normalized), len(set(normalized)))

    def test_every_word_satisfies_the_learning_content_contract(self):
        required_text_fields = (
            "word",
            "translation_fa",
            "part_of_speech",
            "part_of_speech_fa",
            "lemma",
            "example_fi",
            "example_fa",
            "example_2_fi",
            "example_2_fa",
        )

        for word in self.words:
            with self.subTest(word=word.get("word")):
                for field in required_text_fields:
                    self.assertIsInstance(word.get(field), str)
                    self.assertTrue(word[field].strip(), f"Missing {field}")

                self.assertIsInstance(word["frequency_count"], int)
                self.assertGreater(word["frequency_count"], 0)
                self.assertIsInstance(word["frequency_percent"], (int, float))
                self.assertGreater(word["frequency_percent"], 0)

    def test_frequency_fields_match_the_original_parole_file_exactly(self):
        for position, (word, source_row) in enumerate(
            zip(self.words, self.source_rows, strict=True),
            start=1,
        ):
            with self.subTest(position=position, word=word["word"]):
                self.assertEqual(word["position"], position)
                self.assertEqual(word["rank"], position)
                self.assertEqual(word["frequency_rank"], source_row["frequency_rank"])
                self.assertEqual(word["frequency_count"], source_row["frequency_count"])
                self.assertEqual(normalize_word(word["word"]), normalize_word(source_row["word"]))
                self.assertEqual(word["frequency_percent"], source_row["frequency_percent"])

    def test_newer_learning_examples_include_the_target_form(self):
        for word in self.words:
            if word["position"] <= 100:
                continue
            with self.subTest(word=word["word"]):
                self.assertTrue(example_contains_word(word["example_fi"], word["word"]))
                self.assertTrue(example_contains_word(word["example_2_fi"], word["word"]))


class UdSummaryIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulary = load_json("data/common-words.json")
        cls.summary = load_json("data/ud/word-summary.json")
        cls.labels = load_json("data/ud/labels-fa.json")
        cls.vocabulary_forms = {
            normalize_word(word["word"]): word for word in cls.vocabulary["words"]
        }
        cls.summary_forms = {
            normalize_word(row["word"]): row for row in cls.summary["words"]
        }

    def test_summary_coverage_matches_the_current_vocabulary(self):
        self.assertEqual(self.summary["schema_version"], 2)
        self.assertEqual(self.summary["word_count"], len(self.vocabulary_forms))
        self.assertEqual(set(self.summary_forms), set(self.vocabulary_forms))

    def test_upos_rows_are_ordered_by_dominance_and_have_labels(self):
        upos_labels = self.labels.get("upos", {})
        for form, row in self.summary_forms.items():
            with self.subTest(word=form):
                upos = row.get("upos", [])
                counts = [item["count"] for item in upos]
                self.assertEqual(counts, sorted(counts, reverse=True))
                for item in upos:
                    self.assertGreater(item["count"], 0)
                    self.assertGreater(item["percent"], 0)
                    self.assertIn(item["tag"], upos_labels)

    def test_feature_specific_examples_are_real_sentences(self):
        for form, row in self.summary_forms.items():
            for feature in row.get("features", []):
                for value in feature.get("values", []):
                    example = value.get("example")
                    if example is None:
                        continue
                    with self.subTest(
                        word=form,
                        feature=feature.get("name"),
                        value=value.get("value"),
                    ):
                        self.assertTrue(str(example.get("text", "")).strip())
                        self.assertTrue(str(example.get("target_form", "")).strip())
                        self.assertTrue(str(example.get("treebank", "")).strip())

    def test_ovat_regression_fixture_is_auxiliary_and_indicative(self):
        if "ovat" not in self.summary_forms:
            self.skipTest("The current vocabulary does not include ovat.")

        ovat = self.summary_forms["ovat"]
        self.assertTrue(ovat.get("upos"))
        self.assertEqual(ovat["upos"][0]["tag"], "AUX")

        mood = next(
            feature for feature in ovat.get("features", []) if feature.get("name") == "Mood"
        )
        indicative = next(
            value for value in mood.get("values", []) if value.get("value") == "Ind"
        )
        self.assertTrue(indicative.get("example", {}).get("text"))


if __name__ == "__main__":
    unittest.main()
