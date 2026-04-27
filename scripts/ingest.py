#!/usr/bin/env python3
"""
Bobium Brawlers — Image Ingest Script
Reads creatures_input.csv, downloads + resizes each image to 400×400 WebP,
outputs public/creatures/images/{uuid}.webp and src/data/bobium/creatures.json.
Safe to re-run: already-downloaded images are skipped.
Failures are logged to ingest_errors.log.

Usage:
  pip install requests Pillow
  python3 scripts/ingest.py
  python3 scripts/ingest.py --csv path/to/other.csv --all-statuses
"""

import argparse
import csv
import json
import logging
import re
import sys
from io import BytesIO
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' not installed. Run: pip install requests Pillow")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Error: 'Pillow' not installed. Run: pip install requests Pillow")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
DEFAULT_CSV = Path("creatures_input.csv")
IMAGE_DIR   = Path("public/creatures/images")
OUTPUT_JSON = Path("src/data/bobium/creatures.json")
LOG_FILE    = "ingest_errors.log"
TARGET_SIZE = (400, 400)

# ── Prompt cleaning ───────────────────────────────────────────────────────────
PROMPT_PREFIX = "cartoon illustration of"
PROMPT_SUFFIX = "clean line art, soft digital shading, centered on white background, stylized chibi, digital art, in the style of AIBG"


def clean_prompt(prompt: str) -> str:
    """Strip boilerplate prefix/suffix from the image-generation prompt."""
    text = prompt.strip()
    lower = text.lower()
    if lower.startswith(PROMPT_PREFIX.lower()):
        text = text[len(PROMPT_PREFIX):].lstrip(" ,")
        lower = text.lower()
    if lower.endswith(PROMPT_SUFFIX.lower()):
        text = text[: len(text) - len(PROMPT_SUFFIX)].rstrip(" ,")
    return text.strip()


# ── Helpers ───────────────────────────────────────────────────────────────────
UUID_RE = re.compile(r'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', re.I)


def extract_uuid(url: str) -> str | None:
    m = UUID_RE.search(url)
    return m.group(1) if m else None


def parse_date(value: str) -> str:
    """Return YYYY-MM-DD from a datetime string like '2026-04-27 02:31:32'."""
    return value.strip()[:10]


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


# ── Image download + resize ───────────────────────────────────────────────────
def download_image(url: str) -> Image.Image | None:
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception as exc:
        log.error("Download failed %s: %s", url[:80], exc)
        return None


def pad_to_square(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Fit-inside then center-pad with transparency."""
    img.thumbnail(size, Image.LANCZOS)
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
    result.paste(img, offset)
    return result


def fetch_and_save(url: str, dest: Path) -> bool:
    if dest.exists():
        log.info("SKIP  %s (already exists)", dest.name)
        return True

    log.info("FETCH %s  %s", dest.stem, url[:60])
    img = download_image(url)
    if img is None:
        return False

    try:
        img = pad_to_square(img, TARGET_SIZE)
        img.save(dest, "WEBP", quality=90, method=6)
        log.info("OK    %s", dest.stem)
        return True
    except Exception as exc:
        log.error("Save failed %s: %s", dest.stem, exc)
        dest.unlink(missing_ok=True)
        return False


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Bobium creature ingest script")
    parser.add_argument("--csv",          type=Path, default=DEFAULT_CSV)
    parser.add_argument("--all-statuses", action="store_true",
                        help="Include rows where status != complete")
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"Error: {args.csv} not found.")
        print("Expected columns: creature_name, creature_image_url, prompt, created_at, status")
        sys.exit(1)

    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    with open(args.csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Validate columns
    required = {"creature_name", "creature_image_url", "prompt", "created_at"}
    actual = set(rows[0].keys()) if rows else set()
    missing = required - actual
    if missing:
        print(f"Error: CSV is missing expected columns: {missing}")
        print(f"Actual columns found: {sorted(actual)}")
        sys.exit(1)

    if not args.all_statuses:
        before = len(rows)
        rows = [r for r in rows if r.get("status", "").strip().lower() == "complete"]
        skipped = before - len(rows)
        if skipped:
            log.info("Skipping %d rows with status != complete (use --all-statuses to include)", skipped)

    log.info("Starting ingest: %d creatures", len(rows))

    creatures, errors, seen_ids = [], [], set()

    for i, row in enumerate(rows, 1):
        name = row["creature_name"].strip()
        url  = row["creature_image_url"].strip()

        creature_id = extract_uuid(url)
        if not creature_id:
            log.error("No UUID found in URL for '%s': %s", name, url)
            errors.append(name)
            continue

        if creature_id in seen_ids:
            log.warning("Duplicate UUID %s for '%s' — skipping", creature_id, name)
            continue
        seen_ids.add(creature_id)

        print(f"[{i}/{len(rows)}] {creature_id}  {name}", flush=True)

        dest = IMAGE_DIR / f"{creature_id}.webp"
        ok   = fetch_and_save(url, dest)
        if not ok:
            errors.append(creature_id)

        creatures.append({
            "creature_id":   creature_id,
            "creature_name": name,
            "prompt":        clean_prompt(row["prompt"]),
            "date_created":  parse_date(row["created_at"]),
            "image_path":    f"/creatures/images/{creature_id}.webp",
        })

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(creatures, f, indent=2, ensure_ascii=False)

    ok_count = len(creatures) - len(errors)
    log.info("Done: %d/%d succeeded", ok_count, len(creatures))
    if errors:
        log.warning("Failed (%d): %s", len(errors), errors)
        log.warning("Check %s for details", LOG_FILE)

    print(f"\n✓ {OUTPUT_JSON}  ({len(creatures)} creatures)")
    print(f"✓ {IMAGE_DIR}/")
    if errors:
        print(f"✗ {len(errors)} failed — see {LOG_FILE}")


if __name__ == "__main__":
    main()
