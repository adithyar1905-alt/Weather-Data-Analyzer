import csv
import os
from typing import Any

import httpx
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from weather_analyzer.analysis import analyze_csv

OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

app = FastAPI(
    title="Weather Data Analyzer API",
    description=(
        "Analyze weather observation CSV files and retrieve live forecasts "
        "through the Open-Meteo API."
    ),
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "WEATHER_CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analysis/csv", tags=["analysis"])
async def analyze_uploaded_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Upload a .csv file.")

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="CSV file exceeds the 10 MB limit.")
    try:
        decoded = contents.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=422, detail="CSV must be encoded as UTF-8."
        ) from error

    try:
        return analyze_csv(decoded)
    except (ValueError, csv.Error) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


async def _get_json(
    client: httpx.AsyncClient, url: str, params: dict[str, Any]
) -> dict[str, Any]:
    try:
        response = await client.get(url, params=params)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="Weather data provider request failed."
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=502, detail="Weather data provider returned invalid JSON."
        ) from error
    if not isinstance(payload, dict) or payload.get("error"):
        detail = payload.get("reason", "Weather data provider returned an invalid response.")
        raise HTTPException(status_code=502, detail=detail)
    return payload


async def _geocode(client: httpx.AsyncClient, city: str) -> dict[str, Any]:
    payload = await _get_json(
        client,
        OPEN_METEO_GEOCODING_URL,
        {"name": city, "count": 1, "language": "en", "format": "json"},
    )
    results = payload.get("results") or []
    if not results:
        raise HTTPException(status_code=404, detail=f"No location found for {city!r}.")
    result = results[0]
    return {
        "name": result["name"],
        "country": result.get("country"),
        "latitude": result["latitude"],
        "longitude": result["longitude"],
        "timezone": result.get("timezone"),
    }


@app.get("/api/weather/forecast", tags=["weather"])
async def get_forecast(
    city: str | None = Query(default=None, min_length=1, max_length=100),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    days: int = Query(default=7, ge=1, le=16),
) -> dict[str, Any]:
    has_city = city is not None
    has_coordinates = latitude is not None and longitude is not None
    if has_city == has_coordinates or (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="Provide either city or both latitude and longitude, but not both.",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        if city is not None:
            location = await _geocode(client, city)
        else:
            location = {
                "name": None,
                "country": None,
                "latitude": latitude,
                "longitude": longitude,
                "timezone": "auto",
            }
        payload = await _get_json(
            client,
            OPEN_METEO_FORECAST_URL,
            {
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "daily": (
                    "temperature_2m_max,temperature_2m_min,precipitation_sum,"
                    "weather_code,wind_speed_10m_max"
                ),
                "current": (
                    "temperature_2m,relative_humidity_2m,apparent_temperature,"
                    "precipitation,weather_code,wind_speed_10m"
                ),
                "temperature_unit": "celsius",
                "wind_speed_unit": "kmh",
                "precipitation_unit": "mm",
                "timezone": location["timezone"] or "auto",
                "forecast_days": days,
            },
        )

    current = payload.get("current")
    daily = payload.get("daily")
    if not isinstance(current, dict) or not isinstance(daily, dict):
        raise HTTPException(
            status_code=502, detail="Weather data provider response is missing forecast data."
        )
    dates = daily.get("time", [])
    daily_keys = (
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "weather_code",
        "wind_speed_10m_max",
    )
    if any(not isinstance(daily.get(key), list) or len(daily[key]) != len(dates) for key in daily_keys):
        raise HTTPException(
            status_code=502, detail="Weather data provider returned incomplete daily data."
        )

    return {
        "location": location,
        "timezone": payload.get("timezone"),
        "current": current,
        "daily": [
            {"date": day, **{key: daily[key][index] for key in daily_keys}}
            for index, day in enumerate(dates)
        ],
        "units": {
            "temperature": "°C",
            "precipitation": "mm",
            "wind_speed": "km/h",
        },
    }
