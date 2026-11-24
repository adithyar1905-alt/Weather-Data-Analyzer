# Weather Data Analyzer

A Python backend for analyzing weather observations from CSV files and retrieving
live forecasts. CSV analysis includes temperature, humidity, rainfall, daily
series, temperature trends, and comparisons between locations. Live forecasts
are provided by [Open-Meteo](https://open-meteo.com/) and do not require an API key.

## Backend setup

From the `backend` directory, create and activate a virtual environment, then
install the dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn weather_analyzer.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive API documentation is
available at `http://127.0.0.1:8000/docs`; health check: `GET /health`.

## Frontend setup

In a second terminal, start the React frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`).
The frontend connects to the API at `http://127.0.0.1:8000` by default. To use
a different API address, create `frontend/.env.local` and set
`VITE_API_URL=http://your-api-host:8000`, then restart the frontend.

## API endpoints

- `POST /api/analysis/csv` — upload a CSV file as multipart form field `file`.
  CSV must include `date` and `temperature` columns. Optional columns are
  `humidity`, `rainfall` (or `precipitation`), and `location` (or `city`).
  Dates should be ISO (`YYYY-MM-DD`) or `MM/DD/YYYY`. Temperatures are in °C,
  rainfall in mm, and humidity in percent. Uploads are limited to 10 MB.
- `GET /api/weather/forecast?city=London&days=7` — look up a city and return
  current conditions and up to 16 days of forecast data.
- `GET /api/weather/forecast?latitude=51.5&longitude=-0.1&days=7` — request
  the forecast directly by coordinates.

The default CORS allowlist includes `localhost` and `127.0.0.1` development
frontends on ports 3000 and 5173. Override it with the comma-separated
`WEATHER_CORS_ORIGINS` environment variable.

## Tests

From the `backend` directory:

```powershell
python -m pytest
```
