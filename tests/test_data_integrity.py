import json
import math
import unicodedata
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_json(relative_path: str):
    return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))


def normalize_word(value: str) -> str:
    return unicodedata.normalize("NFC", value).casefold().strip()


class VocabularyIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.vocabulary = load_json("data/common-words.json")
        cls.words = cls.vocabulary["words"]

    def test_top_level_count_matches_entries(self):
        self.assertGreater(len(self.words), 0)
        self.assertEqual(self.vocabulary["count"], len(self.words))
        self.assertGreater(self.vocabulary["token_total"], 0)

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

                self.assertIsInstance(word["examples"], list)
                self.assertEqual(len(word["examples"]), 2)
                for example in word["examples"]:
                    self.assertTrue(str(example.get("fi", "")).strip())
                    self.assertTrue(str(example.get("fa", "")).strip())

    def test_frequency_percentage_matches_original_count_arithmetic(self):
        token_total = self.vocabulary["token_total"]
        for word in self.words:
            with self.subTest(word=word["word"]):
                expected = word["frequency_count"] / token_total * 100
                self.assertTrue(
                    math.isclose(
                        word["frequency_percent"],
                        expected,
                        rel_tol=1e-6,
                        abs_tol=1e-6,
                    ),
                    f"Frequency percentage mismatch for {word['word']}",
                )


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
                    with self.subTest(word=form, feature=feature.get("name"), value=value.get("value")):
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
