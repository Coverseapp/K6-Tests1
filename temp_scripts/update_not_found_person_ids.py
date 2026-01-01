#!/usr/bin/env python3

import argparse
import re
import sys
from pathlib import Path

PATTERN = re.compile(r"NOTFOUND_PERSON_ID:(\d+)")


def read_existing_ids(path: Path) -> set[int]:
    if not path.exists():
        return set()
    ids: set[int] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            ids.add(int(line))
        except ValueError:
            # ignore junk
            pass
    return ids


def extract_ids(text: str) -> set[int]:
    return {int(m.group(1)) for m in PATTERN.finditer(text)}


def main() -> int:
    p = argparse.ArgumentParser(
        description=(
            "Extract NOTFOUND_PERSON_ID:<id> lines from k6 output and merge into datasets/not_found_person_ids.txt"
        )
    )
    p.add_argument(
        "--input",
        "-i",
        help="Path to a k6 stdout/stderr log file. If omitted, reads from stdin.",
        default=None,
    )
    p.add_argument(
        "--output",
        "-o",
        help="Output file to write/merge IDs into.",
        default="datasets/not_found_person_ids.txt",
    )
    args = p.parse_args()

    output_path = Path(args.output)
    existing = read_existing_ids(output_path)

    if args.input:
        text = Path(args.input).read_text(encoding="utf-8", errors="replace")
    else:
        text = sys.stdin.read()

    found = extract_ids(text)
    merged = sorted(existing | found)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(map(str, merged)) + ("\n" if merged else ""), encoding="utf-8")

    print(f"Merged {len(found)} new IDs (total {len(merged)}) -> {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
