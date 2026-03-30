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
