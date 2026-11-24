from fastapi.testclient import TestClient

from weather_analyzer import main as weather_api
from weather_analyzer.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_csv_analysis_endpoint() -> None:
    response = client.post(
        "/api/analysis/csv",
        files={
            "file": (
                "weather.csv",
                "date,temperature,humidity,rainfall\n2025-01-01,10,75,1\n",
                "text/csv",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["metrics"]["temperature_c"]["average"] == 10


def test_csv_analysis_endpoint_reports_validation_errors() -> None:
    response = client.post(
        "/api/analysis/csv",
        files={"file": ("weather.csv", "date,temp\n2025-01-01,bad\n", "text/csv")},
    )

    assert response.status_code == 422
    assert "temperature must be a number" in response.json()["detail"]


def test_forecast_endpoint_requires_city_or_coordinate_pair() -> None:
    response = client.get("/api/weather/forecast", params={"latitude": 51.5})

    assert response.status_code == 422


def test_forecast_endpoint_returns_provider_data(monkeypatch) -> None:
    async def fake_geocode(_client, city):
        assert city == "London"
        return {
            "name": "London",
            "country": "United Kingdom",
            "latitude": 51.5,
            "longitude": -0.1,
            "timezone": "Europe/London",
        }

    async def fake_get_json(_client, _url, params):
        assert params["forecast_days"] == 2
        return {
            "timezone": "Europe/London",
            "current": {"temperature_2m": 14},
            "daily": {
                "time": ["2025-01-01"],
                "temperature_2m_max": [15],
                "temperature_2m_min": [8],
                "precipitation_sum": [1],
                "weather_code": [3],
                "wind_speed_10m_max": [12],
            },
        }

    monkeypatch.setattr(weather_api, "_geocode", fake_geocode)
    monkeypatch.setattr(weather_api, "_get_json", fake_get_json)
    response = client.get(
        "/api/weather/forecast", params={"city": "London", "days": 2}
    )

    assert response.status_code == 200
    assert response.json()["location"]["name"] == "London"
    assert response.json()["daily"][0]["temperature_2m_max"] == 15
