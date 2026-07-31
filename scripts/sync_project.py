#!/usr/bin/env python3
"""Synchronize generated project metadata with VERSION and vocabulary data."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
VOCABULARY = json.loads((ROOT / "data/common-words.json").read_text(encoding="utf-8"))
WORD_COUNT = len(VOCABULARY["words"])


def to_persian_digits(value: int) -> str:
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def replace_marker_block(content: str, start: str, end: str, block: str) -> str:
    pattern = re.compile(
        rf"{re.escape(start)}.*?{re.escape(end)}",
        flags=re.DOTALL,
    )
    if pattern.search(content):
        return pattern.sub(block, content, count=1)

    first_line_end = content.find("\n")
    if first_line_end == -1:
        return f"{content}\n\n{block}\n"
    return f"{content[:first_line_end + 1]}\n{block}\n{content[first_line_end + 1:]}"


def sync_index() -> None:
    path = ROOT / "index.html"
    content = path.read_text(encoding="utf-8")

    version_meta = f'  <meta name="app-version" content="{VERSION}">'
    meta_pattern = re.compile(r'^\s*<meta name="app-version" content="[^"]+">\s*$', re.MULTILINE)
    if meta_pattern.search(content):
        content = meta_pattern.sub(version_meta, content, count=1)
    else:
        viewport_pattern = re.compile(r'(^\s*<meta name="viewport"[^>]+>\s*$)', re.MULTILINE)
        if not viewport_pattern.search(content):
            raise RuntimeError("The viewport metadata anchor was not found in index.html")
        content = viewport_pattern.sub(rf"\1\n{version_meta}", content, count=1)

    dictionary_pos_tag = f'  <script src="dictionary-pos.js?v={VERSION}" defer></script>'
    dictionary_pos_pattern = re.compile(
        r'^\s*<script src="dictionary-pos\.js(?:\?v=[^"]+)?" defer></script>\s*$',
        re.MULTILINE,
    )
    if dictionary_pos_pattern.search(content):
        content = dictionary_pos_pattern.sub(dictionary_pos_tag, content, count=1)
    else:
        app_script_pattern = re.compile(
            r'(^\s*<script src="app\.js(?:\?v=[^"]+)?" defer></script>\s*$)',
            re.MULTILINE,
        )
        if not app_script_pattern.search(content):
            raise RuntimeError("The app.js script anchor was not found in index.html")
        content = app_script_pattern.sub(rf"\1\n{dictionary_pos_tag}", content, count=1)

    asset_pattern = re.compile(
        r'(?P<prefix>(?:href|src)=")'
        r'(?P<path>(?!https?://|//|data:|#)[^"?]+\.(?:css|js))'
        r'(?:\?v=[^"]*)?'
        r'(?P<suffix>")'
    )
    content = asset_pattern.sub(
        lambda match: f'{match.group("prefix")}{match.group("path")}?v={VERSION}{match.group("suffix")}',
        content,
    )

    persian_count = to_persian_digits(WORD_COUNT)
    content = re.sub(
        r'<h1>[۰-۹0-9]+ واژه پرکاربرد فنلاندی</h1>',
        f'<h1>{persian_count} واژه پرکاربرد فنلاندی</h1>',
        content,
        count=1,
    )
    content = re.sub(
        r'(<div class="about-stat"><strong>)[۰-۹0-9]+(</strong><span>واژه پرتکرار</span></div>)',
        rf'\g<1>{persian_count}\g<2>',
        content,
        count=1,
    )

    if content.count("dictionary-pos.js") != 1:
        raise RuntimeError("dictionary-pos.js must be referenced exactly once")

    path.write_text(content, encoding="utf-8")


def sync_readmes() -> None:
    english_path = ROOT / "README.md"
    persian_path = ROOT / "README.fa.md"

    english_block = f"""<!-- PROJECT_STATUS_START -->
## Project status

- Version: `{VERSION}`
- Vocabulary entries: **{WORD_COUNT}**
- Required quality gate: `npm test`
- Production deploys run only after the complete test suite passes.

See [Versioning](docs/VERSIONING.md) and [AI contribution rules](AGENTS.md).
<!-- PROJECT_STATUS_END -->"""

    persian_block = f"""<!-- PROJECT_STATUS_START -->
## وضعیت پروژه

- نسخه: `{VERSION}`
- تعداد واژه‌ها: **{WORD_COUNT}**
- دروازه اجباری کیفیت: `npm test`
- انتشار نسخه زنده فقط پس از موفقیت کامل تست‌ها انجام می‌شود.

برای جزئیات، [نسخه‌گذاری](docs/VERSIONING.md) و [قواعد مشارکت هوش مصنوعی](AGENTS.md) را ببینید.
<!-- PROJECT_STATUS_END -->"""

    english = replace_marker_block(
        english_path.read_text(encoding="utf-8"),
        "<!-- PROJECT_STATUS_START -->",
        "<!-- PROJECT_STATUS_END -->",
        english_block,
    )
    persian = replace_marker_block(
        persian_path.read_text(encoding="utf-8"),
        "<!-- PROJECT_STATUS_START -->",
        "<!-- PROJECT_STATUS_END -->",
        persian_block,
    )
    english_path.write_text(english, encoding="utf-8")
    persian_path.write_text(persian, encoding="utf-8")


def sync_deploy_marker() -> None:
    marker = (
        "Finnish Learning deployment\n"
        f"Application version: {VERSION}\n"
        f"Vocabulary entries: {WORD_COUNT}\n"
    )
    (ROOT / "deploy-version.txt").write_text(marker, encoding="utf-8")


def main() -> None:
    sync_index()
    sync_readmes()
    sync_deploy_marker()
    print(f"Synchronized version {VERSION} with {WORD_COUNT} vocabulary entries.")


if __name__ == "__main__":
    main()
