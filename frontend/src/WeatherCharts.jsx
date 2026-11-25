import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  orange: "#e89a5d",
  lavender: "#a99acb",
  mint: "#6da88a",
  teal: "#70aaa4",
  ink: "#26352f",
  muted: "#8a938d",
  grid: "#eceeea",
};

export function TrendChart({ rows, unit, height = 250, compact = false, metric = "temperature", name = "Temperature", color = COLORS.orange }) {
  const data = rows.map((row) => ({
    ...row,
    temperature: row.average ?? row.temperature,
    label: row.label || new Date(`${row.date}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 10, bottom: 2, left: -18 }}>
        <defs>
          <linearGradient id="temperatureWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.orange} stopOpacity={.2} />
            <stop offset="100%" stopColor={COLORS.orange} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} minTickGap={18} />
        <YAxis yAxisId="temp" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} unit={unit} width={44} />
        {!compact && <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 9 }} unit="%" width={35} />}
        {!compact && <YAxis yAxisId="wind" hide domain={[0, "dataMax + 8"]} />}
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e8e8e3", boxShadow: "0 8px 24px #26352f12", fontSize: 12 }}
          formatter={(value, name) => [`${value}${name === "Humidity" ? "%" : name === "Wind" ? " km/h" : unit}`, name]}
        />
        <Area
          yAxisId={metric === "humidity" ? "percent" : metric === "wind" ? "wind" : "temp"}
          type="monotone"
          dataKey={metric}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={metric === "temperature" ? "url(#temperatureWash)" : `${color}22`}
          activeDot={{ r: 5 }}
        />
        {!compact && metric === "temperature" && <Line yAxisId="percent" type="monotone" dataKey="humidity" name="Humidity" stroke={COLORS.lavender} strokeWidth={2} dot={false} connectNulls />}
        {!compact && metric === "temperature" && <Line yAxisId="wind" type="monotone" dataKey="wind" name="Wind" stroke={COLORS.mint} strokeWidth={2} dot={false} connectNulls />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function RainfallChart({ rows }) {
  const data = rows.map((row) => ({
    ...row,
    label: row.label || new Date(`${row.date}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }),
  }));
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 2, left: -22 }}>
        <defs>
          <linearGradient id="rainfallWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.teal} stopOpacity={.35} />
            <stop offset="100%" stopColor={COLORS.teal} stopOpacity={.03} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} minTickGap={20} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: COLORS.muted, fontSize: 10 }} unit=" mm" />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e8e3", fontSize: 12 }} formatter={(value) => [`${value} mm`, "Rainfall"]} />
        <Area type="monotone" dataKey="rainfall" stroke={COLORS.teal} fill="url(#rainfallWash)" strokeWidth={2.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WindChart({ rows }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={rows} margin={{ top: 10, right: 8, bottom: 2, left: -22 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: COLORS.muted }} minTickGap={14} />
        <YAxis axisLine={false} tickLine={false} width={34} tick={{ fontSize: 9, fill: COLORS.muted }} />
        <Tooltip />
        <Area type="monotone" dataKey="wind" stroke={COLORS.mint} fill="#6da88a22" strokeWidth={2.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CircularStat({ label, percentage, color, Icon }) {
  const data = [{ name: label, value: percentage }, { name: "Other", value: 100 - percentage }];
  return (
    <div className="circular-stat">
      <div className="circular-stat-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="76%" outerRadius="94%" startAngle={90} endAngle={-270} paddingAngle={1} stroke="none">
              <Cell fill={color} /><Cell fill="#eeefec" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <strong>{percentage}%</strong>
      </div>
      <span><Icon size={13} /> {label}</span>
    </div>
  );
}
