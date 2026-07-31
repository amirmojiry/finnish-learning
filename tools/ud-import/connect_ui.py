#!/usr/bin/env python3
"""Connect the generated UD browser assets to index.html idempotently."""

from __future__ import annotations

import re
from pathlib import Path

INDEX_PATH = Path("index.html")
CSS_TAG = '  <link rel="stylesheet" href="css/ud-analysis.css?v=20260731-1">'
JS_TAG = '  <script src="ud-analysis.js?v=20260731-1" defer></script>'


def replace_or_insert_css(content: str) -> str:
    pattern = re.compile(
        r'^\s*<link rel="stylesheet" href="css/ud-analysis\.css\?v=[^"]+">\s*$',
        re.MULTILINE,
    )
    if pattern.search(content):
        return pattern.sub(CSS_TAG, content, count=1)

    anchor = re.compile(
        r'(^\s*<link rel="stylesheet" href="css/dictionary\.css\?v=[^"]+">\s*$)',
        re.MULTILINE,
    )
    if not anchor.search(content):
        raise RuntimeError("Dictionary stylesheet anchor was not found in index.html")
    return anchor.sub(rf'\1\n{CSS_TAG}', content, count=1)


def replace_or_insert_js(content: str) -> str:
    pattern = re.compile(
        r'^\s*<script src="ud-analysis\.js\?v=[^"]+" defer></script>\s*$',
        re.MULTILINE,
    )
    if pattern.search(content):
        return pattern.sub(JS_TAG, content, count=1)

    anchor = re.compile(
        r'(^\s*<script src="settings\.js\?v=[^"]+" defer></script>\s*$)',
        re.MULTILINE,
    )
    if not anchor.search(content):
        raise RuntimeError("Settings script anchor was not found in index.html")
    return anchor.sub(rf'\1\n{JS_TAG}', content, count=1)


def main() -> None:
    content = INDEX_PATH.read_text(encoding="utf-8")
    updated = replace_or_insert_css(content)
    updated = replace_or_insert_js(updated)

    if updated.count("css/ud-analysis.css") != 1:
        raise RuntimeError("UD stylesheet must be referenced exactly once")
    if updated.count("ud-analysis.js") != 1:
        raise RuntimeError("UD script must be referenced exactly once")

    INDEX_PATH.write_text(updated, encoding="utf-8")
    print("Connected UD analysis assets to index.html")


if __name__ == "__main__":
    main()
