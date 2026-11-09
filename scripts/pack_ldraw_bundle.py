#!/usr/bin/env python3
"""Packs all root and transitive LDraw .dat files used by Little Frog into public/assets/ldraw-bundle.json.

Strips non-essential comments/metadata (retaining only the first human-readable description comment
line `0 <Desc>` for part tooltips and geometry lines 1..4 with normalized forward slashes).
"""
import json
import re
import urllib.parse
from pathlib import Path
from typing import Dict, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CORE_SET_DIR = PROJECT_ROOT.parent
PARTS_DIR = CORE_SET_DIR / "parts"
LDRAW_DIR = CORE_SET_DIR / "ldraw"
TREE_JS_PATH = PROJECT_ROOT / "public" / "src" / "assembly-tree.js"
OUTPUT_BUNDLE_PATH = PROJECT_ROOT / "public" / "assets" / "ldraw-bundle.json"

SEARCH_DIRS = [
    PARTS_DIR,
    LDRAW_DIR,
    LDRAW_DIR / "parts",
    LDRAW_DIR / "p",
    LDRAW_DIR / "models",
]


def resolve_ldraw_path(rel_path: str) -> Optional[Path]:
    """Resolve a relative LDraw path against known search directories."""
    clean = urllib.parse.unquote(rel_path).replace("\\", "/").lstrip("/")
    if clean.startswith("ldraw-res/"):
        clean = clean[len("ldraw-res/"):]

    candidates = [clean, clean.lower()]
    for prefix in ("parts/", "p/"):
        if clean.lower().startswith(prefix):
            stripped = clean[len(prefix):]
            candidates.extend([stripped, stripped.lower()])

    for directory in SEARCH_DIRS:
        if not directory.exists():
            continue
        resolved_dir = directory.resolve()
        for cand in candidates:
            target = (directory / cand).resolve()
            if target.is_file() and target.is_relative_to(resolved_dir):
                return target
    return None


def extract_title_comment(lines: list[str], fallback: str) -> str:
    """Extract the first human-readable LDraw description comment line."""
    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if line.startswith("0 "):
            comment = re.sub(r"^~+", "", line[2:].strip()).strip()
            if (
                comment
                and not comment.startswith("Name:")
                and not comment.startswith("Author:")
                and not comment.startswith("!")
                and not comment.startswith("BFC")
            ):
                return re.sub(r"\s+", " ", comment)
    return fallback


def compact_ldraw_text(raw_text: str, part_key: str) -> tuple[str, list[str]]:
    """Return compacted LDraw content (1 title line + lines 1..4) and list of referenced subfiles."""
    raw_lines = raw_text.splitlines()
    title = extract_title_comment(raw_lines, part_key)
    out_lines = [f"0 {title}"]
    subfiles: list[str] = []

    for raw in raw_lines:
        stripped = raw.strip()
        if not stripped:
            continue
        first_char = stripped[0]
        if first_char not in ("1", "2", "3", "4"):
            continue
        if stripped.startswith("1 "):
            parts = stripped.split(None, 14)
            if len(parts) == 15:
                parts[14] = parts[14].replace("\\", "/")
                subfiles.append(parts[14])
                out_lines.append(" ".join(parts))
        else:
            out_lines.append(" ".join(stripped.split()))

    return "\n".join(out_lines) + "\n", subfiles


def build_bundle() -> Dict[str, str]:
    """Traverse all root parts from assembly-tree.js and collect compacted transitive closure."""
    tree_content = TREE_JS_PATH.read_text(encoding="utf-8")
    root_parts = sorted(set(re.findall(r'"part":\s*"([^"]+)"', tree_content)))
    bundle: Dict[str, str] = {}
    queue = list(root_parts)

    while queue:
        current = queue.pop(0)
        key = current.replace("\\", "/").lower()
        if key in bundle:
            continue
        resolved = resolve_ldraw_path(key)
        if resolved is None:
            raise FileNotFoundError(f"Could not resolve LDraw file: {current} (key={key})")
        raw_text = resolved.read_text(encoding="utf-8", errors="replace")
        compacted, children = compact_ldraw_text(raw_text, key)
        bundle[key] = compacted
        for child in children:
            child_key = child.replace("\\", "/").lower()
            if child_key not in bundle:
                queue.append(child_key)

    return dict(sorted(bundle.items()))


def main() -> None:
    """Build and write the compacted LDraw bundle to the target assets path."""
    bundle = build_bundle()
    OUTPUT_BUNDLE_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BUNDLE_PATH.write_text(
        json.dumps(bundle, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    size_kb = OUTPUT_BUNDLE_PATH.stat().st_size / 1024.0
    print(f"Packed {len(bundle)} LDraw files into {OUTPUT_BUNDLE_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
