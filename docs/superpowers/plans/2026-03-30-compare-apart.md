# Compare Apart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an apartment comparison web app that reads data from Excel, converts to JSON, and displays a sortable list with expandable detail cards.

**Architecture:** Python script converts Excel → JSON. Static HTML/CSS/JS frontend loads JSON and renders interactive apartment cards. FastAPI serves files locally; GitHub Pages for deployment.

**Tech Stack:** Python 3, openpyxl, FastAPI, vanilla HTML/CSS/JS

**Note:** Area type filtering (59/84 and below) is handled at Excel data-entry time, not in the conversion script.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `data/apartments.xlsx` | Source data (manual entry) |
| `data/maps/` | Naver Maps route screenshots |
| `scripts/convert.py` | Excel → JSON conversion with filtering/grouping |
| `tests/test_convert.py` | Tests for conversion logic |
| `tests/conftest.py` | Shared test fixtures |
| `web/index.html` | Single-page app shell |
| `web/style.css` | All styling (cards, dropdown, filter bar, responsive) |
| `web/app.js` | Data loading, rendering, sorting, dropdown toggle |
| `web/apartments.json` | Generated output (not hand-edited) |
| `web/maps/` | Copied map images for deployment |
| `server.py` | FastAPI static file server for local dev |
| `requirements.txt` | Python dependencies |
| `.gitignore` | Ignore .venv, .idea, __pycache__, .superpowers |

---

### Task 1: Project Setup

**Files:**
- Create: `requirements.txt`
- Create: `.gitignore`
- Create: `data/apartments.xlsx` (sample data)
- Create: `data/maps/.gitkeep`

- [ ] **Step 1: Create requirements.txt**

```
openpyxl==3.1.5
fastapi==0.115.0
uvicorn==0.30.0
pytest==8.3.0
```

- [ ] **Step 2: Create .gitignore**

```
.venv/
.idea/
__pycache__/
*.pyc
.superpowers/
.DS_Store
```

- [ ] **Step 3: Create sample Excel file with 6 test rows**

Create `data/apartments.xlsx` with the column structure from the spec. Include:
- Row 1: 래미안원베일리 84A, 22/25층, 11.0억, 2990세대 (normal)
- Row 2: 래미안원베일리 84A, 15/25층, 10.0억, 2990세대 (normal, for price range test)
- Row 3: 래미안원베일리 84A, 3/25층, 9.5억, 2990세대 (low floor numeric)
- Row 4: 테스트소형단지 59A, 10/15층, 10.0억, 150세대 (under 300 units → exclude)
- Row 5: 잠실엘스 59B, 12/30층, 10.0억, 5678세대 (normal, different complex)
- Row 6: 저층만단지 84A, 저층, 10.0억, 500세대 (all-low-floor → exclude group)

- [ ] **Step 4: Create data/maps/.gitkeep**

- [ ] **Step 5: Install dependencies**

Run: `cd /Users/user/PycharmProjects/compare-apart && source .venv/bin/activate && pip install -r requirements.txt`

- [ ] **Step 6: Commit**

```bash
git add requirements.txt .gitignore data/
git commit -m "chore: project setup with dependencies and sample data"
```

---

### Task 2: Excel → JSON Conversion Script (TDD)

**Files:**
- Create: `tests/conftest.py`
- Create: `tests/test_convert.py`
- Create: `scripts/convert.py`

- [ ] **Step 1: Create conftest.py with sample_xlsx fixture**

```python
# tests/conftest.py
import pytest
from openpyxl import Workbook

COLUMNS = [
    "단지명", "지역", "주소", "면적타입", "전용면적(㎡)", "매매가(억)",
    "층수", "입주년도", "세대수", "강남역_시간(분)", "강남역_교통수단",
    "최근역", "최근역_도보(분)", "대형마트", "상권", "혐오시설",
    "주변학교", "지도_이미지", "네이버_URL", "메모"
]

ROWS = [
    ["래미안 원베일리", "서울 서초구", "서초구 반포동 123", "84A", 84.98, 11.0,
     "22/25", 2023, 2990, 12, "신분당선 직통", "반포역", 5,
     "이마트 (도보 10분)", "상가 밀집", "없음", "반포초", "test_map.png",
     "https://land.naver.com/1", "남향 로열층"],
    ["래미안 원베일리", "서울 서초구", "서초구 반포동 123", "84A", 84.98, 10.0,
     "15/25", 2023, 2990, 12, "신분당선 직통", "반포역", 5,
     "이마트 (도보 10분)", "상가 밀집", "없음", "반포초", "test_map.png",
     "https://land.naver.com/4", "남향"],
    ["래미안 원베일리", "서울 서초구", "서초구 반포동 123", "84A", 84.98, 9.5,
     "3/25", 2023, 2990, 12, "신분당선 직통", "반포역", 5,
     "이마트 (도보 10분)", "상가 밀집", "없음", "반포초", "test_map.png",
     "https://land.naver.com/2", "급매"],
    ["테스트소형단지", "서울 강남구", "강남구 역삼동 1", "59A", 59.0, 10.0,
     "10/15", 2020, 150, 5, "도보", "역삼역", 3,
     "없음", "없음", "없음", "역삼초", None, None, "소형단지"],
    ["잠실 엘스", "서울 송파구", "송파구 잠실동 1", "59B", 59.97, 10.0,
     "12/30", 2008, 5678, 15, "2호선", "잠실역", 3,
     "롯데마트", "잠실 상권", "없음", "잠실초", None,
     "https://land.naver.com/3", "정남향"],
    ["저층만단지", "서울 강남구", "강남구 대치동 1", "84A", 84.0, 10.0,
     "저층", 2015, 500, 10, "분당선", "대치역", 7,
     "없음", "없음", "없음", "대치초", None, None, "저층만 있음"],
]


@pytest.fixture
def sample_xlsx(tmp_path):
    wb = Workbook()
    ws = wb.active
    ws.append(COLUMNS)
    for row in ROWS:
        ws.append(row)
    path = tmp_path / "test.xlsx"
    wb.save(path)
    return path
```

- [ ] **Step 2: Write all failing tests**

```python
# tests/test_convert.py
from scripts.convert import load_and_convert


def test_excludes_under_300_units(sample_xlsx):
    """300세대 미만 단지는 제외된다."""
    result = load_and_convert(sample_xlsx)
    names = [a["name"] for a in result["apartments"]]
    assert "테스트소형단지" not in names


def test_low_floor_numeric_flagged(sample_xlsx):
    """5층 이하 매물에 is_low_floor=True 플래그."""
    result = load_and_convert(sample_xlsx)
    apt = next(a for a in result["apartments"] if a["name"] == "래미안 원베일리")
    low = [l for l in apt["listings"] if l["is_low_floor"]]
    normal = [l for l in apt["listings"] if not l["is_low_floor"]]
    assert len(low) == 1
    assert low[0]["floor"] == "3/25"
    assert len(normal) == 2


def test_low_floor_text_flagged(sample_xlsx):
    """'저층' 텍스트 포함 매물에 is_low_floor=True 플래그."""
    result = load_and_convert(sample_xlsx)
    # 저층만단지는 비저층 0건이라 제외되므로, is_low_floor 함수 직접 테스트
    from scripts.convert import is_low_floor
    assert is_low_floor("저층") is True
    assert is_low_floor("저층/25") is True
    assert is_low_floor("12/25") is False


def test_price_range_multiple_non_low(sample_xlsx):
    """비저층 매물 2건 이상이면 min~max 형식."""
    result = load_and_convert(sample_xlsx)
    apt = next(a for a in result["apartments"] if a["name"] == "래미안 원베일리")
    assert apt["price_range"] == "10.0~11.0억"


def test_price_range_single_non_low(sample_xlsx):
    """비저층 매물 1건이면 단일 가격 형식."""
    from scripts.convert import format_price_range
    assert format_price_range([10.5]) == "10.5억"


def test_all_low_floor_excluded(sample_xlsx):
    """비저층 매물 0건인 그룹은 결과에서 제외."""
    result = load_and_convert(sample_xlsx)
    names = [a["name"] for a in result["apartments"]]
    assert "저층만단지" not in names


def test_grouping_by_complex_and_type(sample_xlsx):
    """같은 단지+타입의 매물은 하나로 그룹핑."""
    result = load_and_convert(sample_xlsx)
    apt = next(a for a in result["apartments"] if a["name"] == "래미안 원베일리")
    assert len(apt["listings"]) == 3


def test_id_generation(sample_xlsx):
    """id는 단지명공백제거_타입 형식."""
    result = load_and_convert(sample_xlsx)
    apt = next(a for a in result["apartments"] if a["name"] == "래미안 원베일리")
    assert apt["id"] == "래미안원베일리_84A"


def test_generated_at_present(sample_xlsx):
    """generated_at 타임스탬프가 포함된다."""
    result = load_and_convert(sample_xlsx)
    assert "generated_at" in result
    assert len(result["generated_at"]) > 0
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/user/PycharmProjects/compare-apart && source .venv/bin/activate && python -m pytest tests/ -v`
Expected: All 9 tests FAIL (ImportError — convert module doesn't exist yet)

- [ ] **Step 4: Create scripts/__init__.py and tests/__init__.py**

Empty files to make both directories importable as packages.

- [ ] **Step 5: Implement convert.py**

```python
# scripts/convert.py
"""Excel → JSON conversion for apartment data."""
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook


def is_low_floor(floor_str: str) -> bool:
    """5층 이하 또는 '저층' 포함이면 True."""
    if "저층" in floor_str:
        return True
    try:
        current = int(floor_str.split("/")[0])
        return current <= 5
    except (ValueError, IndexError):
        return False


def format_price_range(prices: list[float]) -> str | None:
    """비저층 매물 가격으로 범위 문자열 생성. 0건이면 None."""
    if not prices:
        return None
    if len(prices) == 1:
        return f"{prices[0]:.1f}억"
    return f"{min(prices):.1f}~{max(prices):.1f}억"


def load_and_convert(xlsx_path: Path) -> dict:
    """Excel 파일을 읽어 JSON 구조로 변환."""
    wb = load_workbook(xlsx_path, read_only=True)
    ws = wb.active

    # Headers first, then data (read_only mode streams sequentially)
    headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    records = [dict(zip(headers, row)) for row in rows]

    # Filter: 300세대 이상, 9.5~11.5억
    filtered = [
        r for r in records
        if (r.get("세대수") or 0) >= 300
        and 9.5 <= (r.get("매매가(억)") or 0) <= 11.5
    ]

    # Group by 단지명 + 주소 + 면적타입
    groups: dict[tuple, list] = {}
    for r in filtered:
        key = (r["단지명"], r["주소"], r["면적타입"])
        groups.setdefault(key, []).append(r)

    apartments = []
    for (name, address, apt_type), listings in groups.items():
        first = listings[0]

        processed_listings = []
        non_low_prices = []

        for l in listings:
            floor_str = str(l.get("층수", ""))
            low = is_low_floor(floor_str)
            price = float(l["매매가(억)"])

            if not low:
                non_low_prices.append(price)

            processed_listings.append({
                "floor": floor_str,
                "price": price,
                "memo": l.get("메모") or "",
                "naver_url": l.get("네이버_URL") or "",
                "is_low_floor": low,
            })

        price_range = format_price_range(non_low_prices)
        if price_range is None:
            continue  # 비저층 매물 0건 → 제외

        apt_id = f"{name.replace(' ', '')}_{apt_type}"

        apartments.append({
            "id": apt_id,
            "name": name,
            "region": first.get("지역") or "",
            "address": address or "",
            "type": apt_type,
            "area_sqm": float(first.get("전용면적(㎡)") or 0),
            "built_year": int(first.get("입주년도") or 0),
            "total_units": int(first.get("세대수") or 0),
            "gangnam_minutes": int(first.get("강남역_시간(분)") or 0),
            "gangnam_transport": first.get("강남역_교통수단") or "",
            "nearest_station": first.get("최근역") or "",
            "station_walk_min": int(first.get("최근역_도보(분)") or 0),
            "mart": first.get("대형마트") or "",
            "commercial": first.get("상권") or "",
            "nimby": first.get("혐오시설") or "",
            "schools": first.get("주변학교") or "",
            "map_image": first.get("지도_이미지"),
            "price_range": price_range,
            "listings": processed_listings,
        })

    return {
        "generated_at": datetime.now().isoformat(timespec="minutes"),
        "apartments": apartments,
    }


def main():
    project_root = Path(__file__).resolve().parent.parent
    xlsx_path = project_root / "data" / "apartments.xlsx"
    web_dir = project_root / "web"
    maps_src = project_root / "data" / "maps"
    maps_dst = web_dir / "maps"

    if not xlsx_path.exists():
        print(f"Error: {xlsx_path} not found")
        sys.exit(1)

    result = load_and_convert(xlsx_path)

    # Write JSON
    web_dir.mkdir(exist_ok=True)
    output_path = web_dir / "apartments.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Written {len(result['apartments'])} apartments to {output_path}")

    # Copy map images
    if maps_src.exists():
        maps_dst.mkdir(exist_ok=True)
        for img in maps_src.glob("*.png"):
            shutil.copy2(img, maps_dst / img.name)
        for img in maps_src.glob("*.jpg"):
            shutil.copy2(img, maps_dst / img.name)
        print(f"Copied map images to {maps_dst}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/user/PycharmProjects/compare-apart && source .venv/bin/activate && python -m pytest tests/ -v`
Expected: All 9 tests PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/ tests/
git commit -m "feat: Excel to JSON conversion with filtering and grouping"
```

---

### Task 3: Web Frontend — HTML Shell & Styles

**Files:**
- Create: `web/index.html`
- Create: `web/style.css`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compare Apart - 아파트 비교</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="filter-bar">
        <div class="filter-labels">
            <span class="filter-tag">💰 9.5억 ~ 11.5억</span>
            <span class="filter-tag">📐 59 · 84 타입</span>
            <span class="filter-tag">🏢 300세대+</span>
            <span class="filter-tag">📍 서울 · 경기</span>
        </div>
        <div class="sort-control">
            <label for="sort-select">정렬:</label>
            <select id="sort-select">
                <option value="gangnam">강남역 가까운 순</option>
                <option value="price-asc">매매가 낮은순</option>
                <option value="price-desc">매매가 높은순</option>
                <option value="units">세대수순</option>
                <option value="area">전용면적 오름차순</option>
            </select>
        </div>
    </header>

    <main id="apartment-list"></main>

    <footer id="footer"></footer>

    <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create style.css**

```css
/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8f9fa;
    color: #212529;
    line-height: 1.5;
}

/* Filter Bar */
.filter-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fff;
    padding: 16px 20px;
    border-bottom: 2px solid #e9ecef;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}
.filter-labels { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-tag {
    background: #f1f3f5;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: #495057;
}
.sort-control {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #868e96;
}
.sort-control select {
    padding: 4px 8px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    font-size: 13px;
    background: #fff;
}

/* Apartment List */
#apartment-list { padding: 12px 20px; max-width: 1200px; margin: 0 auto; }

/* Card */
.card {
    background: #fff;
    border-radius: 12px;
    margin-bottom: 12px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    overflow: hidden;
}
.card-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    border-left: 4px solid #e9ecef;
    transition: border-color 0.2s;
}
.card.open .card-header { border-left-color: #339af0; }

/* Rank */
.rank { min-width: 40px; text-align: center; }
.rank-label { font-size: 11px; color: #868e96; }
.rank-number { font-size: 22px; font-weight: 700; color: #495057; }
.card.open .rank-number { color: #339af0; }

/* Card Info */
.card-name { font-weight: 700; font-size: 16px; }
.card-sub { font-size: 13px; color: #868e96; margin-top: 2px; }
.card-info { flex: 1; }

/* Stat Boxes */
.stat { text-align: center; padding: 0 12px; }
.stat-label { font-size: 11px; color: #868e96; }
.stat-value { font-size: 18px; font-weight: 700; }

/* Gangnam Time Colors */
.gangnam-fast { color: #20c997; }
.gangnam-medium { color: #fab005; }
.gangnam-slow { color: #fd7e14; }

/* Toggle Arrow */
.toggle-arrow { font-size: 20px; color: #adb5bd; transition: transform 0.2s; }
.card.open .toggle-arrow { transform: rotate(90deg); }

/* Card Detail (dropdown) */
.card-detail {
    display: none;
    background: #f8f9fa;
    padding: 20px;
    border-top: 1px solid #e9ecef;
}
.card.open .card-detail { display: block; }

/* Detail Content: Info + Map */
.detail-content { display: flex; gap: 24px; flex-wrap: wrap; }
.detail-info { flex: 1; min-width: 300px; }
.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}
.detail-section-title {
    font-size: 11px;
    color: #868e96;
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 600;
}
.detail-item { font-size: 13px; color: #212529; margin-bottom: 4px; }
.detail-item strong { font-weight: 600; }
.nimby-ok { color: #40c057; }

/* Map Container */
.map-container { width: 560px; flex-shrink: 0; }
.map-image {
    width: 560px;
    height: 440px;
    max-width: 100%;
    border-radius: 8px;
    object-fit: cover;
}
.map-placeholder {
    width: 560px;
    height: 440px;
    max-width: 100%;
    background: #e9ecef;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #868e96;
    font-size: 14px;
    border: 2px dashed #ced4da;
}
.map-caption { margin-top: 8px; text-align: center; font-size: 12px; color: #868e96; }

/* Listings Table */
.listings-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #dee2e6;
}
.listing-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.listing-table th {
    text-align: left;
    padding: 8px 12px;
    color: #495057;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
}
.listing-table td { padding: 10px 12px; border-bottom: 1px solid #e9ecef; }
.listing-table tr.low-floor { background: #fff5f5; }
.listing-table tr.low-floor td { color: #ced4da; }
.low-badge {
    font-size: 11px;
    background: #ffe3e3;
    color: #e03131;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 4px;
}
.listing-price { font-weight: 600; }
.listing-memo { color: #868e96; }
.listing-link { text-decoration: none; font-size: 16px; }
.listing-link:hover { opacity: 0.7; }
.listings-note { margin-top: 8px; font-size: 11px; color: #adb5bd; }

/* Footer */
#footer {
    text-align: center;
    padding: 20px;
    font-size: 12px;
    color: #adb5bd;
}

/* Responsive */
@media (max-width: 900px) {
    .detail-content { flex-direction: column; }
    .map-container { width: 100%; }
    .map-image, .map-placeholder { width: 100%; height: auto; aspect-ratio: 560/440; }
    .detail-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
    .card-header { flex-wrap: wrap; gap: 8px; }
    .stat { padding: 0 6px; }
    .filter-bar { padding: 12px 16px; }
    #apartment-list { padding: 8px 12px; }
}
```

- [ ] **Step 3: Verify HTML opens in browser**

Run: `open /Users/user/PycharmProjects/compare-apart/web/index.html`
Expected: Empty page with sticky filter bar and sort dropdown visible

- [ ] **Step 4: Commit**

```bash
git add web/index.html web/style.css
git commit -m "feat: HTML shell and CSS styles for apartment list UI"
```

---

### Task 4: Web Frontend — JavaScript (Data Loading, Rendering, Sorting)

**Files:**
- Create: `web/app.js`

- [ ] **Step 1: Create app.js with all functionality**

```javascript
// --- Data Loading ---
async function loadData() {
    const res = await fetch('apartments.json');
    return res.json();
}

// --- Gangnam Time Color ---
function gangnamColorClass(minutes) {
    if (minutes <= 15) return 'gangnam-fast';
    if (minutes <= 30) return 'gangnam-medium';
    return 'gangnam-slow';
}

// --- Sorting ---
function getMinNonLowPrice(apt) {
    const prices = apt.listings.filter(l => !l.is_low_floor).map(l => l.price);
    return prices.length ? Math.min(...prices) : Infinity;
}

function getMaxNonLowPrice(apt) {
    const prices = apt.listings.filter(l => !l.is_low_floor).map(l => l.price);
    return prices.length ? Math.max(...prices) : -Infinity;
}

function sortApartments(apartments, sortKey) {
    switch (sortKey) {
        case 'gangnam':
            apartments.sort((a, b) => a.gangnam_minutes - b.gangnam_minutes);
            break;
        case 'price-asc':
            apartments.sort((a, b) => getMinNonLowPrice(a) - getMinNonLowPrice(b));
            break;
        case 'price-desc':
            apartments.sort((a, b) => getMaxNonLowPrice(b) - getMaxNonLowPrice(a));
            break;
        case 'units':
            apartments.sort((a, b) => b.total_units - a.total_units);
            break;
        case 'area':
            apartments.sort((a, b) => a.area_sqm - b.area_sqm);
            break;
    }
}

// --- Rendering ---
function renderApartments(apartments) {
    const container = document.getElementById('apartment-list');
    container.innerHTML = '';

    apartments.forEach((apt, index) => {
        const listingCount = apt.listings.length;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="rank">
                    <div class="rank-label">순위</div>
                    <div class="rank-number">${index + 1}</div>
                </div>
                <div class="card-info">
                    <div class="card-name">${apt.name}</div>
                    <div class="card-sub">${apt.region} · ${apt.type} · ${apt.total_units.toLocaleString()}세대</div>
                </div>
                <div class="stat">
                    <div class="stat-label">강남역</div>
                    <div class="stat-value ${gangnamColorClass(apt.gangnam_minutes)}">${apt.gangnam_minutes}분</div>
                </div>
                <div class="stat">
                    <div class="stat-label">매매가</div>
                    <div class="stat-value">${apt.price_range}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">매물</div>
                    <div class="stat-value" style="font-size:16px;color:#495057;">${listingCount}건</div>
                </div>
                <div class="toggle-arrow">▶</div>
            </div>
            <div class="card-detail">
                <div class="detail-content">
                    <div class="detail-info">
                        <div class="detail-grid">
                            <div>
                                <div class="detail-section-title">교통</div>
                                <div class="detail-item">🚇 강남역 <strong>${apt.gangnam_minutes}분</strong> (${apt.gangnam_transport})</div>
                                <div class="detail-item">🚶 ${apt.nearest_station} 도보 <strong>${apt.station_walk_min}분</strong></div>
                            </div>
                            <div>
                                <div class="detail-section-title">단지 정보</div>
                                <div class="detail-item">📐 전용 ${apt.area_sqm}㎡ (${apt.type}타입)</div>
                                <div class="detail-item">🏢 ${apt.built_year}년 입주</div>
                                <div class="detail-item">🏘️ 총 ${apt.total_units.toLocaleString()}세대</div>
                            </div>
                            <div>
                                <div class="detail-section-title">주변환경</div>
                                <div class="detail-item">🛒 ${apt.mart || '정보 없음'}</div>
                                <div class="detail-item">🏪 ${apt.commercial || '정보 없음'}</div>
                                <div class="detail-item ${apt.nimby === '없음' ? 'nimby-ok' : ''}">${apt.nimby === '없음' ? '✅ 혐오시설 없음' : '⚠️ ' + apt.nimby}</div>
                            </div>
                            <div>
                                <div class="detail-section-title">학교</div>
                                <div class="detail-item">🏫 ${apt.schools || '정보 없음'}</div>
                            </div>
                        </div>
                    </div>
                    <div class="map-container">
                        <div class="detail-section-title">강남역 대중교통 경로</div>
                        ${apt.map_image
                            ? `<img class="map-image" src="maps/${apt.map_image}" alt="${apt.name} → 강남역 경로">`
                            : '<div class="map-placeholder">🗺️ 지도 없음</div>'
                        }
                        <div class="map-caption">${apt.name} → 강남역 · 대중교통 ${apt.gangnam_minutes}분</div>
                    </div>
                </div>
                <div class="listings-section">
                    <div class="detail-section-title">개별 매물 목록</div>
                    <table class="listing-table">
                        <thead>
                            <tr>
                                <th>층수</th>
                                <th>매매가</th>
                                <th>네이버 부동산 설명</th>
                                <th>링크</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${apt.listings.map(l => `
                                <tr class="${l.is_low_floor ? 'low-floor' : ''}">
                                    <td><strong>${l.floor}</strong>${l.is_low_floor ? '<span class="low-badge">저층</span>' : ''}</td>
                                    <td class="listing-price">${l.price}억</td>
                                    <td class="listing-memo">${l.memo}</td>
                                    <td>${l.naver_url ? `<a class="listing-link" href="${l.naver_url}" target="_blank">🔗</a>` : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="listings-note">* 저층(5층 이하) 매물은 매매가 범위에 포함되지 않습니다</div>
                </div>
            </div>
        `;

        // Toggle dropdown on header click
        card.querySelector('.card-header').addEventListener('click', () => {
            card.classList.toggle('open');
        });

        container.appendChild(card);
    });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadData();
    const apartments = data.apartments;

    // Default sort: gangnam
    sortApartments(apartments, 'gangnam');
    renderApartments(apartments);

    document.getElementById('footer').textContent =
        `최종 업데이트: ${data.generated_at}`;

    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortApartments(apartments, e.target.value);
        renderApartments(apartments);
    });
});
```

- [ ] **Step 2: Generate sample JSON data**

Run: `cd /Users/user/PycharmProjects/compare-apart && source .venv/bin/activate && python scripts/convert.py`
Expected: `Written 2 apartments to web/apartments.json`

- [ ] **Step 3: Verify with local file or server**

Open in browser or use FastAPI server.
Expected: 2 apartment cards (래미안원베일리, 잠실엘스). Click expands detail. Sort works.

- [ ] **Step 4: Commit**

```bash
git add web/app.js
git commit -m "feat: JavaScript for data loading, rendering, sorting, and dropdown"
```

---

### Task 5: FastAPI Local Development Server

**Files:**
- Create: `server.py`

- [ ] **Step 1: Create server.py**

```python
# server.py
"""Local development server for Compare Apart."""
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/", StaticFiles(directory=Path(__file__).parent / "web", html=True))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

- [ ] **Step 2: Run and verify**

Run: `cd /Users/user/PycharmProjects/compare-apart && source .venv/bin/activate && python server.py`
Expected: Server starts on http://0.0.0.0:8000, page loads with apartment cards.

- [ ] **Step 3: Commit**

```bash
git add server.py
git commit -m "feat: FastAPI local dev server"
```

---

### Task 6: End-to-End Verification

**Files:** No new files. Verification only.

- [ ] **Step 1: Run full pipeline**

```bash
cd /Users/user/PycharmProjects/compare-apart
source .venv/bin/activate
python scripts/convert.py
python -m pytest tests/ -v
python server.py
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:8000 and check:
- [ ] Filter bar shows all condition labels
- [ ] Sort dropdown works (all 5 options)
- [ ] Card shows rank, name, region, type, units, gangnam time, price range, listing count
- [ ] Click expands dropdown with info grid + map placeholder + listing table
- [ ] Low floor listings are dimmed with badge
- [ ] Naver URL links are clickable as 🔗 icon
- [ ] Map placeholder shows "지도 없음" for apartments without map_image
- [ ] Footer shows generated_at timestamp
- [ ] Responsive on mobile viewport (Chrome DevTools)

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: end-to-end verification fixes"
```
