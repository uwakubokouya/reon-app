import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Box, Card, Typography, Checkbox, List, ListItem, ListItemIcon, ListItemText, Avatar, Tabs, Tab, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import {
  AttachMoney, Star, EventAvailable, TrendingUp, CalendarMonth, Warning, RocketLaunch, Done, Group, PieChart as PieChartIcon, ListAlt, Timeline,
} from "@mui/icons-material";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import KpiDetailDialog from "../components/KpiDetailDialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line
} from "recharts";
import AnimatedWeather from "react-animated-weather";
import { supabase } from "../lib/supabase";
import { fetchLatLon, fetchWeather, codeToIcon } from "../utils/weather";
import { useSettings } from "../SettingsContext";
import dayjs from "dayjs";

// --- グラデーションカラー/アクセント ---
const gradBG = "radial-gradient(circle at 70% 10%, #e0e7ff 0%, #f8fafd 70%)";
const cyan = "#06b6d4";
const lteColors = {
  info:    { bg: "#03bcea", text: "#fff", icon: "#fff", accent: "#05b7de" },
  success: { bg: "#0bb87c", text: "#fff", icon: "#fff", accent: "#17b86c" },
  warning: { bg: "#f7a823", text: "#fff", icon: "#fff", accent: "#df990e" },
  danger:  { bg: "#e4544c", text: "#fff", icon: "#fff", accent: "#d9453f" },
};

// 文字列の時刻 "HH:MM" を分数に変換
function toMinutes(t) {
  if (!t) return 0;
  let [h, m] = (t || "00:00").split(":").map(Number);
  if (t === "00:00") h = 24;
  return h * 60 + (m || 0);
}

function getDurationMins(reservation) {
  if (!reservation.start_time || !reservation.end_time) return 0;
  const start = toMinutes(reservation.start_time);
  const end = toMinutes(reservation.end_time);
  return end > start ? end - start : 0;
}

// --- レイアウト初期値（固定値） ---
const layoutDefault = [
  { i: "chart", x: 0, y: 0, w: 6, h: 2, minW: 4, minH: 2 },
  { i: "todo", x: 6, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "recruitCard", x: 8, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "weather", x: 10, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
  { i: "aiSummary", x: 0, y: 2, w: 2, h: 1, minW: 2, minH: 1 },
  { i: "calendar", x: 2, y: 2, w: 3, h: 1, minW: 2, minH: 1 },
  { i: "alert", x: 5, y: 2, w: 3, h: 1, minW: 2, minH: 1 },
  { i: "actions", x: 8, y: 2, w: 4, h: 1, minW: 2, minH: 1 },
];

// --- ローカルストレージからレイアウトを取得 ---
function getLayout(fallback) {
  try {
    return JSON.parse(localStorage.getItem("reon-layout-dashboard")) || fallback;
  } catch {
    return fallback;
  }
}

// --- KPI集計（reservations/shiftsからリアルタイム） ---
function calcKpi({ reservations, shifts }) {
  // --- キャンセルを除外 ---
  const validReservations = reservations.filter(
    r => !String(r.kubun || "").includes("キャンセル")
  );

  // 本日
  const allCount = validReservations.length;
  const shimeiCount = validReservations.filter(
    r => Number(r.shimei_fee || 0) > 0
  ).length;
  const shimeiRate = allCount ? (shimeiCount / allCount) * 100 : 0;

  // 本日売上
  const todaySales = validReservations.reduce((sum, r) => sum + (r.price || 0), 0);

  // 出勤キャスト数
  const castSet = new Set(shifts.filter(s => s.is_active).map(s => s.cast_id));
  const shiftCount = castSet.size;

  // 稼働率（総出勤時間÷実働時間）
  let totalShiftMinutes = 0;
  shifts.forEach(s => {
    if (!s.is_active) return;
    if (!s.start_time || !s.end_time) return;
    const start = dayjs(`${s.date} ${s.start_time}`);
    const end = dayjs(`${s.date} ${s.end_time}`);
    totalShiftMinutes += Math.max(end.diff(start, "minute"), 0);
  });
  const totalWorkMinutes = validReservations.length * 60; // 1件1h換算
  const workRate = totalShiftMinutes ? (totalWorkMinutes / totalShiftMinutes) * 100 : 0;

  return {
    todaySales,
    shimeiRate,
    shiftCount,
    workRate
  };
}


// --- 日別／月別グラフデータ変換（従来どおりdaily_reportsから） ---
function formatDay(d) {
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
function formatMonth(d) {
  const date = new Date(d + "-01");
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
function getPastWeekData(dailyReports) {
  return dailyReports
    .slice(-7)
    .map(row => {
      const sales = (row.sales_cash || 0) + (row.sales_card || 0) + (row.sales_paypay || 0);
      const profit = row.cash_balance != null ? row.cash_balance : 0;
      return {
        date: formatDay(row.report_date),
        sales,
        profit,
      };
    });
}
function getPast6MonthsData(dailyReports) {
  const monthMap = {};
  dailyReports.forEach(row => {
    const ym = row.report_date.slice(0, 7);
    if (!monthMap[ym]) monthMap[ym] = { sales: 0, profit: 0 };
    const sales = (row.sales_cash || 0) + (row.sales_card || 0) + (row.sales_paypay || 0);
    // cash_balanceの月合計を足し込む（null/undefined防止）
    monthMap[ym].sales += sales;
    monthMap[ym].profit += row.cash_balance != null ? row.cash_balance : 0;
  });
  const months = Object.keys(monthMap).sort().slice(-6);
  return months.map(ym => ({
    date: formatMonth(ym),
    sales: monthMap[ym].sales,
    profit: monthMap[ym].profit,
  }));
}

// --- KPIカード ---
function AdminLteBox({ color, value, label, icon, infoLabel = "詳細情報", onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <Card
      sx={{
        bgcolor: color.bg,
        color: color.text,
        borderRadius: 2,
        px: 2.5, pt: 2.1, pb: 0.8,
        minWidth: 0,
        minHeight: 140,
        height: "100%",
        boxShadow: "0 2px 12px #0001",
        border: "none",
        position: "relative",
        overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        transition: "box-shadow 0.15s",
      }}
      elevation={2}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
        <Box>
          <Typography sx={{ fontSize: 34, fontWeight: 900, mb: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 17.5, fontWeight: 700, opacity: 0.92, mt: 0.6 }}>
            {label}
          </Typography>
        </Box>
        <Box sx={{
          fontSize: 54,
          color: color.icon,
          opacity: 0.18,
          position: "absolute",
          right: 20, top: 10,
          pointerEvents: "none",
          transition: "transform 0.23s cubic-bezier(.42,1.69,.53,1.23)",
          transform: hover ? "scale(1.20) rotate(10deg)" : "none",
        }}>
          {icon}
        </Box>
      </Box>
      <Box sx={{
        width: "100%",
        bgcolor: color.accent,
        py: 0.25,
        borderRadius: "0 0 10px 10px",
        textAlign: "center",
        position: "absolute",
        left: 0, bottom: 0,
        transition: "background 0.18s",
      }}>
        <Button
          onClick={onClick}
          variant="text"
          size="small"
          sx={{
            color: "#fff",
            fontWeight: 900,
            fontSize: 15.5,
            textTransform: "none",
            minWidth: 0,
            minHeight: 24,
            lineHeight: 1,
            p: "3px 0",
            "&:hover": {
              color: "#fff",
              opacity: 0.88,
              background: "none",
            }
          }}
          endIcon={
            <span style={{ fontWeight: "bold", fontSize: 17, marginLeft: 4 }}>⟶</span>
          }
        >
          {infoLabel}
        </Button>
      </Box>
    </Card>
  );
}

// --- 売上・利益グラフ（省略なし） ---
function SalesProfitChartPanel({ dailyReports }) {
  const [tab, setTab] = useState(0);
  const dailyData = getPastWeekData(dailyReports || []);
  const monthlyData = getPast6MonthsData(dailyReports || []);
  const data = tab === 0 ? dailyData : monthlyData;
  const chartColors = { sales: "#00bfff", profit: "#ff9800" };

  return (
    <Card sx={{
      borderRadius: 2.5, boxShadow: "0 2px 12px #95c2d833", border: "1.5px solid #e0ecf1",
      bgcolor: "#f9fbfd", p: 0, minWidth: 400, height: "100%", display: "flex", flexDirection: "column"
    }}>
      <Box sx={{ px: 2, pt: 2, pb: 0, display: "flex", alignItems: "center" }}>
        <TrendingUp sx={{ color: "#03bcea", fontSize: 28, mr: 1.1 }} />
        <Typography sx={{ fontWeight: 900, fontSize: 20, letterSpacing: 1.2 }}>売上・利益グラフ</Typography>
      </Box>
      <Tabs value={tab} onChange={(_, nv) => setTab(nv ?? 0)} variant="standard"
        sx={{ borderBottom: "1.5px solid #e5e7eb", minHeight: 0, "& .MuiTab-root": { minHeight: 0, fontWeight: 700 } }}>
        <Tab label="日別" value={0} />
        <Tab label="月別" value={1} />
      </Tabs>
      <Box sx={{ px: 2, pt: 1.5, pb: 2.2, flex: 1, minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="95%" key={tab}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="4 2" vertical={false} stroke="#e0ecf1" />
            <XAxis dataKey="date" tick={{ fontWeight: 600, fontSize: 13 }} />
            <YAxis tick={{ fontWeight: 700, fontSize: 13 }} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1.5px solid #b2ebf2", fontWeight: 800, fontSize: 15 }}
              labelStyle={{ fontWeight: 700 }}
              formatter={(value, name) => {
                if (name === "売上" || name === "sales") return [<span style={{ color: "#03bcea", fontWeight: 900 }}>¥{Number(value).toLocaleString()}</span>, "売上"];
                if (name === "利益" || name === "profit") return [<span style={{ color: "#f7a823", fontWeight: 900 }}>¥{Number(value).toLocaleString()}</span>, "利益"];
                return [value, name];
              }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" height={36} wrapperStyle={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }} />
            <Area type="monotone" dataKey="sales" name="売上" stroke={chartColors.sales} fill="none" strokeWidth={3}
              dot={{ r: 5, stroke: chartColors.sales, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 7 }} />
            <Area type="monotone" dataKey="profit" name="利益" stroke={chartColors.profit} fill="none" strokeWidth={3}
              dot={{ r: 5, stroke: chartColors.profit, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 7 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  );
}

// --- 求人カード ---
function RecruitCardPanel({ dailyReports }) {
  const allRecruits = (dailyReports || []).flatMap(r => Array.isArray(r.recruit_logs) ? r.recruit_logs : []);
  const months = [...new Set((dailyReports || []).map(r => (r.report_date || "").slice(0, 7)))].sort();
  const recentMonths = months.slice(-6);

  // 媒体名を自動抽出
  const mediaTypes = Array.from(
    new Set(
      allRecruits
        .map(r => (r.media || "").trim())
        .filter(media => !!media)
    )
  );
  if (mediaTypes.length === 0) mediaTypes.push("未入力");

  // タブ用 結果リスト
  const resultTypes = ["問い合わせ", "採用", "面接のみ", "返事待ち", "不採用", "その他"];
  const [selectedResult, setSelectedResult] = useState(resultTypes[0]);

  // --- 月ごと集計（選択中の「結果」だけ/トータルなら全て）
  const monthlyData = recentMonths.map(month => {
    const monthRecruits = (dailyReports || [])
      .filter(r => (r.report_date || "").slice(0, 7) === month)
      .flatMap(r => Array.isArray(r.recruit_logs) ? r.recruit_logs : [])
      .filter(r =>
        selectedResult === "問い合わせ" ? true : r.result === selectedResult
      );
    return {
      month: `${parseInt(month.split("-")[1])}月`,
      total: monthRecruits.length
    };
  });

  // --- 最新月・媒体別
  const lastMonth = recentMonths[recentMonths.length - 1];
  const lastMonthRecruits = (dailyReports || [])
    .filter(r => (r.report_date || "").slice(0, 7) === lastMonth)
    .flatMap(r => Array.isArray(r.recruit_logs) ? r.recruit_logs : [])
    .filter(r =>
      selectedResult === "問い合わせ" ? true : r.result === selectedResult
    );

  const medias = mediaTypes.map(media => ({
    label: media,
    value: lastMonthRecruits.filter(r => r.media === media).length
  }));

  const pieColors = ["#38bdf8", "#0bb87c", "#f7a823", "#f08080", "#6366f1"];
  const lastTotal = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].total : 0;

  return (
    <Card sx={{ p: 2, borderRadius: 2, minWidth: 600, width: 650, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <PieChartIcon sx={{ color: "#38bdf8", mr: 1 }} />
        <Typography fontWeight={900}>求人情報</Typography>
      </Box>
      <Tabs
        value={selectedResult}
        onChange={(_, nv) => setSelectedResult(nv)}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        sx={{ mb: 1, "& .MuiTab-root": { fontWeight: 700, fontSize: 15 } }}
      >
        {resultTypes.map(result => (
          <Tab key={result} value={result} label={result} />
        ))}
      </Tabs>
      <Box sx={{ width: "100%", height: 170, mt: 1, mb: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#888", fontWeight: 700, fontSize: 13 }} />
            <YAxis tick={{ fill: "#888", fontWeight: 600, fontSize: 13 }} />
            <Tooltip contentStyle={{ background: "#fff", fontWeight: 700 }} />
            <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={3} dot={{ r: 6, fill: "#fff" }} activeDot={{ r: 9 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Box sx={{
        display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 4, width: "100%", mt: 1, mb: 0.6
      }}>
        {medias.map((m, i) => (
          <Box key={m.label} sx={{ flex: "0 0 95px", textAlign: "center" }}>
            <RechartsPieChart width={68} height={68}>
              <Pie
                data={[
                  { name: m.label, value: m.value },
                  { name: "", value: Math.max(0, lastTotal - m.value) }
                ]}
                cx="50%" cy="50%"
                innerRadius={20} outerRadius={30}
                startAngle={90} endAngle={-270}
                dataKey="value"
              >
                <Cell key="main" fill={pieColors[i % pieColors.length]} />
                <Cell key="rest" fill="#ececec" />
              </Pie>
            </RechartsPieChart>
            <Typography sx={{ mt: -1.6, fontWeight: 900, color: pieColors[i % pieColors.length], fontSize: 17 }}>{m.value}</Typography>
            <Typography sx={{ color: "#888", fontWeight: 700, fontSize: 14 }}>{m.label}</Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}


// --- ToDoリスト（DB対応） ---
function TodoPanel() {
  const { currentStoreId: storeId } = useSettings();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [newTodo, setNewTodo] = useState("");

  // ToDo一覧 取得
  const fetchTodos = async () => {
    if (!storeId) {
      setTodos([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("store_id", storeId)
      .eq("done", false) 
      .order("created_at", { ascending: true });
    if (!error && data) setTodos(data);
    else setTodos([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line
  }, [storeId]);

  // チェック変更（done切り替え）
  const handleCheck = async (todo, idx) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .update({ done: !todo.done })
      .eq("id", todo.id)
      .select();
    if (!error && data) {
      setTodos(todos =>
        todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t)
      );
    }
    setLoading(false);
  };

  // ToDo追加
  const handleAdd = async () => {
    if (!newTodo.trim() || !storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .insert([{ title: newTodo, done: false, store_id: storeId }])
      .select();
    if (!error && data && data[0]) {
      setTodos(todos => [...todos, data[0]]);
    }
    setLoading(false);
    setDialog(false);
    setNewTodo("");
  };

  // ToDo削除（オプション・要らなければ消してOK）
  const handleDelete = async (todoId) => {
    setLoading(true);
    await supabase.from("todos").delete().eq("id", todoId);
    setTodos(todos => todos.filter(t => t.id !== todoId));
    setLoading(false);
  };

  return (
    <Card sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <ListAltIcon sx={{ color: "#38bdf8", mr: 1 }} />
        <Typography fontWeight={900}>ToDoリスト</Typography>
        <Button
          sx={{ ml: "auto" }}
          variant="outlined"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setDialog(true)}
          disabled={loading}
        >作成</Button>
      </Box>
      <List dense sx={{ minHeight: 120, mt: 1 }}>
        {todos.length === 0 && !loading && (
          <Typography sx={{ pl: 1, color: "#aaa", fontWeight: 600 }}>ToDoがありません</Typography>
        )}
        {todos.map((todo, i) => (
          <ListItem
            key={todo.id}
            sx={{
              px: 0, py: 0.4,
              "& .MuiCheckbox-root": { p: 0.2 },
              opacity: todo.done ? 0.62 : 1,
              textDecoration: todo.done ? "line-through" : "none"
            }}
            disableGutters
            secondaryAction={
              <Checkbox
                checked={todo.done}
                color="info"
                onChange={() => handleCheck(todo, i)}
                disabled={loading}
              />
            }
          >
            <ListItemText primary={todo.title} />
            <Button size="small" color="error" sx={{ ml: 0.5 }} onClick={() => handleDelete(todo.id)} disabled={loading}></Button>
          </ListItem>
        ))}
      </List>
      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <DialogTitle>ToDo追加</DialogTitle>
        <DialogContent>
          <TextField
            value={newTodo}
            onChange={e => setNewTodo(e.target.value)}
            label="ToDo内容"
            fullWidth
            autoFocus
            disabled={loading}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)} disabled={loading}>キャンセル</Button>
          <Button variant="contained" onClick={handleAdd} disabled={loading || !newTodo.trim()}>追加</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// --- WeatherPanel: 本日分＋週間天気・地域変更＆動くアイコン ---
function WeatherPanel() {
  const [weather, setWeather] = useState(null);
  const [input, setInput] = useState(() => localStorage.getItem("reon-weather-location") || "東京");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 地域変更で天気取得
  const handleLocationChange = async () => {
    setLoading(true);
    setError("");
    try {
      const { lat, lon } = await fetchLatLon(input);
      const data = await fetchWeather(lat, lon);
      setWeather({
        location: input,
        today: {
          day: ["日", "月", "火", "水", "木", "金", "土"][new Date().getDay()],
          time: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
          weather: codeToIcon(data.current_weather.weathercode),
          desc: "本日の天気",
          temp: Math.round(data.current_weather.temperature),
        },
        week: data.daily.time.slice(1, 8).map((date, i) => ({
          day: ["日", "月", "火", "水", "木", "金", "土"][new Date(date).getDay()],
          icon: codeToIcon(data.daily.weathercode[i + 1]),
          temp: Math.round(data.daily.temperature_2m_max[i + 1]),
        })),
      });
      localStorage.setItem("reon-weather-location", input);
    } catch (e) {
      setError("天気取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLocationChange();
    // eslint-disable-next-line
  }, []);

  return (
    <Card sx={{ p: 2, borderRadius: 2, minWidth: 600, width: 650, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <TextField
          size="small"
          value={input}
          onChange={e => setInput(e.target.value)}
          label="地域"
          sx={{ mr: 1, width: 120 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleLocationChange}
          disabled={loading}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {loading ? "取得中…" : "登録"}
        </Button>
        {error && <Typography color="error" sx={{ ml: 2 }}>{error}</Typography>}
      </Box>
      {weather && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <AnimatedWeather icon={weather.today.weather} color="#039be5" size={64} animate />
            <Box sx={{ ml: 2 }}>
              <Typography sx={{ fontWeight: 700 }}>{weather.today.day}　{weather.today.time}</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{weather.location}</Typography>
              <Typography sx={{ color: "#607d8b", fontWeight: 600, fontStyle: "italic" }}>{weather.today.desc}</Typography>
            </Box>
            <Typography sx={{ ml: "auto", fontSize: 44, fontWeight: 900, color: "#039be5" }}>
              {weather.today.temp}°
            </Typography>
          </Box>
          <Box sx={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-end", px: 1, mt: 2
          }}>
            {weather.week.map((w, i) => (
              <Box key={i} sx={{ textAlign: "center", minWidth: 44 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{w.day}</Typography>
                <AnimatedWeather icon={w.icon} color="#039be5" size={32} animate />
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{w.temp}°</Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Card>
  );
}

// --- カレンダー ---
function CalendarPanel() {
  const { currentStoreId: storeId } = useSettings();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push("");
  for (let d = 1; d <= lastDate; d++) days.push(d);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(dayjs().format("YYYY-MM-DD"));

  // イベント取得
  const fetchEvents = async () => {
    if (!storeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("store_id", storeId)
      .gte("event_date", `${year}-${String(month+1).padStart(2,"0")}-01`)
      .lte("event_date", `${year}-${String(month+1).padStart(2,"0")}-${lastDate}`);
    setEvents(!error && data ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [storeId, month, year]);

  // イベント追加
  const handleAddEvent = async () => {
    if (!storeId || !newEventTitle.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          store_id: storeId,           // ← 正しくはこれ！
          title: newEventTitle,
          event_date: newEventDate,
        }
      ])
      .select();
    if (!error && data) setEvents(ev => [...ev, ...data]);
    setAddDialog(false);
    setNewEventTitle("");
    setNewEventDate(dayjs().format("YYYY-MM-DD"));
    setLoading(false);
  };

  // イベント削除
  const handleDeleteEvent = async (eventId) => {
    setLoading(true);
    await supabase.from("events").delete().eq("id", eventId);
    setEvents(ev => ev.filter(e => e.id !== eventId));
    setLoading(false);
  };

  // 日付ごとのイベント
  const eventsByDate = {};
  events.forEach(ev => {
    const date = Number(ev.event_date.split("-")[2]);
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(ev);
  });

  return (
    <Card sx={{ borderRadius: 2, height: "100%", p: 0, minWidth: 600, width: 650, boxShadow: "none" }}>
      <Box sx={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e3e8ef", px: 2, py: 1 }}>
        <CalendarMonthIcon sx={{ color: "#60a5fa", mr: 1 }} />
        <Typography fontWeight={900}>カレンダー</Typography>
        <Typography fontWeight={600} sx={{ ml: "auto" }}>{year}年{month + 1}月</Typography>
        <Button sx={{ ml: 2 }} variant="outlined" onClick={() => setAddDialog(true)}>＋イベント追加</Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", width: "100%", px: 0, py: 1, gap: 0 }}>
        {["日", "月", "火", "水", "木", "金", "土"].map(w =>
          <Typography
            key={w}
            fontSize={13} fontWeight={700} textAlign="center"
            color={w === "日" ? "#f87171" : w === "土" ? "#2563eb" : "#334155"}
            sx={{ px: 0, mx: 0, py: 0.5 }}
          >{w}</Typography>
        )}
        {days.map((d, i) => (
          <Box
            key={i}
            sx={{
              border: (d === now.getDate() ? "2px solid #60a5fa" : "none"),
              borderRadius: 1.2,
              m: 0, px: 0, minHeight: 36,
              textAlign: "center",
              background: d === now.getDate() ? "#e3f0fc" : "none",
              position: "relative"
            }}
          >
            <Typography
              fontSize={15}
              color={i % 7 === 0 ? "#f87171" : i % 7 === 6 ? "#2563eb" : "#222"}
              fontWeight={d === now.getDate() ? 900 : 600}
              sx={{ m: 0, py: 0.1 }}
            >
              {d}
            </Typography>
            {d && eventsByDate[d]
              ? eventsByDate[d].map((ev, idx) => (
                <Box key={ev.id} sx={{ display: "flex", alignItems: "center", bgcolor: "#e5e7eb", borderRadius: 1, px: 0.5, py: 0.1, mx: "auto", my: 0.1, width: "94%" }}>
                  <Typography fontSize={12} sx={{ color: "#374151", flexGrow: 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {ev.title}
                  </Typography>
                  <IconButton size="small" sx={{ ml: 0.3, p: 0.5 }} color="error" onClick={() => handleDeleteEvent(ev.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )) : null}
          </Box>
        ))}
      </Box>
      <Dialog open={addDialog} onClose={() => setAddDialog(false)}>
        <DialogTitle>イベント追加</DialogTitle>
        <DialogContent sx={{ minWidth: 340 }}>
          <TextField
            label="イベント名"
            value={newEventTitle}
            onChange={e => setNewEventTitle(e.target.value)}
            fullWidth
            autoFocus
            margin="dense"
          />
          <TextField
            label="日付"
            type="date"
            value={newEventDate}
            onChange={e => setNewEventDate(e.target.value)}
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleAddEvent} disabled={!newEventTitle.trim()}>追加</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// --- AIサマリー ---
function AISummaryPanel() {
  return (
    <Card sx={{ p: 2, borderRadius: 2, minWidth: 600, width: 650, height: "100%", bgcolor: "#e0f2fe", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <RocketLaunch sx={{ color: "#0ea5e9", mr: 1 }} />
        <Typography fontWeight={900}>AIサマリー</Typography>
      </Box>
      <Typography fontSize={15} fontWeight={700}>
        本日は<strong style={{ color: "#0ea5e9" }}>新規来店+8件</strong>、予約数は前日比<strong style={{ color: "#16a34a" }}>+14%</strong>です。
        SNS集客が増加し、<strong style={{ color: "#f7a823" }}>リピート率</strong>も向上しています。
      </Typography>
    </Card>
  );
}

// --- 異常検知 ---
function AlertPanel() {
  return (
    <Card sx={{ p: 2, borderRadius: 2, minWidth: 600, width: 650, height: "100%", bgcolor: "#fee2e2", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Warning sx={{ color: "#ef4444", mr: 1 }} />
        <Typography fontWeight={900}>異常検知</Typography>
      </Box>
      <Typography fontSize={15} fontWeight={700} color="#ef4444">
        18時台の予約が急落。<br />
        他店の割引イベント影響あり。早めの対策推奨！
      </Typography>
    </Card>
  );
}

// --- 推奨アクション ---
function ActionsPanel() {
  return (
    <Card sx={{ p: 2, borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Done sx={{ color: "#4ade80", mr: 1 }} />
        <Typography fontWeight={900}>推奨アクション</Typography>
      </Box>
      <List dense>
        <ListItem sx={{ px: 0, py: 0.6 }}>
          <ListItemIcon sx={{ minWidth: 28 }}><Star color="info" /></ListItemIcon>
          <ListItemText primary="本日のおすすめ女性・空き枠をSNSで投稿" />
        </ListItem>
        <ListItem sx={{ px: 0, py: 0.6 }}>
          <ListItemIcon sx={{ minWidth: 28 }}><EventAvailable color="warning" /></ListItemIcon>
          <ListItemText primary="明日の出勤調整を前倒しで実施" />
        </ListItem>
        <ListItem sx={{ px: 0, py: 0.6 }}>
          <ListItemIcon sx={{ minWidth: 28 }}><Group color="primary" /></ListItemIcon>
          <ListItemText primary="営業後に口コミ返信を2件実施" />
        </ListItem>
      </List>
    </Card>
  );
}

// --- ダッシュボード ---
export default function DashboardPage() {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(1400);
  const [dialog, setDialog] = useState({ open: false, type: "" }); 

  // storeId連動
  const { currentStoreId: storeId } = useSettings();
  const [layout, setLayout] = useState(() => getLayout(layoutDefault));

  // KPI用データ
  const [reservations, setReservations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [monthShifts, setMonthShifts] = useState([]);
  const [dailyReports, setDailyReports] = useState([]); // グラフ用

  // 本日
  const today = dayjs().format("YYYY-MM-DD");

   // KPIダイアログ用の加工データ
  const [kpiDetail, setKpiDetail] = useState({
    salesByType: {},
    salesByCast: [],
    shimeiPie: [],
    shimeiPieByCast: [],
    shiftTable: [],
    monthWorkByCast: {},
    absentRateByCast: {},
    workRateByCast: []
  });

  const {
  salesByType,
  salesByCast,
  shimeiPie,
  shimeiPieByCast,
  shiftTable,
  monthWorkByCast,
  absentRateByCast,
  workRateByCast
} = kpiDetail;

  // --- 生データフェッチ ---
  useEffect(() => {
  if (!storeId) return;

  // ① castsを先に取得
  supabase
    .from("casts")
    .select("id, name")
    .then(({ data: casts }) => {

      // ② reservations取得＆cast_name付与
      supabase
        .from("reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("datetime", today + "T00:00:00")
        .lte("datetime", today + "T23:59:59")
        .then(({ data: reservations }) => {
          const withNames = (reservations || []).map(r => ({
            ...r,
            cast_name: (casts.find(c => c.id === r.cast_id) || {}).name || ""
          }));
          setReservations(withNames);
        });

      // ③ shifts取得＆cast_name付与
      supabase
        .from("shifts")
        .select("*")
        .eq("store_id", storeId)
        .eq("date", today)
        .then(({ data: shifts }) => {
          const withNames = (shifts || []).map(s => ({
            ...s,
            cast_name: (casts.find(c => c.id === s.cast_id) || {}).name || ""
          }));
          setShifts(withNames);
        });

      // ④ daily_reports（cast_name不要なので普通に取得）
      supabase
        .from("daily_reports")
        .select("*")
        .eq("store_id", storeId)
        .order("report_date", { ascending: true })
        .then(({ data }) => setDailyReports(data || []));
    });
}, [storeId, today]);

  // --- KPIカード用集計 ---
  const { todaySales, shimeiRate, shiftCount, workRate } = useMemo(() => calcKpi({ reservations, shifts }), [reservations, shifts]);

  // --- KPIカードリスト ---
  const kpiList = [
    {
      key: "orders",
      value: `¥${Number(todaySales).toLocaleString()}`, label: "本日売上",
      color: lteColors.info,
      icon: <AttachMoney sx={{ fontSize: 54 }} />,
      onClick: () => openDialog("orders")
    },
    {
      key: "bounce",
      value: reservations.length ? `${shimeiRate.toFixed(1)}%` : "--%", label: "指名率",
      color: lteColors.success,
      icon: <Star sx={{ fontSize: 54 }} />,
      onClick: () => openDialog("bounce")
    },
    {
      key: "users",
      value: shiftCount ? `${shiftCount}名` : "--", label: "出勤情報",
      color: lteColors.warning,
      icon: <EventAvailable sx={{ fontSize: 54 }} />,
      onClick: () => openDialog("users")
    },
    {
      key: "visitors",
      value: workRate ? `${workRate.toFixed(1)}%` : "--%", label: "稼働率",
      color: lteColors.danger,
      icon: <TrendingUp sx={{ fontSize: 54 }} />,
      onClick: () => openDialog("visitors")
    }
  ];

  // --- KPI詳細ダイアログOPEN時のみ加工 ---
  function openDialog(type) {
    if (type === "orders") {
      setKpiDetail(getSalesDetail(reservations));
    } else if (type === "bounce") {
      setKpiDetail(getShimeiDetail(reservations));
    } else if (type === "users") {
      setKpiDetail(getShiftDetail(shifts, reservations, monthShifts));
    } else if (type === "visitors") {
      setKpiDetail(getWorkRateDetail(shifts, reservations));
    }
    setDialog({ open: true, type });
  }

  // ---------- 集計ロジック ----------
  // --- 売上詳細 ---
  function getSalesDetail(reservations) {
    // 支払方法
    let cash = 0, card = 0, paypay = 0, total = 0;
    const castMap = {};
    for (const r of reservations) {
      // 必要に応じて「r.payment_type」などを合わせて
      const payType = String(r.payment_method || "").toLowerCase();
      if (payType === "cash") cash += r.price || 0;
      if (payType === "card") card += r.price || 0;
      if (payType === "paypay") paypay += r.price || 0;
      total += r.price || 0;
      // キャストごと
      if (!castMap[r.cast_id]) castMap[r.cast_id] = { id: r.cast_id, name: r.cast_name, cash: 0, card: 0, paypay: 0, total: 0 };
      if (payType === "cash") castMap[r.cast_id].cash += r.price || 0;
      if (payType === "card") castMap[r.cast_id].card += r.price || 0;
      if (payType === "paypay") castMap[r.cast_id].paypay += r.price || 0;
      castMap[r.cast_id].total += r.price || 0;
    }
    return {
      salesByType: { cash, card, paypay, total },
      salesByCast: Object.values(castMap)
    };
  }

  // --- 指名詳細 ---
  function getShimeiDetail(reservations) {
    // 実際に使われている全指名種類を抽出（重複なし）
    const TYPES = Array.from(
      new Set(reservations.map(r => r.shimei || "フリー"))
    );
    const allTypes = {};
    const castMap = {};

    // 初期値0で用意
    TYPES.forEach(type => allTypes[type] = 0);

    for (const r of reservations) {
      const type = r.shimei || "フリー";
      allTypes[type] = (allTypes[type] || 0) + 1;

      // キャストごと
      if (!castMap[r.cast_id]) {
        // 全種0で初期化
        castMap[r.cast_id] = { id: r.cast_id, name: r.cast_name, pie: {} };
        TYPES.forEach(type2 => castMap[r.cast_id].pie[type2] = 0);
      }
      castMap[r.cast_id].pie[type] = (castMap[r.cast_id].pie[type] || 0) + 1;
    }

    // Pie用配列（全種対応）
    const shimeiPie = TYPES.map(type => ({ type, value: allTypes[type] || 0 }));
    const shimeiPieByCast = Object.values(castMap).map(cast => ({
      id: cast.id,
      name: cast.name,
      pie: TYPES.map(type => ({ type, value: cast.pie[type] || 0 }))
    }));

    return { shimeiPie, shimeiPieByCast };
  }

  // --- 稼働率 ---
  function getWorkRateDetail(shifts, reservations) {
    const workRateByCast = shifts.map(s => {
      // そのキャストの当日の予約（成約のみなど必要に応じて絞り込む）
      const castReservations = reservations.filter(r => r.cast_id === s.cast_id);

      // シフト時間（分）
      const start = toMinutes(s.start_time || "10:00");
      const end = toMinutes(s.end_time === "00:00" ? "24:00" : s.end_time || "22:00");
      const shiftMins = end > start ? end - start : 0;

      // 予約合計時間（分）
      const workMins = castReservations.reduce((sum, r) => sum + getDurationMins(r), 0);

      // 稼働率計算
      let rate = 0;
      if (shiftMins > 0) {
        rate = workMins / shiftMins * 100;
      }
      // 小数第1位＆".0"を除去
      const displayRate = shiftMins === 0 ? "0%" : (rate.toFixed(1).replace(/\.0$/, "") + "%");

      return {
        id: s.cast_id,
        name: s.cast_name,
        rate: shiftMins === 0 ? 0 : Number(rate), 
      };
    });
    return { workRateByCast };
  }

  // --- シフト詳細（KPI詳細：出勤情報カード用） ---
  function getShiftDetail(shifts, reservations, monthShifts=[]) {
    // 本日のシフト一覧
    const shiftTable = shifts.map(s => ({
      id: s.cast_id,
      name: s.cast_name,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    // --- 当月稼働時間（月間シフトで合計）
    const monthWorkByCast = {};
    (monthShifts.length > 0 ? monthShifts : shifts).forEach(s => {
      if (!s.is_active) return;
      if (!s.start_time || !s.end_time) return;
      const start = new Date(`${s.date}T${s.start_time}`);
      const end   = new Date(`${s.date}T${s.end_time}`);
      const diffH = (end - start) / (1000 * 60 * 60); // 時間
      if (!monthWorkByCast[s.cast_id]) monthWorkByCast[s.cast_id] = 0;
      monthWorkByCast[s.cast_id] += diffH;
    });

    // --- 当日欠勤率（当月全件から計算）
    const absentRateByCast = {};
    // 👇 ここで「今月分のshifts」全件が必要
    const targetShifts = monthShifts.length > 0 ? monthShifts : shifts;
    // キャストごとにカウント
    const group = {};
    targetShifts.forEach(s => {
      if (!group[s.cast_id]) group[s.cast_id] = { absent: 0, present: 0 };
      if (s.type === "当日欠勤") group[s.cast_id].absent += 1;
      if (s.type === "出勤")     group[s.cast_id].present += 1;
    });
    Object.entries(group).forEach(([castId, val]) => {
      const total = val.absent + val.present;
      let rate = 0;
      if (total > 0) {
        rate = (val.absent / total) * 100;
      }
      absentRateByCast[castId] =
        rate % 1 === 0 ? String(rate | 0) : rate.toFixed(1);
    });

    return {
      shiftTable,
      monthWorkByCast,
      absentRateByCast
    };
  }

  useEffect(() => {
    if (!storeId) return;
    const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
    const monthEnd   = dayjs().endOf("month").format("YYYY-MM-DD");
    // reservations本日
    supabase
      .from("reservations")
      .select("*")
      .eq("store_id", storeId)
      .gte("datetime", today + "T00:00:00")
      .lte("datetime", today + "T23:59:59")
      .then(({ data }) => setReservations(data || []));
    // shifts本日
    supabase
      .from("shifts")
      .select("*")
      .eq("store_id", storeId)
      .eq("date", today)
      .then(({ data }) => setShifts(data || []));
    // daily_reports（グラフ用）
    supabase
      .from("daily_reports")
      .select("*")
      .eq("store_id", storeId)
      .order("report_date", { ascending: true })
      .then(({ data }) => setDailyReports(data || []));
  }, [storeId, today]);

  useLayoutEffect(() => {
    function handleResize() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth - 4);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Box ref={containerRef}
      sx={{
        width: "100%", minHeight: "100vh", bgcolor: gradBG,
        py: 3.5, px: { xs: 1, md: 3 }
      }}
    >

      {/* KPIカード */}
      <Box sx={{ display: "flex", gap: "18px", mb: 2, minWidth: 0 }}>
        {kpiList.map(kpi => (
          <Box sx={{ flex: 1, minWidth: 0 }} key={kpi.key}>
            <AdminLteBox {...kpi} />
          </Box>
        ))}
      </Box>
      {/* 下段：自由レイアウト */}
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={120}
        width={width}
        isDraggable
        isResizable
        draggableHandle=".MuiCard-root"
        onLayoutChange={l => {
          setLayout(l);
          localStorage.setItem("reon-layout-dashboard", JSON.stringify(l));
        }}
        style={{ minHeight: 220, gap: "18px" }}
      >
        <div key="chart" style={{ height: "100%" }}><SalesProfitChartPanel dailyReports={dailyReports} /></div>
        <div key="todo" style={{ height: "100%" }}><TodoPanel /></div>
        <div key="recruitCard" style={{ height: "100%" }}><RecruitCardPanel dailyReports={dailyReports} /></div>
        <div key="weather" style={{ height: "100%" }}><WeatherPanel /></div>
        <div key="aiSummary" style={{ height: "100%" }}><AISummaryPanel /></div>
        <div key="calendar" style={{ height: "100%" }}><CalendarPanel /></div>
        <div key="alert" style={{ height: "100%" }}><AlertPanel /></div>
        <div key="actions" style={{ height: "100%" }}><ActionsPanel /></div>
      </GridLayout>
      <KpiDetailDialog
        open={dialog.open}
        type={dialog.type}
        onClose={() => setDialog({ open: false, type: "" })}
        salesByType={salesByType}
        salesByCast={salesByCast}
        shimeiPie={shimeiPie}
        shimeiPieByCast={shimeiPieByCast}
        shiftTable={shiftTable}
        monthWorkByCast={monthWorkByCast}
        absentRateByCast={absentRateByCast}
        workRateByCast={workRateByCast}
        todayShifts={shifts}
      />
    </Box>
  );
}