#!/usr/bin/env python3
"""Keep generated_at stable when generated UD content is otherwise unchanged."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
UD_DIR = ROOT / "data" / "ud"
FILES = (
    "coverage-report.json",
    "examples.json",
    "metadata.json",
    "word-analyses.json",
    "word-summary.json",
)


def without_generated_at(payload: dict[str, Any]) -> dict[str, Any]:
    comparable = dict(payload)
    comparable.pop("generated_at", None)
    return comparable


def read_head_json(relative_path: Path) -> dict[str, Any] | None:
    result = subprocess.run(
        ["git", "show", f"HEAD:{relative_path.as_posix()}"],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def main() -> None:
    restored = 0
    for name in FILES:
        path = UD_DIR / name
        if not path.exists():
            continue

        relative_path = path.relative_to(ROOT)
        previous = read_head_json(relative_path)
        if previous is None:
            continue

        current = json.loads(path.read_text(encoding="utf-8"))
        previous_timestamp = previous.get("generated_at")
        if (
            previous_timestamp
            and without_generated_at(previous) == without_generated_at(current)
            and current.get("generated_at") != previous_timestamp
        ):
            current["generated_at"] = previous_timestamp
            path.write_text(
                json.dumps(current, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            restored += 1

    print(f"Stabilized generated_at in {restored} unchanged UD files.")


if __name__ == "__main__":
    main()
