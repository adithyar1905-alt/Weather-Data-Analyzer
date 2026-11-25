import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Cloud,
  CloudRain,
  CloudSun,
  Cloudy,
  Compass,
  Download,
  Droplets,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Thermometer,
  Upload,
  Wind,
  X,
} from "lucide-react";

const TrendChart = lazy(() => import("./WeatherCharts.jsx").then((module) => ({ default: module.TrendChart })));
const RainfallChart = lazy(() => import("./WeatherCharts.jsx").then((module) => ({ default: module.RainfallChart })));
const WindChart = lazy(() => import("./WeatherCharts.jsx").then((module) => ({ default: module.WindChart })));
const CircularStat = lazy(() => import("./WeatherCharts.jsx").then((module) => ({ default: module.CircularStat })));

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const SAMPLE_TEMPERATURES = [28.4, 29.1, 28.7, 30.2, 31.1, 29.8, 28.9];
const SAMPLE_HUMIDITY = [68, 64, 66, 61, 58, 63, 65];
const SAMPLE_WIND = [8, 11, 9, 12, 14, 10, 9];
const SAMPLE_RAIN = [0, 0.4, 0, 1.2, 0, 0, 0.2];
const SAMPLE_CODES = [1, 2, 2, 3, 1, 2, 1];
const PALETTE = {
  mint: "#6da88a",
  orange: "#e89a5d",
  lavender: "#a99acb",
  teal: "#70aaa4",
  yellow: "#e4bd67",
  rose: "#d78576",
  ink: "#26352f",
  muted: "#8a938d",
  grid: "#eceeea",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "forecast", label: "Live forecast", Icon: CloudSun },
  { id: "analysis", label: "Data analysis", Icon: ChartNoAxesCombined },
  { id: "trends", label: "Trends & insights", Icon: Activity },
  { id: "upload", label: "CSV upload", Icon: Upload },
  { id: "history", label: "Historical weather", Icon: History },
  { id: "reports", label: "Reports", Icon: FileText },
  { id: "settings", label: "Settings", Icon: Settings },
];

const WEATHER_CODES = {
  0: ["Clear sky", "sunny"],
  1: ["Mostly clear", "sunny"],
  2: ["Partly cloudy", "cloudy"],
  3: ["Overcast", "cloudy"],
  45: ["Foggy", "cloudy"],
  48: ["Rime fog", "cloudy"],
  51: ["Light drizzle", "rain"],
  53: ["Drizzle", "rain"],
  55: ["Heavy drizzle", "rain"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  71: ["Light snow", "cloudy"],
  73: ["Snow", "cloudy"],
  75: ["Heavy snow", "cloudy"],
  77: ["Snow grains", "cloudy"],
  80: ["Rain showers", "rain"],
  81: ["Showers", "rain"],
  82: ["Heavy showers", "rain"],
  85: ["Snow showers", "cloudy"],
  86: ["Heavy snow showers", "cloudy"],
  95: ["Thunderstorm", "rain"],
  96: ["Thunderstorm with hail", "rain"],
  99: ["Thunderstorm with heavy hail", "rain"],
};

const NAV_TITLES = Object.fromEntries(NAV_ITEMS.map(({ id, label }) => [id, label]));
const DEMO_LOCATION = {
  name: "Ballari",
  country: "India",
  latitude: 15.1394,
  longitude: 76.9214,
  timezone: "Asia/Kolkata",
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value, options = { month: "short", day: "numeric" }) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en", options);
}

function weatherLabel(code) {
  return WEATHER_CODES[code] || ["Conditions", "cloudy"];
}

function weatherType(code) {
  return weatherLabel(code)[1];
}

function makeSampleRows() {
  const today = new Date();
  return SAMPLE_TEMPERATURES.map((temperature, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (SAMPLE_TEMPERATURES.length - 1 - index));
    const code = SAMPLE_CODES[index];
    return {
      date: localDate(date),
      city: DEMO_LOCATION.name,
      temperature: Number(temperature.toFixed(1)),
      humidity: SAMPLE_HUMIDITY[index],
      wind: SAMPLE_WIND[index],
      rainfall: SAMPLE_RAIN[index],
      code,
      condition: weatherLabel(code)[0],
    };
  });
}

const DEMO_ROWS = makeSampleRows();

function forecastRows(forecast) {
  return forecast.daily.map((day) => ({
    date: day.date,
    city: forecast.location.name || "Selected location",
    temperature: Number(((day.temperature_2m_max + day.temperature_2m_min) / 2).toFixed(1)),
    humidity: day.relative_humidity_2m_mean,
    wind: day.wind_speed_10m_max,
    rainfall: day.precipitation_sum,
    code: day.weather_code,
    condition: weatherLabel(day.weather_code)[0],
  }));
}

function aggregateMonthlyRows(rows) {
  const months = new Map();
  rows.forEach((row) => {
    const month = row.date.slice(0, 7);
    const aggregate = months.get(month) || {
      date: `${month}-01`,
      city: row.city,
      temperature: 0,
      humidity: 0,
      wind: 0,
      rainfall: 0,
      count: 0,
    };
    aggregate.temperature += Number(row.temperature || 0);
    aggregate.humidity += Number(row.humidity || 0);
    aggregate.wind += Number(row.wind || 0);
    aggregate.rainfall += Number(row.rainfall || 0);
    aggregate.count += 1;
    months.set(month, aggregate);
  });
  return [...months.values()].map((month) => ({
    ...month,
    temperature: Number((month.temperature / month.count).toFixed(1)),
    humidity: Math.round(month.humidity / month.count),
    wind: Number((month.wind / month.count).toFixed(1)),
    rainfall: Number(month.rainfall.toFixed(1)),
  }));
}

function asTemperature(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const converted = unit === "°F" ? Number(value) * 9 / 5 + 32 : Number(value);
  return `${Math.round(converted)}°`;
}

function exportCsv(filename, rows) {
  if (!rows.length) return;
  const csv = Papa.unparse(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizedKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sampleHistory(period) {
  if (period === "7D") {
    return DEMO_ROWS.map((row) => ({
      ...row,
      label: displayDate(row.date),
      average: row.temperature,
    }));
  }
  if (period === "30D") {
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const seasonal = Math.sin((index / 29) * Math.PI * 2) * 2.4;
      const ripple = Math.sin(index * 1.63) * 1.25;
      return {
        date: localDate(date),
        label: index % 4 === 0 ? displayDate(localDate(date)) : "",
        average: Number((28.3 + seasonal + ripple).toFixed(1)),
        humidity: Math.round(63 + Math.cos(index * .48) * 9),
        wind: Number((10 + Math.sin(index * .66) * 3.2).toFixed(1)),
        rainfall: Number(Math.max(0, Math.sin(index * 1.21) * 1.4 - .4).toFixed(1)),
      };
    });
  }
  return Array.from({ length: 12 }, (_, index) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return {
      date: localDate(date),
      label: date.toLocaleDateString("en", { month: "short" }),
      average: Number((27.2 + Math.sin((index / 11) * Math.PI * 2) * 3 + Math.sin(index * .8) * .8).toFixed(1)),
      humidity: Math.round(65 + Math.cos((index / 11) * Math.PI * 2) * 11),
      wind: Number((10 + Math.sin(index * .9) * 3).toFixed(1)),
      rainfall: Number(Math.max(0, 2 + Math.sin(index * 1.1) * 2.3).toFixed(1)),
    };
  });
}

async function fetchForecast(city, days) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/weather/forecast?${new URLSearchParams({ city, days })}`);
  } catch {
    throw new Error(`Could not connect to the weather service at ${API_BASE}.`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail || "Forecast request failed.");
  }
  return payload;
}

async function fetchWeatherHistory(city, days = 365) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/weather/history?${new URLSearchParams({ city, days })}`);
  } catch {
    throw new Error(`Could not connect to the weather service at ${API_BASE}.`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail || "Historical weather request failed.");
  }
  return payload;
}

async function analyzeCsvFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  let response;
  try {
    response = await fetch(`${API_BASE}/api/analysis/csv`, { method: "POST", body: formData });
  } catch {
    throw new Error(`Could not connect to the analysis service at ${API_BASE}.`);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail || "CSV analysis failed.");
  }
  return payload;
}

function MetricTile({ title, value, unit, hint, Icon, tone }) {
  return (
    <article className={`metric-tile tone-${tone}`}>
      <div className="metric-tile-top">
        <span>{title}</span>
        <span className="metric-icon"><Icon size={18} strokeWidth={1.8} /></span>
      </div>
      <strong>{value}<small>{unit}</small></strong>
      <span className="metric-hint">{hint}</span>
    </article>
  );
}

function PanelHeading({ Icon, title, caption, action }) {
  return (
    <div className="panel-heading">
      <div className="panel-heading-main">
        <span className="panel-icon"><Icon size={17} strokeWidth={1.8} /></span>
        <div><h2>{title}</h2>{caption && <p>{caption}</p>}</div>
      </div>
      {action}
    </div>
  );
}

function WeatherCardArt({ code, large = false }) {
  const kind = weatherType(code);
  const Icon = kind === "sunny" ? Sun : kind === "rain" ? CloudRain : Cloudy;
  return (
    <div className={`weather-art weather-art-${kind}${large ? " large" : ""}`}>
      {kind === "sunny" && <span className="art-glow" />}
      <Icon className="weather-art-icon" size={large ? 72 : 32} strokeWidth={1.3} />
      {kind === "rain" && <span className="art-rain">···</span>}
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, detail }) {
  return <div className="panel-empty"><span><Icon size={19} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

function Sidebar({ page, setPage, onUpload }) {
  return (
    <aside className="app-sidebar">
      <a className="app-brand flex items-center" href="#dashboard" onClick={(event) => { event.preventDefault(); setPage("dashboard"); }}>
        <span className="brand-symbol"><CloudSun size={25} strokeWidth={1.7} /></span>
        <span>Weather Data <b>Analyzer</b></span>
      </a>
      <span className="sidebar-label">WORKSPACE</span>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            type="button"
            className={`sidebar-link ${page === id || (id === "upload" && page === "analysis") ? "active" : ""}`}
            key={id}
            onClick={() => id === "upload" ? onUpload() : setPage(id)}
            aria-current={page === id ? "page" : undefined}
          >
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            {id === "upload" && <span className="nav-shortcut">CSV</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-lower">
        <div className="provider-card">
          <span><Check size={15} /></span>
          <div><strong>Open-Meteo data</strong><small>Live · No API key needed</small></div>
        </div>
        <div className="profile-card">
          <span className="profile-avatar">WA</span>
          <div><strong>Weather Analyst</strong><small>Workspace member</small></div>
          <ChevronDown size={15} />
        </div>
      </div>
    </aside>
  );
}

function DataTable({ rows, unit, onExport, title = "Recent weather data", filters = true }) {
  const [query, setQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const filtered = useMemo(() => rows
    .filter((row) => `${row.date} ${row.city} ${row.condition}`.toLowerCase().includes(query.toLowerCase()))
    .filter((row) => conditionFilter === "all" || (conditionFilter === "rain" ? weatherType(row.code) === "rain" : weatherType(row.code) === conditionFilter))
    .sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const compare = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
      return sortDirection === "asc" ? compare : -compare;
    }), [rows, query, conditionFilter, sortKey, sortDirection]);
  function changeSort(key) {
    setSortDirection(sortKey === key && sortDirection === "asc" ? "desc" : "asc");
    setSortKey(key);
  }
  return (
    <section className="surface-card table-panel">
      <PanelHeading Icon={CalendarDays} title={title} caption={`${filtered.length} records · ${rows === DEMO_ROWS ? "Illustrative sample" : "Available observations"}`} action={<button className="button button-outline" onClick={onExport}><Download size={15} /> Export CSV</button>} />
      {filters && (
        <div className="table-controls">
          <label className="table-search"><Search size={15} /><input placeholder="Search date, city or condition" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="filter-select"><SlidersHorizontal size={14} /><select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}><option value="all">All conditions</option><option value="sunny">Sunny</option><option value="cloudy">Cloudy</option><option value="rain">Rainy</option></select></label>
        </div>
      )}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr>
            {[
              ["date", "Date"], ["city", "City"], ["temperature", "Temperature"], ["humidity", "Humidity"],
              ["wind", "Wind speed"], ["rainfall", "Rainfall"], ["condition", "Condition"],
            ].map(([key, label]) => <th key={key}><button onClick={() => changeSort(key)}>{label}{sortKey === key && <span>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}</button></th>)}
          </tr></thead>
          <tbody>{filtered.map((row) => {
            const Icon = weatherType(row.code) === "sunny" ? Sun : weatherType(row.code) === "rain" ? CloudRain : Cloudy;
            return <tr key={`${row.date}-${row.city}`}>
              <td>{displayDate(row.date, { year: "numeric", month: "short", day: "numeric" })}</td>
              <td>{row.city}</td>
              <td>{asTemperature(row.temperature, unit)}</td>
              <td>{row.humidity == null ? "—" : `${row.humidity}%`}</td>
              <td>{row.wind == null ? "—" : `${row.wind} km/h`}</td>
              <td>{row.rainfall == null ? "—" : `${row.rainfall} mm`}</td>
              <td><span className={`condition-pill ${weatherType(row.code)}`}><Icon size={13} />{row.condition}</span></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length && <div className="table-no-results">No weather records match those filters.</div>}
      </div>
    </section>
  );
}

function EnterpriseDashboard() {
  const [page, setPage] = useState("dashboard");
  const [forecast, setForecast] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("°C");
  const [period, setPeriod] = useState("7D");
  const [chartMetric, setChartMetric] = useState("temperature");
  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInput = useRef(null);

  const activeRows = useMemo(() => forecast ? forecastRows(forecast) : DEMO_ROWS, [forecast]);
  const historyRows = useMemo(() => history ? forecastRows(history) : [], [history]);
  const needsHistory = page === "history" || (["dashboard", "trends"].includes(page) && period !== "7D");
  const activeLocationName = forecast?.location?.name || DEMO_LOCATION.name;

  useEffect(() => {
    if (!needsHistory || history?.location?.name === activeLocationName) return undefined;
    let active = true;
    setHistoryLoading(true);
    setHistoryError("");
    fetchWeatherHistory(activeLocationName)
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((requestError) => {
        if (active) {
          setHistory(null);
          setHistoryError(requestError.message);
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [needsHistory, activeLocationName, history?.location?.name]);
  const current = forecast?.current || {
    temperature_2m: 28.7,
    relative_humidity_2m: 65,
    wind_speed_10m: 10,
    pressure_msl: 1008.4,
    apparent_temperature: 32,
    precipitation: 0,
    weather_code: 1,
  };
  const currentDaily = forecast?.daily[0] || {
    temperature_2m_max: 31.9,
    temperature_2m_min: 23.4,
    precipitation_sum: 0,
    weather_code: 1,
  };
  const location = forecast?.location || DEMO_LOCATION;
  const currentCondition = weatherLabel(current.weather_code);
  const demoMode = !forecast;
  const analysisMetrics = analysis?.metrics;

  const periodRows = useMemo(() => {
    if (period === "7D") return forecast ? activeRows : sampleHistory(period);
    if (historyRows.length) {
      const periodLength = period === "30D" ? 30 : 365;
      const selectedRows = historyRows.slice(-periodLength);
      const chartRows = period === "1Y" ? aggregateMonthlyRows(selectedRows) : selectedRows;
      return chartRows.map((row) => ({
        ...row,
        label: period === "1Y" ? displayDate(row.date, { month: "short", year: "2-digit" }) : displayDate(row.date),
        average: row.temperature,
      }));
    }
    return sampleHistory(period);
  }, [period, forecast, activeRows, historyRows]);
  const forecastMix = useMemo(() => {
    const sunny = activeRows.filter((row) => weatherType(row.code) === "sunny").length;
    const rainy = activeRows.filter((row) => weatherType(row.code) === "rain").length;
    const cloudy = Math.max(0, activeRows.length - sunny - rainy);
    return [
      { label: "Sunny days", value: Math.round(sunny / activeRows.length * 100), color: PALETTE.orange },
      { label: "Cloudy days", value: Math.round(cloudy / activeRows.length * 100), color: PALETTE.lavender },
      { label: "Rainy days", value: Math.round(rainy / activeRows.length * 100), color: PALETTE.teal },
    ];
  }, [activeRows]);

  async function searchWeather(event) {
    event?.preventDefault();
    const searchTerm = city.trim();
    if (!searchTerm) {
      setError("Enter a city name to load its live weather.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await fetchForecast(searchTerm, 16);
      setForecast(result);
      setPeriod("7D");
      setPage("dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function processCsv(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Choose a CSV file. Other formats are not supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCsvError("This file exceeds the 10 MB upload limit.");
      return;
    }
    setCsvFile(file);
    setCsvError("");
    setAnalysisLoading(true);
    setPage("analysis");
    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", dynamicTyping: false });
      if (parsed.errors.length) throw new Error(parsed.errors[0].message);
      if (!parsed.meta.fields?.length || !parsed.data.length) throw new Error("CSV must have a header and at least one data row.");
      setCsvColumns(parsed.meta.fields);
      setCsvRows(parsed.data);
      const result = await analyzeCsvFile(file);
      setAnalysis(result);
    } catch (parseError) {
      setAnalysis(null);
      setCsvError(parseError.message);
    } finally {
      setAnalysisLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const missingCells = useMemo(() => {
    if (!csvColumns.length) return 0;
    return csvRows.reduce((count, row) => count + csvColumns.filter((column) => !String(row[column] ?? "").trim()).length, 0);
  }, [csvColumns, csvRows]);

  async function cleanAndAnalyze() {
    const keyByType = {
      date: ["date", "datetime", "timestamp", "time", "observationdate"],
      temperature: ["temperature", "temperaturec", "tempc", "temp", "tempcelsius", "meantemperature"],
      humidity: ["humidity", "humiditypct", "relativehumidity"],
      rainfall: ["rainfall", "rain", "precipitation", "precipitationmm"],
    };
    const columnFor = (type) => csvColumns.find((column) => keyByType[type].includes(normalizedKey(column)));
    const dateColumn = columnFor("date");
    const temperatureColumn = columnFor("temperature");
    const humidityColumn = columnFor("humidity");
    const rainfallColumn = columnFor("rainfall");
    if (!dateColumn || !temperatureColumn) {
      setCsvError("Cleaning needs recognizable date and temperature columns.");
      return;
    }
    const cleaned = csvRows.filter((row) => {
      const rawDate = String(row[dateColumn] ?? "").trim();
      const temperature = Number(row[temperatureColumn]);
      if (!rawDate || Number.isNaN(Date.parse(rawDate)) || !Number.isFinite(temperature)) return false;
      if (humidityColumn && String(row[humidityColumn] ?? "").trim()) {
        const humidity = Number(row[humidityColumn]);
        if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) return false;
      }
      if (rainfallColumn && String(row[rainfallColumn] ?? "").trim()) {
        const rainfall = Number(row[rainfallColumn]);
        if (!Number.isFinite(rainfall) || rainfall < 0) return false;
      }
      return true;
    });
    if (!cleaned.length) {
      setCsvError("No valid rows remain after removing invalid dates and measurements.");
      return;
    }
    const cleanedFile = new File([Papa.unparse(cleaned, { columns: csvColumns })], `cleaned-${csvFile?.name || "weather.csv"}`, { type: "text/csv" });
    setCsvRows(cleaned);
    setCsvFile(cleanedFile);
    setCsvError("");
    setAnalysisLoading(true);
    try {
      const result = await analyzeCsvFile(cleanedFile);
      setAnalysis(result);
    } catch (cleanError) {
      setCsvError(cleanError.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function downloadAnalysis() {
    if (!analysis) return;
    exportCsv("weather-analysis-daily.csv", analysis.daily_series.map((item) => ({
      date: item.date,
      average_temperature_c: item.average_temperature_c,
      average_humidity_pct: item.average_humidity_pct ?? "",
      rainfall_mm: item.rainfall_mm,
    })));
  }

  function clickUpload() {
    fileInput.current?.click();
    setPage("analysis");
    setMobileNavOpen(false);
  }

  function selectPage(id) {
    setPage(id);
    setMobileNavOpen(false);
  }

  const temperature = (value) => {
    const converted = unit === "°F" ? Number(value) * 9 / 5 + 32 : Number(value);
    return `${converted.toFixed(1)}${unit}`;
  };

  const chartRows = useMemo(() => periodRows.map((row) => ({
    ...row,
    label: row.label || displayDate(row.date),
  })), [periodRows]);

  const missingByColumn = useMemo(() => csvColumns.map((column) => ({
    column,
    missing: csvRows.filter((row) => !String(row[column] ?? "").trim()).length,
  })), [csvColumns, csvRows]);

  const insights = useMemo(() => {
    const todayHigh = Number(currentDaily.temperature_2m_max);
    const low = Number(currentDaily.temperature_2m_min);
    const wetDays = activeRows.filter((row) => Number(row.rainfall) > 0).length;
    return [
      { Icon: Thermometer, tone: "orange", title: "Temperature outlook", text: `Today's range is ${temperature(low)} to ${temperature(todayHigh)}.` },
      { Icon: CloudRain, tone: "teal", title: "Rainfall prediction", text: wetDays ? `${wetDays} of the next ${activeRows.length} days show precipitation.` : "No measurable rain is forecast in the selected outlook." },
      { Icon: Droplets, tone: "lavender", title: "Humidity changes", text: `Current relative humidity is ${current.relative_humidity_2m}%.` },
      { Icon: CircleAlert, tone: "yellow", title: "Weather alerts", text: [95, 96, 99].includes(current.weather_code) ? "Thunderstorm conditions are reported." : "No severe-weather code is reported right now." },
    ];
  }, [activeRows, current, currentDaily, unit]);

  return (
    <div className="weather-app">
      <Sidebar page={page} setPage={selectPage} onUpload={clickUpload} />
      <main className="weather-main">
        <header className="app-topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle navigation"><Menu size={19} /></button>
          <span className="breadcrumbs">Weather workspace <ChevronRight size={14} /> <strong>{NAV_TITLES[page]}</strong></span>
          <form className="top-search" onSubmit={searchWeather}>
            <Search size={16} />
            <input aria-label="Search a city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search city or location..." />
            <button type="submit" disabled={loading} aria-label="Search forecast">{loading ? <LoaderCircle className="spin" size={16} /> : <ArrowUpRight size={16} />}</button>
          </form>
          <div className="topbar-weather"><Sun size={17} /><strong>{asTemperature(current.temperature_2m, unit)}</strong><span>{location.name}</span></div>
          <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><i /></button>
          <span className="top-avatar">WA</span>
        </header>

        <div className="page-content">
          <input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => processCsv(event.target.files?.[0])} />
          {(error || csvError) && <div className="app-alert" role="alert"><CircleAlert size={17} /><span>{error || csvError}</span><button onClick={() => { setError(""); setCsvError(""); }} aria-label="Dismiss error"><X size={16} /></button></div>}

          {page === "dashboard" && (
            <DashboardView
              location={location}
              current={current}
              currentDaily={currentDaily}
              rows={activeRows}
              chartRows={chartRows}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              period={period}
              setPeriod={setPeriod}
              unit={unit}
              temperature={temperature}
              insights={insights}
              forecastMix={forecastMix}
              demoMode={demoMode}
              trendDemoMode={period === "7D" ? demoMode : !historyRows.length}
              onExport={() => exportCsv("weather-records.csv", activeRows)}
              onHistory={() => selectPage("history")}
              onInsights={() => selectPage("trends")}
            />
          )}

          {page === "forecast" && <ForecastView location={location} current={current} currentDaily={currentDaily} rows={activeRows} unit={unit} temperature={temperature} demoMode={demoMode} />}

          {page === "trends" && (
            <TrendsView
              rows={chartRows}
              unit={unit}
              period={period}
              setPeriod={setPeriod}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              rainfallRows={chartRows}
              demoMode={period === "7D" ? demoMode : !historyRows.length}
            />
          )}

          {page === "analysis" && (
            <AnalysisView
              file={csvFile}
              rows={csvRows}
              columns={csvColumns}
              metrics={analysisMetrics}
              observationCount={analysis?.observation_count}
              missingCells={missingCells}
              missingByColumn={missingByColumn}
              loading={analysisLoading}
              onUpload={clickUpload}
              onClean={cleanAndAnalyze}
              onDownload={downloadAnalysis}
              unit={unit}
            />
          )}

          {page === "history" && <HistoryView rows={historyRows.length ? historyRows : activeRows} unit={unit} demoMode={!historyRows.length} loading={historyLoading} error={historyError} onExport={() => exportCsv("historical-weather.csv", historyRows.length ? historyRows : activeRows)} />}

          {page === "reports" && <ReportsView rows={activeRows} location={location} insights={insights} demoMode={demoMode} onDownload={() => exportCsv("weather-report.csv", activeRows)} />}

          {page === "settings" && <SettingsView unit={unit} setUnit={setUnit} period={period} setPeriod={setPeriod} location={location} />}

          <footer className="app-footer"><span>Weather Data Analyzer <b>·</b> {forecast ? "Live data from Open-Meteo" : "Illustrative sample dataset"}</span><span>Weather data is informational and may change.</span></footer>
        </div>
      </main>
      {mobileNavOpen && <button className="mobile-nav-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
      <style>{mobileNavOpen ? ".app-sidebar { transform: translateX(0) !important; }" : ""}</style>
    </div>
  );
}

function DashboardView({ location, current, currentDaily, rows, chartRows, chartMetric, setChartMetric, period, setPeriod, unit, temperature, insights, forecastMix, demoMode, trendDemoMode, onExport, onHistory, onInsights }) {
  const city = location.name || "Selected location";
  const currentCondition = weatherLabel(current.weather_code);
  const trendRows = chartRows;
  const currentKey = chartMetric === "humidity" ? "humidity" : chartMetric === "wind" ? "wind" : "temperature";
  const keyName = chartMetric === "humidity" ? "Average humidity" : chartMetric === "wind" ? "Wind speed" : "Temperature";
  const average = rows.reduce((sum, row) => sum + Number(row.temperature || 0), 0) / rows.length;
  const meanHumidity = rows.reduce((sum, row) => sum + Number(row.humidity || 0), 0) / rows.length;
  const meanWind = rows.reduce((sum, row) => sum + Number(row.wind || 0), 0) / rows.length;
  const clearPercent = forecastMix.find((item) => item.label === "Sunny days")?.value || 0;

  return (
    <section className="dashboard-page">
      <div className="welcome-header">
        <div><span className="eyebrow">WEATHER INTELLIGENCE</span><h1>Weather Data Analyzer</h1><p>Explore conditions, uncover patterns, and make informed decisions.</p></div>
        <div className="welcome-actions">
          <span className={`dataset-badge ${demoMode ? "sample" : "live"}`}><i />{demoMode ? "Sample data" : "Live forecast"}</span>
          <span className="today-label"><CalendarDays size={15} /> {new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      <div className="current-summary">
        <div className="summary-location">
          <span className="summary-kicker"><MapPin size={14} /> CURRENT CONDITIONS</span>
          <h2>{city}<span>{location.country ? `, ${location.country}` : ""}</span></h2>
          <div className="summary-temp">{temperature(current.temperature_2m)}</div>
          <div className="summary-condition"><WeatherCardArt code={current.weather_code} /> <span>{currentCondition[0]}<small>Feels like {temperature(current.apparent_temperature)}</small></span></div>
        </div>
        <div className="summary-decoration"><WeatherCardArt code={current.weather_code} large /><span>{demoMode ? "A representative local-weather snapshot" : "Current conditions at your selected location"}</span></div>
        <div className="summary-side">
          <span className="summary-side-label">TODAY'S TEMPERATURE</span>
          <strong>{temperature(currentDaily.temperature_2m_max)} <small>High</small></strong>
          <div className="temperature-range"><i style={{ left: "24%", width: "57%" }} /></div>
          <strong>{temperature(currentDaily.temperature_2m_min)} <small>Low</small></strong>
          <span className="summary-updated"><RefreshCw size={13} /> {demoMode ? "Illustrative sample" : "Updated from live forecast"}</span>
        </div>
      </div>

      <div className="metric-grid">
        <MetricTile title="Average temperature" value={temperature(average)} unit="" hint={`${temperature(currentDaily.temperature_2m_min)} – ${temperature(currentDaily.temperature_2m_max)} today`} Icon={Thermometer} tone="orange" />
        <MetricTile title="Relative humidity" value={`${Math.round(current.relative_humidity_2m)}%`} unit="" hint={`Outlook average ${Math.round(meanHumidity)}%`} Icon={Droplets} tone="lavender" />
        <MetricTile title="Wind speed" value={`${Math.round(current.wind_speed_10m)}`} unit="km/h" hint={`Outlook average ${meanWind.toFixed(1)} km/h`} Icon={Wind} tone="mint" />
        <MetricTile title="Atmospheric pressure" value={`${Number(current.pressure_msl || 1008).toFixed(0)}`} unit="hPa" hint="Mean sea-level pressure" Icon={Gauge} tone="teal" />
      </div>

      <div className="dashboard-grid primary-grid">
        <article className="surface-card trend-card">
          <PanelHeading
            Icon={ChartNoAxesCombined}
            title="Weather trends"
            caption={`${keyName} · ${period === "7D" ? "daily forecast" : trendDemoMode ? "illustrative comparison" : "historical observations"}`}
            action={<div className="segmented-control">{["7D", "30D", "1Y"].map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>}
          />
          {period !== "7D" && trendDemoMode && <p className="sample-note">Historical archive unavailable; showing illustrative reference values.</p>}
          <Suspense fallback={<div className="chart-loading">Preparing interactive chart…</div>}>
            <TrendChart
              rows={trendRows.map((row) => ({ ...row, temperature: row.average ?? row.temperature }))}
              metric={currentKey}
              name={keyName}
              color={chartMetric === "humidity" ? PALETTE.lavender : chartMetric === "wind" ? PALETTE.mint : PALETTE.orange}
              unit={chartMetric === "humidity" ? "%" : chartMetric === "wind" ? " km/h" : unit}
              height={235}
              compact
            />
          </Suspense>
          <div className="chart-legend">
            {[["temperature", "Temperature", PALETTE.orange], ["humidity", "Humidity", PALETTE.lavender], ["wind", "Wind speed", PALETTE.mint]].map(([key, label, color]) => <button key={key} className={chartMetric === key ? "active" : ""} onClick={() => setChartMetric(key)}><i style={{ background: color }} />{label}</button>)}
          </div>
        </article>

        <article className="surface-card location-card">
          <PanelHeading Icon={Compass} title="Location overview" caption="Selected location and local conditions" action={<span className="location-country">{location.country || "Weather map"}</span>} />
          <div className="location-headline"><div><h3>{city}</h3><span>{location.country || "Local conditions"}</span></div><div className="location-temp">{temperature(current.temperature_2m)}</div></div>
          <div className="location-fact-list">
            <div><Sun size={15} /><span>Feels like</span><strong>{temperature(current.apparent_temperature)}</strong></div>
            <div><Wind size={15} /><span>Wind speed</span><strong>{current.wind_speed_10m} km/h</strong></div>
            <div><Droplets size={15} /><span>Humidity</span><strong>{current.relative_humidity_2m}%</strong></div>
            <div><Gauge size={15} /><span>Pressure</span><strong>{Number(current.pressure_msl || 1008).toFixed(0)} hPa</strong></div>
          </div>
          <div className="map-frame">
            <iframe title={`Map showing ${city}`} loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(location.longitude) - .22}%2C${Number(location.latitude) - .14}%2C${Number(location.longitude) + .22}%2C${Number(location.latitude) + .14}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`} />
            <a href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=10/${location.latitude}/${location.longitude}`} target="_blank" rel="noreferrer">Open map <ArrowUpRight size={12} /></a>
          </div>
        </article>
      </div>

      <div className="dashboard-grid secondary-grid">
        <article className="surface-card insights-card">
          <PanelHeading Icon={Sparkles} title="Weather insights" caption="Signals from the selected outlook" action={<span className="insight-count">{insights.length} insights</span>} />
          <div className="insight-stack">{insights.slice(0, 3).map(({ Icon, tone, title, text }) => <div className="insight-item" key={title}><span className={`insight-icon ${tone}`}><Icon size={16} /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div>
          <button className="text-action" onClick={onInsights}>See all insights <ChevronRight size={14} /></button>
        </article>

        <article className="surface-card recent-card">
          <PanelHeading Icon={CalendarDays} title="Recent weather data" caption="Daily observations and forecast" action={<button className="button button-light" onClick={onExport}><Download size={14} /> Export</button>} />
          <div className="recent-list">{rows.slice(0, 5).map((row) => {
            const Icon = weatherType(row.code) === "sunny" ? Sun : weatherType(row.code) === "rain" ? CloudRain : Cloudy;
            return <div className="recent-line" key={row.date}><span>{displayDate(row.date, { weekday: "short", month: "short", day: "numeric" })}</span><span className="recent-weather"><Icon size={15} />{row.condition}</span><strong>{asTemperature(row.temperature, unit)}</strong></div>;
          })}</div>
          <button className="text-action" onClick={onHistory}>View historical weather <ChevronRight size={14} /></button>
        </article>

        <article className="surface-card quick-stats-card">
          <PanelHeading Icon={BarChart3} title="Quick statistics" caption="Weather mix across the outlook" />
          <Suspense fallback={<div className="chart-loading">Preparing weather statistics…</div>}>
            <div className="quick-stats">{forecastMix.map((item, index) => <CircularStat key={item.label} label={item.label} percentage={item.value} color={item.color} Icon={[Sun, Cloudy, CloudRain][index]} />)}</div>
          </Suspense>
          <span className="stats-footnote">{demoMode ? "Based on the illustrative sample week" : `Based on ${rows.length} forecast days`}</span>
        </article>
      </div>
    </section>
  );
}

function ForecastView({ location, current, currentDaily, rows, unit, temperature, demoMode }) {
  return (
    <section className="subpage">
      <PageIntro eyebrow="LIVE CONDITIONS" title="Local forecast" description={`A clear look at current conditions and the days ahead for ${location.name || "your selected location"}.`} badge={demoMode ? "Sample data" : "Live forecast"} />
      <div className="forecast-hero surface-card">
        <div><span className="forecast-place"><MapPin size={14} /> {location.name}{location.country ? `, ${location.country}` : ""}</span><strong>{temperature(current.temperature_2m)}</strong><span className="forecast-condition">{weatherLabel(current.weather_code)[0]} · Feels like {temperature(current.apparent_temperature)}</span></div>
        <WeatherCardArt code={current.weather_code} large />
        <div className="forecast-highlow"><span>Today's range</span><strong>{temperature(currentDaily.temperature_2m_max)} <small>high</small></strong><strong>{temperature(currentDaily.temperature_2m_min)} <small>low</small></strong><span>Humidity {current.relative_humidity_2m}%</span><span>Wind {current.wind_speed_10m} km/h</span></div>
      </div>
      <div className="forecast-days">{rows.map((row, index) => {
        const Icon = weatherType(row.code) === "sunny" ? Sun : weatherType(row.code) === "rain" ? CloudRain : Cloudy;
        return <article className="surface-card forecast-day-card" key={row.date}><span>{index === 0 ? "Today" : displayDate(row.date, { weekday: "short" })}</span><Icon size={27} className={`condition-${weatherType(row.code)}`} /><strong>{row.condition}</strong><div><b>{asTemperature(row.temperature, unit)}</b><span>{row.rainfall} mm</span></div><small>Humidity {row.humidity ?? "—"}% · Wind {row.wind ?? "—"} km/h</small></article>;
      })}</div>
      <div className="forecast-note"><CircleAlert size={15} /> Forecasts are estimates and may change as new observations arrive.</div>
    </section>
  );
}

function PageIntro({ eyebrow, title, description, badge, action }) {
  return (
    <div className="subpage-intro"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="intro-actions">{badge && <span className="dataset-badge sample"><i />{badge}</span>}{action}</div></div>
  );
}

function TrendsView({ rows, unit, period, setPeriod, chartMetric, setChartMetric, rainfallRows, demoMode }) {
  const trendSummary = rows.length > 1 ? Number(rows.at(-1).temperature - rows[0].temperature).toFixed(1) : "0.0";
  const rising = Number(trendSummary) >= 0;
  return (
    <section className="subpage">
      <PageIntro eyebrow="ANALYTICS" title="Trends & insights" description="Explore temperature, humidity, wind and rainfall patterns across time." badge={demoMode ? "Sample comparisons" : period === "7D" ? "Live forecast" : "Open-Meteo archive"} />
      <div className="analytics-toolbar surface-card">
        <div className="metric-switcher">{[["temperature", "Temperature"], ["humidity", "Humidity"], ["wind", "Wind speed"], ["rainfall", "Rainfall"]].map(([key, label]) => <button key={key} className={chartMetric === key ? "active" : ""} onClick={() => setChartMetric(key)}>{label}</button>)}</div>
        <div className="segmented-control">{["7D", "30D", "1Y"].map((item) => <button key={item} className={period === item ? "selected" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>
      </div>
      {demoMode && <div className="sample-note large"><CircleAlert size={15} /> Historical archive is unavailable; these values are clearly labeled illustrative reference data.</div>}
      <div className="analytics-summary">
        <MetricTile title="Average temperature" value={temperatureMetric(rows.reduce((sum, row) => sum + Number(row.temperature), 0) / rows.length, unit)} hint="Across selected period" Icon={Thermometer} tone="orange" />
        <MetricTile title="Temperature movement" value={`${rising ? "+" : ""}${temperatureMetric(Number(trendSummary), unit)}`} hint={rising ? "Rising over this period" : "Cooling over this period"} Icon={rising ? ArrowUpRight : ArrowLeftRight} tone="mint" />
        <MetricTile title="Average humidity" value={`${Math.round(rows.reduce((sum, row) => sum + Number(row.humidity || 0), 0) / rows.length)}%`} hint="Relative humidity" Icon={Droplets} tone="lavender" />
        <MetricTile title="Total rainfall" value={`${rows.reduce((sum, row) => sum + Number(row.rainfall || 0), 0).toFixed(1)} mm`} hint="Cumulative precipitation" Icon={CloudRain} tone="teal" />
      </div>
      <div className="analytics-grid">
        <article className="surface-card analytics-chart-panel wide"><PanelHeading Icon={ChartNoAxesCombined} title={chartMetric === "rainfall" ? "Rainfall analysis" : `${chartMetric[0].toUpperCase()}${chartMetric.slice(1)} trend`} caption={`Selected range · ${period}`} /><Suspense fallback={<div className="chart-loading">Preparing interactive chart…</div>}>{chartMetric === "rainfall" ? <RainfallChart rows={rainfallRows} /> : <TrendChart rows={rows} metric={chartMetric} name={chartMetric} unit={chartMetric === "humidity" ? "%" : chartMetric === "wind" ? " km/h" : unit} color={chartMetric === "humidity" ? PALETTE.lavender : chartMetric === "wind" ? PALETTE.mint : PALETTE.orange} compact height={300} />}</Suspense></article>
        <article className="surface-card analytics-chart-panel"><PanelHeading Icon={Droplets} title="Humidity trend" caption="Daily relative humidity" /><Suspense fallback={<div className="chart-loading">Preparing chart…</div>}><TrendChart rows={rows} metric="humidity" name="Humidity" color={PALETTE.lavender} unit="%" compact height={200} /></Suspense></article>
        <article className="surface-card analytics-chart-panel"><PanelHeading Icon={Wind} title="Wind analysis" caption="Maximum daily wind speed" /><Suspense fallback={<div className="chart-loading">Preparing chart…</div>}><WindChart rows={rows} /></Suspense></article>
      </div>
    </section>
  );
}

function AnalysisView({ file, rows, columns, metrics, observationCount, missingCells, missingByColumn, loading, onUpload, onClean, onDownload, unit }) {
  return (
    <section className="subpage">
      <PageIntro eyebrow="YOUR WEATHER DATA" title="CSV data analysis" description="Preview observations, check data quality, and calculate useful weather summaries." action={<button className="button button-primary" onClick={onUpload}><Upload size={15} /> Choose CSV</button>} />
      {!file && (
        <button className="upload-zone surface-card" onClick={onUpload}><span className="upload-zone-icon"><Upload size={21} /></span><strong>Import a weather dataset</strong><span>CSV files up to 10 MB · Date and temperature columns required</span><span className="button button-primary"><Upload size={15} /> Browse files</span></button>
      )}
      {file && <div className="file-summary surface-card"><span className="file-summary-icon"><FileText size={18} /></span><div><strong>{file.name}</strong><span>{rows.length.toLocaleString()} rows · {columns.length} columns · {(file.size / 1024).toFixed(1)} KB</span></div><span className={`quality-badge ${missingCells ? "warning" : "good"}`}>{missingCells ? `${missingCells} missing values` : "No missing values"} <i /></span><button className="button button-outline" onClick={onUpload}><ArrowLeftRight size={14} /> Replace</button></div>}
      {loading && <div className="analysis-loading"><LoaderCircle className="spin" size={18} /> Analyzing dataset…</div>}
      {file && !loading && <>
        <div className="analysis-actions"><div><strong>Data quality</strong><span>{missingCells ? "Review missing fields before cleaning." : "Required values are present."}</span></div><button className="button button-outline" onClick={onClean}><Check size={15} /> Clean & re-analyze</button><button className="button button-primary" onClick={onDownload} disabled={!metrics}><Download size={15} /> Download results</button></div>
        <div className="quality-grid">{missingByColumn.map((item) => <div key={item.column} className="quality-item"><span>{item.column}</span><strong className={item.missing ? "has-missing" : ""}>{item.missing} missing</strong></div>)}</div>
        {metrics && <div className="metric-grid analysis-metric-grid">
          <MetricTile title="Average temperature" value={temperatureMetric(metrics.temperature_c?.average, unit)} hint={`${temperatureMetric(metrics.temperature_c?.minimum, unit)} min · ${temperatureMetric(metrics.temperature_c?.maximum, unit)} max`} Icon={Thermometer} tone="orange" />
          <MetricTile title="Average humidity" value={metrics.humidity_pct ? `${metrics.humidity_pct.average}%` : "—"} hint={metrics.humidity_pct ? `${metrics.humidity_pct.minimum}% – ${metrics.humidity_pct.maximum}% range` : "No humidity column"} Icon={Droplets} tone="lavender" />
          <MetricTile title="Total rainfall" value={metrics.rainfall_mm ? `${metrics.rainfall_mm.total} mm` : "—"} hint={metrics.rainfall_mm ? "Recorded precipitation" : "No rainfall column"} Icon={CloudRain} tone="teal" />
          <MetricTile title="Observations" value={observationCount?.toLocaleString() || "—"} hint="Rows analyzed" Icon={BarChart3} tone="mint" />
        </div>}
        {rows.length > 0 && <section className="surface-card preview-panel"><PanelHeading Icon={TableProperties} title="Dataset preview" caption={`Showing ${Math.min(rows.length, 8)} of ${rows.length} rows`} />{metrics && <Suspense fallback={<div className="chart-loading">Preparing chart…</div>}><TrendChart rows={metrics.daily_series.map((item) => ({ date: item.date, average: item.average_temperature_c }))} unit="°C" height={220} compact /></Suspense>}<div className="data-table-wrap"><table className="data-table preview-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr key={index}>{columns.map((column) => <td className={!String(row[column] ?? "").trim() ? "missing-cell" : ""} key={column}>{String(row[column] ?? "") || "Missing"}</td>)}</tr>)}</tbody></table></div></section>}
      </>}
    </section>
  );
}

function temperatureMetric(value, unit) {
  if (value == null) return "—";
  const converted = unit === "°F" ? value * 9 / 5 + 32 : value;
  return `${converted.toFixed(1)}${unit}`;
}

function HistoryView({ rows, unit, demoMode, loading, error, onExport }) {
  return <section className="subpage">
    <PageIntro eyebrow="OBSERVATION ARCHIVE" title="Historical weather" description="Search, filter, sort and export daily archived weather observations." badge={demoMode ? "Sample data" : "Open-Meteo archive"} />
    {loading && <div className="analysis-loading"><LoaderCircle className="spin" size={18} /> Loading archived observations…</div>}
    {error && <div className="sample-note large" role="status"><CircleAlert size={15} /> {error} Showing the labeled sample dataset instead.</div>}
    <DataTable rows={rows} unit={unit} onExport={onExport} title="Weather history" />
    <div className="history-disclaimer"><CircleAlert size={15} />{demoMode ? "Archived observations are not available right now; this clearly labeled sample data keeps the table interactive." : "Daily observations are provided by Open-Meteo and extend through the latest date available in its archive."}</div>
  </section>;
}

function ReportsView({ rows, location, insights, demoMode, onDownload }) {
  const summary = rows.reduce((result, row) => {
    result.rain += Number(row.rainfall || 0);
    result.high = Math.max(result.high, Number(row.temperature));
    result.low = Math.min(result.low, Number(row.temperature));
    return result;
  }, { rain: 0, high: -Infinity, low: Infinity });
  return <section className="subpage"><PageIntro eyebrow="SHAREABLE OUTPUTS" title="Weather reports" description="A concise report for the currently selected weather location." badge={demoMode ? "Sample report" : "Live report"} action={<button className="button button-primary" onClick={onDownload}><Download size={15} /> Export data</button>} /><div className="report-cover surface-card"><div className="report-cover-top"><span className="report-brand"><CloudSun size={18} /> WEATHER DATA ANALYZER</span><span>{new Date().toLocaleDateString()}</span></div><span className="eyebrow">LOCATION REPORT</span><h2>{location.name}{location.country ? `, ${location.country}` : ""}</h2><p>{demoMode ? "Illustrative sample conditions · Not a live observation" : "Live forecast data supplied by Open-Meteo"}</p><div className="report-metrics"><div><span>Temperature range</span><strong>{summary.low.toFixed(1)}° – {summary.high.toFixed(1)}°C</strong></div><div><span>Rainfall outlook</span><strong>{summary.rain.toFixed(1)} mm</strong></div><div><span>Forecast records</span><strong>{rows.length} days</strong></div></div><div className="report-insights">{insights.map(({ Icon, title, text }) => <div key={title}><Icon size={16} /><span><b>{title}</b>{text}</span></div>)}</div></div></section>;
}

function SettingsView({ unit, setUnit, period, setPeriod, location }) {
  return <section className="subpage"><PageIntro eyebrow="PREFERENCES" title="Settings" description="Adjust the dashboard display to fit your workflow." /><div className="settings-layout"><section className="surface-card settings-card"><PanelHeading Icon={Thermometer} title="Temperature units" caption="Used across metrics, forecasts and chart labels" /><div className="setting-choice-row">{["°C", "°F"].map((option) => <button key={option} className={`setting-choice ${unit === option ? "selected" : ""}`} onClick={() => setUnit(option)}><span>{option}</span><small>{option === "°C" ? "Celsius" : "Fahrenheit"}</small>{unit === option && <Check size={16} />}</button>)}</div></section><section className="surface-card settings-card"><PanelHeading Icon={CalendarDays} title="Default chart period" caption="Choose the initial analysis range" /><div className="setting-choice-row">{["7D", "30D", "1Y"].map((option) => <button key={option} className={`setting-choice ${period === option ? "selected" : ""}`} onClick={() => setPeriod(option)}><span>{option}</span><small>{option === "7D" ? "Weekly" : option === "30D" ? "Monthly" : "Annual"}</small>{period === option && <Check size={16} />}</button>)}</div></section><section className="surface-card settings-card"><PanelHeading Icon={MapPin} title="Active location" caption="Current dashboard location" /><div className="settings-location"><Compass size={18} /><span>{location.name}{location.country ? `, ${location.country}` : ""}</span></div></section></div></section>;
}

export default EnterpriseDashboard;
