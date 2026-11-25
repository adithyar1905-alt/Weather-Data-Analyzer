import { useMemo, useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mostly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Foggy", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with heavy hail", "⛈️"],
};

function weatherLabel(code) {
  return WEATHER_CODES[code] || ["Conditions", "🌡️"];
}

function weatherType(code) {
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  return "cloudy";
}

function WeatherVisual({ code, compact = false }) {
  const type = weatherType(code);
  return (
    <div className={`weather-visual weather-${type}${compact ? " compact" : ""}`} aria-hidden="true">
      <span className="visual-sun" />
      <span className="visual-cloud cloud-back" />
      <span className="visual-cloud cloud-front" />
      <span className="visual-rain">{[0, 1, 2, 3, 4, 5].map((drop) => <i key={drop} />)}</span>
      <span className="visual-snow">{[0, 1, 2, 3, 4, 5].map((flake) => <i key={flake} />)}</span>
      <span className="visual-fog">{[0, 1, 2].map((layer) => <i key={layer} />)}</span>
      <span className="visual-lightning" />
    </div>
  );
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatClock(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en", {
    hour: "numeric",
    minute: "2-digit",
  });
}

async function requestJson(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(
      `Could not connect to the backend at ${API_BASE}. Start the FastAPI server and try again.`,
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(
      Array.isArray(detail)
        ? detail.map((item) => item.msg).join(", ")
        : detail || `Request failed (${response.status}).`,
    );
  }
  return payload;
}

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 6-7" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    wind: <><path d="M3 8h12a3 3 0 1 0-3-3" /><path d="M2 12h17a3 3 0 1 1-3 3" /><path d="M4 16h6" /></>,
    drop: <><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z" /></>,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
}

function TemperatureChart({ points }) {
  const width = 660;
  const height = 220;
  const padding = { top: 24, right: 20, bottom: 38, left: 38 };
  const temps = points.map((point) => point.temperature);
  const floor = Math.floor(Math.min(...temps) / 5) * 5 - 2;
  const ceiling = Math.ceil(Math.max(...temps) / 5) * 5 + 2;
  const range = ceiling - floor || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      padding.left +
      (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y:
      padding.top +
      ((ceiling - point.temperature) / range) * plotHeight,
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="chart-wrap">
      <svg
        className="temperature-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Average daily temperature chart"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + fraction * plotHeight;
          const value = Math.round(ceiling - fraction * range);
          return (
            <g key={fraction}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-grid" />
              <text x="0" y={y + 4} className="chart-axis">{value}°</text>
            </g>
          );
        })}
        <polyline points={polyline} className="chart-line" />
        {coordinates.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="4.5" className="chart-dot" />
            <text x={point.x} y={height - 10} textAnchor="middle" className="chart-axis">
              {new Date(`${point.date}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricCard({ label, value, unit, icon, tone, helper }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}><Icon name={icon} size={17} /></span>
      </div>
      <div className="metric-number">{value}<span>{unit}</span></div>
      <div className="metric-helper">{helper}</div>
    </article>
  );
}

function DashboardOverview({ forecast, current, chartPoints, city, setCity, onSearch, forecastLoading, onUpload }) {
  const days = forecast?.daily || [];
  const totals = days.reduce(
    (result, day) => {
      const type = weatherType(day.weather_code);
      if (type === "clear") result.clear += 1;
      else if (type === "rain" || type === "storm") result.rain += 1;
      else result.cloudy += 1;
      return result;
    },
    { clear: 0, cloudy: 0, rain: 0 },
  );
  const share = (count) => (days.length ? Math.round((count / days.length) * 100) : null);
  const location = forecast?.location;
  const condition = current ? weatherLabel(current.weather_code)[0] : null;

  return (
    <section className={`dashboard-overview${forecast ? " has-forecast" : ""}`} aria-label="Weather dashboard">
      <div className="dashboard-title">
        <div>
          <span className="dashboard-eyebrow">WEATHER WORKSPACE</span>
          <h1>Weather <span>Data Analyzer</span></h1>
          <p>Explore current conditions and the forecast for a location.</p>
        </div>
        <div className="dashboard-actions">
          <form className="city-search dashboard-city-search" onSubmit={onSearch}>
            <Icon name="search" size={17} />
            <input aria-label="Search city or location" placeholder="Search city or location..." value={city} onChange={(event) => setCity(event.target.value)} />
            <button type="submit" disabled={forecastLoading} aria-label="Search weather">
              {forecastLoading ? <span className="spinner small" /> : <Icon name="arrow" size={17} />}
            </button>
          </form>
          <button className="upload-button dashboard-upload" onClick={onUpload}>
            <Icon name="upload" size={16} /> Import CSV
          </button>
        </div>
      </div>

      {forecast ? (
        <div className="dashboard-location-line">
          <span><Icon name="pin" size={16} /> {location.name}{location.country ? `, ${location.country}` : ""}</span>
          <span className="dashboard-live"><i /> Live forecast</span>
        </div>
      ) : (
        <div className="dashboard-search-card">
          <WeatherVisual code={1} />
          <div>
            <strong>Start with a location</strong>
            <p>Search a city above to load live conditions and forecast insights. Values stay empty until real data is available.</p>
          </div>
        </div>
      )}

      <div className="dashboard-metrics">
        <MetricCard
          label="Current temperature"
          value={current ? Math.round(current.temperature_2m) : "—"}
          unit={current ? "°C" : ""}
          icon="sun"
          tone="orange"
          helper={condition || "Search a location"}
        />
        <MetricCard
          label="Humidity"
          value={current ? current.relative_humidity_2m : "—"}
          unit={current ? "%" : ""}
          icon="drop"
          tone="blue"
          helper={current ? "Current relative humidity" : "No live reading"}
        />
        <MetricCard
          label="Wind speed"
          value={current ? current.wind_speed_10m : "—"}
          unit={current ? "km/h" : ""}
          icon="wind"
          tone="teal"
          helper={current ? "At the selected location" : "No live reading"}
        />
        <MetricCard
          label="Today's high / low"
          value={forecast?.daily[0] ? `${Math.round(forecast.daily[0].temperature_2m_max)}° / ${Math.round(forecast.daily[0].temperature_2m_min)}°` : "—"}
          unit=""
          icon="sun"
          tone="green"
          helper="Forecast temperature"
        />
      </div>

      <div className="dashboard-main-grid">
        <article className="dashboard-panel trends-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-icon"><Icon name="chart" size={17} /></span><div><h2>Weather trends</h2><p>Daily average temperature</p></div></div>
            {forecast && <span className="dashboard-period">{days.length} days</span>}
          </div>
          {forecast ? (
            <TemperatureChart points={chartPoints} />
          ) : (
            <EmptyState icon="chart" title="No trend data yet" description="Search a city to see forecast temperatures here." />
          )}
        </article>

        <article className="dashboard-panel location-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-icon pin"><Icon name="pin" size={17} /></span><div><h2>Location overview</h2><p>{location ? "Current conditions at this location" : "Location details appear after a search"}</p></div></div>
          </div>
          {forecast ? (
            <div className="location-overview">
              <div className={`location-weather-art weather-art-${weatherType(current.weather_code)}`}>
                <WeatherVisual code={current.weather_code} />
                <span>{condition}</span>
              </div>
              <div className="location-facts">
                <div><span>Feels like</span><strong>{Math.round(current.apparent_temperature)}°C</strong></div>
                <div><span>Wind speed</span><strong>{current.wind_speed_10m} km/h</strong></div>
                <div><span>Humidity</span><strong>{current.relative_humidity_2m}%</strong></div>
                <div><span>Precipitation</span><strong>{current.precipitation} mm</strong></div>
              </div>
            </div>
          ) : (
            <EmptyState icon="pin" title="Choose a location" description="Search for a city to see its current weather details." />
          )}
        </article>
      </div>

      <div className="dashboard-bottom-grid">
        <article className="dashboard-panel insights-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-icon insight"><Icon name="sun" size={17} /></span><div><h2>Weather insights</h2><p>Based on the forecast shown</p></div></div>
          </div>
          {forecast ? (
            <div className="insight-list">
              <div className="insight-row"><WeatherVisual code={current.weather_code} compact /><div><strong>{condition} conditions</strong><span>Current conditions in {location.name}.</span></div></div>
              <div className="insight-row"><span className="insight-symbol temperature"><Icon name="sun" size={17} /></span><div><strong>Daily temperature range</strong><span>{Math.round(days[0].temperature_2m_min)}° to {Math.round(days[0].temperature_2m_max)}°C today.</span></div></div>
              <div className="insight-row"><span className="insight-symbol rain"><Icon name="drop" size={16} /></span><div><strong>Precipitation outlook</strong><span>{days[0].precipitation_sum} mm expected today.</span></div></div>
            </div>
          ) : (
            <EmptyState icon="sun" title="Insights need weather data" description="Search a city to see a concise summary of its forecast." />
          )}
        </article>

        <article className="dashboard-panel recent-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-icon recent"><Icon name="clock" size={17} /></span><div><h2>Upcoming forecast</h2><p>Daily outlook from the provider</p></div></div>
          </div>
          {forecast ? (
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead><tr><th>Date</th><th>Conditions</th><th>High / low</th><th>Rain</th></tr></thead>
                <tbody>{days.slice(0, 5).map((day) => (
                  <tr key={day.date}>
                    <td>{formatDay(day.date)}</td>
                    <td><span className="recent-condition"><WeatherVisual code={day.weather_code} compact />{weatherLabel(day.weather_code)[0]}</span></td>
                    <td>{Math.round(day.temperature_2m_max)}° / {Math.round(day.temperature_2m_min)}°</td>
                    <td>{day.precipitation_sum} mm</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="clock" title="No forecast to show" description="Upcoming days will appear here after you search a city." />
          )}
        </article>

        <article className="dashboard-panel stats-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-icon stats"><Icon name="grid" size={17} /></span><div><h2>Forecast mix</h2><p>Share of days in this forecast</p></div></div>
          </div>
          {forecast ? (
            <div className="forecast-mix">
              {[
                ["Clear", totals.clear, "clear"],
                ["Cloudy", totals.cloudy, "cloudy"],
                ["Rain / storm", totals.rain, "rain"],
              ].map(([label, count, type]) => (
                <div className="mix-row" key={label}>
                  <span>{label}</span><div className="mix-track"><i className={`mix-fill ${type}`} style={{ width: `${share(count)}%` }} /></div><strong>{share(count)}%</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="grid" title="No forecast statistics" description="The mix is calculated from real daily forecast conditions." />
          )}
        </article>
      </div>
    </section>
  );
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name={icon} size={21} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function Sidebar({ activePage, onPageChange, onUpload }) {
  const links = [
    { id: "overview", label: "Dashboard", icon: "grid" },
    { id: "forecast", label: "Live forecast", icon: "sun" },
    { id: "analysis", label: "Data analysis", icon: "chart" },
    { id: "upload", label: "CSV upload", icon: "upload" },
  ];
  return (
    <aside className="sidebar">
      <a className="brand" href="#overview" aria-label="Weather Data Analyzer" onClick={() => onPageChange("overview")}>
        <span className="brand-mark"><Icon name="sun" size={21} /></span>
        <span>weather<span className="brand-light">field</span></span>
      </a>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {links.map((link) => (
          <button
            className={`nav-link ${activePage === link.id ? "active" : ""}`}
            key={link.id}
            onClick={() => link.id === "upload" ? onUpload() : onPageChange(link.id)}
            aria-current={activePage === link.id || (link.id === "upload" && activePage === "analysis") ? "page" : undefined}
          >
            <Icon name={link.icon} size={18} />
            {link.label}
            {link.id === "upload" && <span className="nav-new">CSV</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="source-card">
          <span className="source-mark"><Icon name="check" size={15} /></span>
          <div><strong>Powered by Open-Meteo</strong><small>Free weather data · No API key</small></div>
        </div>
        <div className="sidebar-foot">WEATHER DATA ANALYZER <span>v1.0</span></div>
      </div>
    </aside>
  );
}

function App() {
  const [activePage, setActivePage] = useState("overview");
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [city, setCity] = useState("");
  const [forecastDays, setForecastDays] = useState("7");
  const [analysis, setAnalysis] = useState(null);
  const [analysisName, setAnalysisName] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const requestSequence = useRef(0);

  const current = forecast?.current;
  const currentCondition = weatherLabel(current?.weather_code);
  const analysisMetrics = analysis?.metrics;

  const chartPoints = useMemo(() => {
    if (analysis) {
      return analysis.daily_series.map((item) => ({
        date: item.date,
        temperature: item.average_temperature_c,
      }));
    }
    if (forecast) {
      return forecast.daily.map((item) => ({
        date: item.date,
        temperature: (item.temperature_2m_max + item.temperature_2m_min) / 2,
      }));
    }
    return [];
  }, [analysis, forecast]);

  async function loadForecast(event, daysOverride = forecastDays, navigateToForecast = true) {
    event?.preventDefault();
    const place = city.trim();
    if (!place) {
      setForecastError("Enter a city name to search for its forecast.");
      return;
    }
    const requestId = ++requestSequence.current;
    setForecastLoading(true);
    setForecastError("");
    try {
      const params = new URLSearchParams({ city: place, days: daysOverride });
      const result = await requestJson(`/api/weather/forecast?${params}`);
      if (requestId !== requestSequence.current) return;
      setForecast(result);
      setAnalysis(null);
      if (navigateToForecast) setActivePage("forecast");
    } catch (error) {
      if (requestId === requestSequence.current) setForecastError(error.message);
    } finally {
      if (requestId === requestSequence.current) setForecastLoading(false);
    }
  }

  async function analyzeFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setAnalysisError("Choose a CSV file. Other file formats are not supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAnalysisError("This file is larger than the 10 MB upload limit.");
      return;
    }
    const requestId = ++requestSequence.current;
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisName(file.name);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await requestJson("/api/analysis/csv", {
        method: "POST",
        body: formData,
      });
      if (requestId !== requestSequence.current) return;
      setAnalysis(result);
      setForecast(null);
      setActivePage("analysis");
    } catch (error) {
      if (requestId === requestSequence.current) setAnalysisError(error.message);
    } finally {
      if (requestId === requestSequence.current) {
        setAnalysisLoading(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    }
  }

  function onFileChange(event) {
    analyzeFile(event.target.files?.[0]);
  }

  const pageTitle =
    activePage === "analysis"
      ? "Data analysis"
      : activePage === "forecast"
        ? "Live forecast"
        : "Dashboard";

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onPageChange={setActivePage} onUpload={() => fileInput.current?.click()} />
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <span className="live-indicator"><i /> Weather data</span>
            <span className="topbar-divider" />
            <span className="avatar">W</span>
          </div>
        </header>

        <div className="content">
          <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={onFileChange} aria-label="Choose a weather CSV file" />

          {forecastError && (
            <div className="alert error-alert" role="alert">
              <span>{forecastError}</span>
              <button aria-label="Dismiss error" onClick={() => setForecastError("")}>×</button>
            </div>
          )}

          {activePage === "overview" && (
            <DashboardOverview
              forecast={forecast}
              current={current}
              chartPoints={chartPoints}
              city={city}
              setCity={setCity}
              onSearch={(event) => loadForecast(event, forecastDays, false)}
              forecastLoading={forecastLoading}
              onUpload={() => fileInput.current?.click()}
            />
          )}

          {activePage !== "overview" && <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR WEATHER, IN CONTEXT</div>
              <h1>A clearer view of <span>the weather.</span></h1>
              <p className="welcome-copy">Explore the forecast or turn your observations into useful insights.</p>
            </div>
            <form className="city-search" onSubmit={loadForecast}>
              <Icon name="pin" size={18} />
              <input
                aria-label="City for weather forecast"
                placeholder="Search any city..."
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              <button type="submit" disabled={forecastLoading} aria-label="Search forecast">
                {forecastLoading ? <span className="spinner small" /> : <Icon name="arrow" size={17} />}
              </button>
            </form>
          </section>}

          {activePage !== "overview" && <nav className="page-tabs" aria-label="Dashboard views">
            {[
              ["overview", "Overview"],
              ["forecast", "Live forecast"],
              ["analysis", "CSV analysis"],
            ].map(([id, label]) => (
              <button
                type="button"
                aria-current={activePage === id ? "page" : undefined}
                className={`page-tab ${activePage === id ? "selected" : ""}`}
                key={id}
                onClick={() => setActivePage(id)}
              >
                {label}
              </button>
            ))}
            <span className="tab-spacer" />
            <span className="updated-note"><Icon name="clock" size={14} /> {forecast ? `Updated ${formatClock(current?.time)}` : "Ready when you are"}</span>
          </nav>}

          {activePage === "forecast" && (
            <section className="weather-section" aria-label="Current weather and forecast">
              {forecast ? (
                <>
                  <div className="section-heading">
                    <div><span className="section-kicker">LIVE CONDITIONS</span><h2>{forecast.location.name || "Your location"}{forecast.location.country ? `, ${forecast.location.country}` : ""}</h2></div>
                    <span className="data-chip"><i /> LIVE FORECAST</span>
                  </div>
                  <div className="weather-hero">
                    <div className="weather-main">
                      <div className="weather-place"><Icon name="pin" size={15} /> CURRENT WEATHER</div>
                      <div className="big-temperature">{Math.round(current.temperature_2m)}<span>°</span></div>
                      <div className="weather-description">{currentCondition[1]} <span>{currentCondition[0]}</span></div>
                      <div className="feels-like">Feels like {Math.round(current.apparent_temperature)}°C</div>
                    </div>
                    <div className="weather-details">
                      <div className="weather-detail"><span className="detail-icon wind"><Icon name="wind" size={17} /></span><div><small>Wind speed</small><strong>{current.wind_speed_10m} <em>km/h</em></strong></div></div>
                      <div className="weather-detail"><span className="detail-icon humidity"><Icon name="drop" size={17} /></span><div><small>Humidity</small><strong>{current.relative_humidity_2m}<em>%</em></strong></div></div>
                      <div className="weather-detail"><span className="detail-icon rain"><Icon name="drop" size={17} /></span><div><small>Precipitation</small><strong>{current.precipitation}<em>mm</em></strong></div></div>
                      <div className="weather-detail"><span className="detail-icon sun"><Icon name="sun" size={17} /></span><div><small>High / low today</small><strong>{forecast.daily[0]?.temperature_2m_max}° <em>/ {forecast.daily[0]?.temperature_2m_min}°</em></strong></div></div>
                    </div>
                    <div className={`weather-art weather-art-${weatherType(current.weather_code)}`}>
                      <div className="weather-orbit orbit-one" />
                      <div className="weather-orbit orbit-two" />
                      <WeatherVisual code={current.weather_code} />
                      <i />
                    </div>
                  </div>
                  <div className="section-heading forecast-heading">
                    <div><span className="section-kicker">A LITTLE LOOK AHEAD</span><h2>Coming up</h2></div>
                    <label className="days-selector">Next
                      <select value={forecastDays} onChange={(event) => { setForecastDays(event.target.value); loadForecast(undefined, event.target.value); }}>
                        <option value="5">5 days</option><option value="7">7 days</option><option value="10">10 days</option><option value="14">14 days</option><option value="16">16 days</option>
                      </select>
                    </label>
                  </div>
                  <div className="forecast-grid">
                    {forecast.daily.map((day) => {
                      return <article className="forecast-card" key={day.date}>
                        <span className="forecast-day">{formatDay(day.date)}</span>
                        <WeatherVisual code={day.weather_code} compact />
                        <div className="forecast-range"><strong>{Math.round(day.temperature_2m_max)}°</strong><span>{Math.round(day.temperature_2m_min)}°</span></div>
                        <div className="forecast-rain"><Icon name="drop" size={13} /> {day.precipitation_sum} mm</div>
                      </article>;
                    })}
                  </div>
                </>
              ) : (
                <div className="welcome-weather">
                  <div className="welcome-weather-copy">
                    <span className="section-kicker">LOCAL FORECAST</span>
                    <h2>What’s it like<br />outside?</h2>
                    <p>Search a city to see current conditions, feels-like temperature, humidity, and the days ahead.</p>
                    <form className="inline-search" onSubmit={loadForecast}>
                      <Icon name="search" size={17} />
                      <input aria-label="Search forecast city" placeholder="Try London, Tokyo, or Nairobi" value={city} onChange={(event) => setCity(event.target.value)} />
                      <button type="submit" disabled={forecastLoading}>{forecastLoading ? <span className="spinner small" /> : "Get forecast"}</button>
                    </form>
                  </div>
                  <div className="welcome-sky" aria-hidden="true"><div className="sky-sun" /><div className="sky-cloud cloud-one" /><div className="sky-cloud cloud-two" /><div className="sky-hill hill-one" /><div className="sky-hill hill-two" /><span>LIVE<br />WEATHER</span></div>
                </div>
              )}
            </section>
          )}

          {activePage === "analysis" && (
            <section className="analysis-section" aria-label="CSV weather analysis">
              <div className="section-heading analysis-heading">
                <div><span className="section-kicker">YOUR OWN OBSERVATIONS</span><h2>Weather insights</h2><p className="section-description">A fresh perspective on the data you’ve collected.</p></div>
                <button className="upload-button" onClick={() => fileInput.current?.click()} disabled={analysisLoading}>
                  {analysisLoading ? <><span className="spinner small" /> Analyzing</> : <><Icon name="upload" size={17} /> Upload CSV</>}
                </button>
              </div>

              {analysisError && <div className="alert error-alert compact" role="alert"><span>{analysisError}</span><button aria-label="Dismiss error" onClick={() => setAnalysisError("")}>×</button></div>}

              {analysis ? (
                <>
                  <div className="result-banner"><span className="result-check"><Icon name="check" size={16} /></span><span><strong>{analysisName}</strong> analyzed successfully</span><span className="result-count">{analysis.observation_count.toLocaleString()} observations</span></div>
                  <div className="metrics-grid">
                    <MetricCard label="Avg. temperature" value={analysisMetrics.temperature_c?.average ?? "—"} unit="°C" icon="sun" tone="orange" helper={`Range ${analysisMetrics.temperature_c?.minimum ?? "—"}° to ${analysisMetrics.temperature_c?.maximum ?? "—"}°`} />
                    <MetricCard label="Avg. humidity" value={analysisMetrics.humidity_pct?.average ?? "—"} unit="%" icon="drop" tone="blue" helper="Across recorded observations" />
                    <MetricCard label="Total rainfall" value={analysisMetrics.rainfall_mm?.total ?? "—"} unit="mm" icon="drop" tone="teal" helper={`${analysis.date_range.start} — ${analysis.date_range.end}`} />
                    <MetricCard label="Temperature trend" value={analysis.temperature_trend.direction} unit="" icon="chart" tone="green" helper={`${analysis.temperature_trend.change_c > 0 ? "+" : ""}${analysis.temperature_trend.change_c}°C over this period`} />
                  </div>
                  <div className="data-panels">
                    <article className="panel trend-panel">
                      <div className="panel-heading"><div><h3>Temperature over time</h3><span>Daily average · °C</span></div><span className={`trend-pill ${analysis.temperature_trend.direction}`}>{analysis.temperature_trend.direction === "increasing" ? "↗" : analysis.temperature_trend.direction === "decreasing" ? "↘" : "→"} {analysis.temperature_trend.direction}</span></div>
                      <TemperatureChart points={chartPoints} />
                    </article>
                    <article className="panel location-panel">
                      <div className="panel-heading"><div><h3>By location</h3><span>Weather at a glance</span></div></div>
                      {analysis.location_comparison.length ? (
                        <div className="location-table-wrap"><table className="location-table"><thead><tr><th>LOCATION</th><th>AVG TEMP</th><th>RAIN</th></tr></thead><tbody>
                          {analysis.location_comparison.map((location) => <tr key={location.location}><td><span className="table-pin"><Icon name="pin" size={13} /></span>{location.location}</td><td>{location.average_temperature_c}°</td><td>{location.total_rainfall_mm} mm</td></tr>)}
                        </tbody></table></div>
                      ) : <EmptyState icon="pin" title="No locations in this file" description="Add a location or city column to compare places." />}
                    </article>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`upload-dropzone ${dragging ? "dragging" : ""} ${analysisLoading ? "busy" : ""}`}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                    onDrop={(event) => { event.preventDefault(); setDragging(false); analyzeFile(event.dataTransfer.files?.[0]); }}
                  >
                    <span className="upload-illustration"><Icon name="upload" size={23} /></span>
                    <div className="drop-copy"><strong>Drop your weather data here</strong><span>or <button onClick={() => fileInput.current?.click()} type="button">browse files</button> from your computer</span></div>
                    <span className="file-format">CSV <i>·</i> UP TO 10 MB</span>
                  </div>
                  <div className="empty-panels">
                    <article className="panel empty-panel"><div className="panel-heading"><div><h3>Temperature trend</h3><span>Your daily averages, at a glance</span></div><span className="muted-mini">°C</span></div><EmptyState icon="chart" title="No data to chart yet" description="Upload a CSV with date and temperature columns to see your trend." /></article>
                    <article className="panel empty-panel"><div className="panel-heading"><div><h3>Weather metrics</h3><span>Your observations, summarized</span></div><span className="muted-mini">3 METRICS</span></div><EmptyState icon="grid" title="Your summary will appear here" description="Average temperature, humidity, and rainfall from your data." /></article>
                  </div>
                </>
              )}
            </section>
          )}

          <footer className="page-footer"><span>Thoughtful forecasts. <b>Clearer decisions.</b></span><span>Weather data from Open-Meteo · Forecasts are estimates</span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
