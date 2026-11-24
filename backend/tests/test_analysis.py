import pytest

from weather_analyzer.analysis import analyze_csv


def test_analyze_csv_returns_summary_series_and_location_comparison() -> None:
    result = analyze_csv(
        "date,temperature_c,humidity,rainfall,city\n"
        "2025-01-02,12,70,2,Oslo\n"
        "2025-01-01,10,60,1,Oslo\n"
        "2025-01-01,14,80,0,Bergen\n"
    )

    assert result["observation_count"] == 3
    assert result["date_range"] == {"start": "2025-01-01", "end": "2025-01-02"}
    assert result["metrics"]["temperature_c"] == {
        "average": 12.0,
        "minimum": 10.0,
        "maximum": 14.0,
    }
    assert result["metrics"]["rainfall_mm"]["total"] == 3.0
    assert result["temperature_trend"] == {"direction": "stable", "change_c": 0.0}
    assert result["daily_series"][0]["average_temperature_c"] == 12.0
    assert [item["location"] for item in result["location_comparison"]] == [
        "Bergen",
        "Oslo",
    ]


def test_analyze_csv_accepts_optional_measurements() -> None:
    result = analyze_csv("date,temp\n2025-01-01,8\n")

    assert result["metrics"]["humidity_pct"] is None
    assert result["metrics"]["rainfall_mm"] is None
    assert result["daily_series"][0]["rainfall_mm"] == 0


@pytest.mark.parametrize(
    ("contents", "message"),
    [
        ("temperature\n12\n", "date and temperature"),
        ("date,temperature\n2025-01-01,not-a-number\n", "temperature must be a number"),
        ("date,temperature,humidity\n2025-01-01,12,101\n", "humidity must be between"),
        ("date,temperature\n", "at least one observation"),
    ],
)
def test_analyze_csv_rejects_invalid_input(contents: str, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        analyze_csv(contents)
