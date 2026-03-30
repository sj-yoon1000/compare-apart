"""Capture Naver Maps transit route screenshots for all apartments."""
import json
import re
import time
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

PROJECT = Path(__file__).resolve().parent.parent
MAPS_DIR = PROJECT / "data" / "maps"
WEB_JSON = PROJECT / "web" / "apartments.json"

# Load apartments
with open(WEB_JSON) as f:
    data = json.load(f)

# Get unique complexes
seen = set()
complexes = []
for apt in data["apartments"]:
    if apt["name"] not in seen:
        complexes.append({"name": apt["name"], "region": apt["region"]})
        seen.add(apt["name"])

print(f"Processing {len(complexes)} unique complexes")
MAPS_DIR.mkdir(parents=True, exist_ok=True)

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1200, "height": 900})

    for i, apt in enumerate(complexes):
        name = apt["name"]
        region = apt["region"]
        safe_name = re.sub(r'[^\w가-힣]', '_', name)
        filename = f"{safe_name}.png"
        filepath = MAPS_DIR / filename

        search_term = f"{name} {region}"
        dest = "강남역"

        print(f"[{i+1}/{len(complexes)}] {name} ({region})")

        try:
            # Use Naver Map PC directions page with search terms
            url = f"https://map.naver.com/p/directions/{quote(search_term)}/{quote(dest)}/transit"
            page.goto(url, wait_until="networkidle", timeout=15000)
            time.sleep(4)

            # Take screenshot
            page.screenshot(path=str(filepath), clip={"x": 0, "y": 0, "width": 1200, "height": 900})

            # Try to extract transit time from the page
            try:
                frame = page.frames[0]
                content = frame.content()
                # Look for time patterns like "23분" or "1시간 5분"
                time_match = re.search(r'(\d+시간\s*)?\d+분', content)
                transit_time = time_match.group(0) if time_match else None
            except:
                transit_time = None

            results[name] = {
                "filename": filename,
                "transit_time": transit_time,
            }
            print(f"  ✓ Saved {filename}" + (f" ({transit_time})" if transit_time else ""))

        except Exception as e:
            print(f"  ✗ Error: {e}")
            results[name] = {"filename": None, "transit_time": None}

        time.sleep(1)  # Rate limiting

    browser.close()

# Save results
with open(PROJECT / "data" / "map_results.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nDone! {sum(1 for v in results.values() if v['filename'])} screenshots saved")
