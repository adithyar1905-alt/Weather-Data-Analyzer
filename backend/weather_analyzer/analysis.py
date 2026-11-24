import csv
import io
import math
import re
from collections import defaultdict
from datetime import date, datetime
from statistics import mean
from typing import Any


ALIASES = {
    "date": {"date", "datetime", "timestamp", "time", "observationdate"},
    "temperature": {
        "temperature",
        "temperaturec",
        "tempc",
        "temp",
        "tempcelsius",
        "meantemperature",
    },
    "humidity": {"humidity", "humiditypct", "relativehumidity"},
    "rainfall": {"rainfall", "rain", "precipitation", "precipitationmm"},
    "location": {"location", "city", "town", "station"},
}


def _header_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().strip())


def _parse_date(value: str, row_number: int) -> date:
    cleaned = value.strip()
    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).date()
    except ValueError:
        for date_format in ("%m/%d/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(cleaned, date_format).date()
            except ValueError:
                pass
    raise ValueError(f"Row {row_number}: invalid date {value!r}.")


def _parse_number(value: str | None, field: str, row_number: int) -> float | None:
    if value is None or not value.strip():
        return None
    try:
        number = float(value.strip())
    except ValueError as error:
        raise ValueError(f"Row {row_number}: {field} must be a number.") from error
    if not math.isfinite(number):
        raise ValueError(f"Row {row_number}: {field} must be a finite number.")
    if field == "humidity" and not 0 <= number <= 100:
        raise ValueError(f"Row {row_number}: humidity must be between 0 and 100.")
    if field == "rainfall" and number < 0:
        raise ValueError(f"Row {row_number}: rainfall cannot be negative.")
    return number


def _metric(values: list[float], *, total: bool = False) -> dict[str, float] | None:
    if not values:
        return None
    result = {
        "average": round(mean(values), 2),
        "minimum": round(min(values), 2),
        "maximum": round(max(values), 2),
    }
    if total:
        result["total"] = round(sum(values), 2)
    return result


def _direction(change: float) -> str:
    if change > 0.05:
        return "increasing"
    if change < -0.05:
        return "decreasing"
    return "stable"


def analyze_csv(contents: str) -> dict[str, Any]:
    reader = csv.DictReader(io.StringIO(contents))
    if not reader.fieldnames:
        raise ValueError("CSV must include a header row.")

    fields: dict[str, str] = {}
    for column in reader.fieldnames:
        key = _header_key(column or "")
        for canonical, aliases in ALIASES.items():
            if key in aliases:
                if canonical in fields:
                    raise ValueError(f"CSV has more than one column for {canonical}.")
                fields[canonical] = column
                break

    missing = {"date", "temperature"} - fields.keys()
    if missing:
        raise ValueError(
            "CSV must include date and temperature columns; "
            f"missing: {', '.join(sorted(missing))}."
        )

    observations: list[dict[str, Any]] = []
    for row_number, row in enumerate(reader, start=2):
        if not any(value and value.strip() for value in row.values()):
            continue
        if None in row:
            raise ValueError(f"Row {row_number}: too many values for the CSV header.")
        if any(row.get(column) is None for column in fields.values()):
            raise ValueError(f"Row {row_number}: row has too few values for the CSV header.")

        raw_date = row[fields["date"]]
        raw_temperature = row[fields["temperature"]]
        if not raw_date or not raw_date.strip():
            raise ValueError(f"Row {row_number}: date is required.")
        if not raw_temperature or not raw_temperature.strip():
            raise ValueError(f"Row {row_number}: temperature is required.")

        observation: dict[str, Any] = {
            "date": _parse_date(raw_date, row_number),
            "temperature": _parse_number(raw_temperature, "temperature", row_number),
            "humidity": _parse_number(row.get(fields.get("humidity", "")), "humidity", row_number),
            "rainfall": _parse_number(row.get(fields.get("rainfall", "")), "rainfall", row_number),
            "location": (row.get(fields.get("location", ""), "") or "").strip() or None,
        }
        observations.append(observation)

    if not observations:
        raise ValueError("CSV must contain at least one observation.")

    by_day: dict[date, list[dict[str, Any]]] = defaultdict(list)
    by_location: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for observation in observations:
        by_day[observation["date"]].append(observation)
        if observation["location"]:
            by_location[observation["location"]].append(observation)

    daily_series = []
    for day in sorted(by_day):
        day_rows = by_day[day]
        daily_series.append(
            {
                "date": day.isoformat(),
                "average_temperature_c": round(
                    mean(row["temperature"] for row in day_rows), 2
                ),
                "average_humidity_pct": (
                    round(mean(values), 2)
                    if (values := [
                        row["humidity"] for row in day_rows if row["humidity"] is not None
                    ])
                    else None
                ),
                "rainfall_mm": round(
                    sum(row["rainfall"] or 0 for row in day_rows), 2
                ),
            }
        )

    daily_temperatures = [item["average_temperature_c"] for item in daily_series]
    temperature_change = round(daily_temperatures[-1] - daily_temperatures[0], 2)
    comparisons = []
    for location, rows in sorted(by_location.items()):
        comparisons.append(
            {
                "location": location,
                "observation_count": len(rows),
                "average_temperature_c": round(
                    mean(row["temperature"] for row in rows), 2
                ),
                "average_humidity_pct": (
                    round(mean(values), 2)
                    if (values := [
                        row["humidity"] for row in rows if row["humidity"] is not None
                    ])
                    else None
                ),
                "total_rainfall_mm": round(
                    sum(row["rainfall"] or 0 for row in rows), 2
                ),
            }
        )

    temperatures = [row["temperature"] for row in observations]
    humidity = [row["humidity"] for row in observations if row["humidity"] is not None]
    rainfall = [row["rainfall"] for row in observations if row["rainfall"] is not None]
    return {
        "observation_count": len(observations),
        "date_range": {
            "start": min(by_day).isoformat(),
            "end": max(by_day).isoformat(),
        },
        "metrics": {
            "temperature_c": _metric(temperatures),
            "humidity_pct": _metric(humidity),
            "rainfall_mm": _metric(rainfall, total=True),
        },
        "temperature_trend": {
            "direction": _direction(temperature_change),
            "change_c": temperature_change,
        },
        "daily_series": daily_series,
        "location_comparison": comparisons,
    }
