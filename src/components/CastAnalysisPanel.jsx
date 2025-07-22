import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Paper, Typography, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Chip, Divider, Grid, Card, CardContent, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField
} from "@mui/material";
import { supabase } from "../lib/supabase";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InsightsIcon from "@mui/icons-material/Insights";
import RepeatIcon from "@mui/icons-material/Repeat";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import BookIcon from "@mui/icons-material/Book";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Pie, PieChart, Legend, LineChart, Line } from "recharts";
import LinearProgress from "@mui/material/LinearProgress";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import ChatIcon from "@mui/icons-material/Chat";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import Stack from "@mui/material/Stack";

const accent = "#6366f1";
const magenta = "#e879f9";
const orange = "#ffbc42";
const green = "#10b981";
const pink = "#f472b6";
const upColor = "#10b981";
const downColor = "#f472b6";
const flatColor = "#a1a1aa";

const ALL_TABS = [
  { label: "出勤/稼働", icon: <CalendarTodayIcon sx={{mr:1}}/> },
  { label: "コース・OP", icon: <InsightsIcon sx={{mr:1}}/> },
  { label: "指名/本指名", icon: <AssignmentIndIcon sx={{mr:1}}/> },
  { label: "新規/リピート", icon: <RepeatIcon sx={{mr:1}}/> },
  { label: "売上・給料", icon: <ShowChartIcon sx={{mr:1}}/> },
  { label: "日記分析", icon: <BookIcon sx={{mr:1}}/> },
  { label: "退店リスク", icon: <TrendingUpIcon sx={{mr:1}}/> },
  { label: "アクション提案", icon: <PersonIcon sx={{mr:1}}/> }
];

function DiffBadge({ diff }) {
  if (diff > 0) return <Chip icon={<ArrowUpwardIcon sx={{color: upColor}}/>} label={`+${diff}`} sx={{bgcolor:"#d1fae5", color:upColor, fontWeight:700, ml:1}} onClick={() => {}}/>;
  if (diff < 0) return <Chip icon={<ArrowDownwardIcon sx={{color:downColor}}/>} label={`${diff}`} sx={{bgcolor:"#ffe4e6", color:downColor, fontWeight:700, ml:1}} onClick={() => {}}/>;
  return <Chip icon={<TrendingFlatIcon sx={{color:flatColor}}/>} label="±0" sx={{bgcolor:"#f3f4f6", color:flatColor, fontWeight:700, ml:1}} onClick={() => {}}/>;
}

function KpiCard({ icon, label, value, unit, diff, color, children }) {
  return (
    <Card sx={{ minWidth: 120, borderRadius: 3, boxShadow: "0 2px 10px #6366f122", m:1 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ bgcolor: "#eef2ff", color: color||accent, width:36, height:36 }}>{icon}</Avatar>
          <Typography fontWeight={900} fontSize={18}>{value}<span style={{fontSize:13, fontWeight:500, color:"#888"}}>{unit}</span></Typography>
          {diff !== undefined && <DiffBadge diff={diff} />}
        </Box>
        <Typography fontSize={14} color="text.secondary" fontWeight={600} mt={0.5}>{label}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function BarGraph({ data, color, title, valueKey="count", labelKey="label", height=180 }) {
  if (data.length === 0) return <Typography color="#bbb">データなし</Typography>;
  return (
    <Box mt={2}>
      <Typography fontWeight={700} mb={1}>{title}</Typography>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
          <XAxis dataKey={labelKey} fontSize={12}/>
          <YAxis fontSize={12} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey={valueKey} radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function PieGraph({ data, colors, title, height=220 }) {
  if (data.length === 0) return <Typography color="#bbb">データなし</Typography>;
  return (
    <Box mt={2} width="100%">
      <Typography fontWeight={700} mb={1}>{title}</Typography>
      <ResponsiveContainer width="100%" minWidth={200} height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%" cy="50%" outerRadius={70}
            innerRadius={35}
            label
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
}

// グラフ用データ生成
function getDiaryDay(d, fallbackYearMonth) {
  // 例: d.date = "07月15日 16:39"
  if (!d.date) return d.report_date || null;
  const match = d.date.match(/(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const month = match[1].padStart(2, "0");
    const day = match[2].padStart(2, "0");
    // 年は report_date から補完
    let year = "2025";
    if (d.report_date && /^\d{4}-\d{2}-\d{2}$/.test(d.report_date)) {
      year = d.report_date.slice(0, 4);
    } else if (fallbackYearMonth) {
      year = fallbackYearMonth.slice(0, 4);
    }
    return `${year}-${month}-${day}`;
  }
  return d.report_date || null;
}

function aggregateDiaryByDay(list, selectedMonth) {
  const dayMap = {};
  (list || []).forEach(d => {
    // 年月補完（report_dateやselectedMonthを利用）
    const fallbackYearMonth =
      d.report_date && d.report_date.length >= 7
        ? d.report_date.slice(0, 7)
        : selectedMonth || "2025-07";
    const day = getDiaryDay(d, fallbackYearMonth);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    if (selectedMonth && !day.startsWith(selectedMonth)) return;
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  return Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getDaysInMonth(monthStr) {
  // 例: "2025-07" -> 31
  const [year, month] = monthStr.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function makeDiaryCountData(diaryList, selectedMonth) {
  // 1日ごとのカウント初期化
  const days = getDaysInMonth(selectedMonth);
  const result = Array.from({ length: days }, (_, i) => ({
    date: `${i + 1}日`,
    count: 0,
  }));
  // カウント
  diaryList.forEach(d => {
    // 日付が "2025-07-14" or "2025-07-14T21:11" 等を考慮
    const dateStr = (d.date || d.datetime || d.report_date || "").slice(0, 10);
    if (!dateStr.startsWith(selectedMonth)) return;
    const day = Number(dateStr.split("-")[2]); // "14"
    if (day >= 1 && day <= days) result[day - 1].count += 1;
  });
  return result;
} 

function DiaryCountGraph({ data }) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          fontSize={12}
          tickFormatter={d => d.slice(5).replace("-", "/")} // "07-11" → "07/11"
        />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#3b82f6" }}
          activeDot={{ r: 10, fill: "#0ea5e9" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function getPrevMonth(selectedMonth) {
  if (!selectedMonth) return "";
  const [y, m] = selectedMonth.split("-");
  let year = Number(y);
  let month = Number(m) - 1;
  if (month === 0) {
    year--;
    month = 12;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toAbsoluteHeavenUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  // /main_window で始まる場合も対応
  return "https://newmanager.cityheaven.net" + url.replace(/^\/?main_window/, "");
}


export default function CastAnalysisPanel({ storeId, selectedMonth, canUseCastDiaryAnalysis = true, }) {

  // 出勤扱いtypeだけをtrueにする共通フィルター
  const isActualAttendance = s =>
    s.type === "出勤済み" || s.type === "遅刻" || s.type === "早退";

  const [shiftDetail, setShiftDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function handleShiftClick(shift) {
    setShiftDetail(shift);
    setDetailOpen(true);
  }

  const [casts, setCasts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [prevReservations, setPrevReservations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [prevShifts, setPrevShifts] = useState([]);
  const [selectedCastId, setSelectedCastId] = useState("");
  const [tabIdx, setTabIdx] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [opOptions, setOpOptions] = useState([]);
  const [salesTarget, setSalesTarget] = useState(300000);
  const [editTarget, setEditTarget] = useState(false);
  const [shimeiMenus, setShimeiMenus] = useState([]);

  const [storeInfo, setStoreInfo] = useState(null);

  // storeInfo取得（すでに取得していればOK、なければ↓追加）
  useEffect(() => {
    console.log("storeId:", storeId);
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();
      setStoreInfo(data || null);
    })();
  }, [storeId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("category", "コース")
        .order("duration", { ascending: true });
      setCourseList(data || []);
    })();
  }, [storeId]);
  const normalCourses = courseList.filter(c => /^\d+分$/.test(c.name)).sort((a, b) => parseInt(a.name) - parseInt(b.name));
  const extCourses = courseList.filter(c => c.name.startsWith("延長")).sort((a, b) => parseInt(a.name.replace(/[^\d]/g, "")) - parseInt(b.name.replace(/[^\d]/g, "")));
  const specialCourses = courseList.filter(
    c => !/^\d+分$/.test(c.name) && !c.name.startsWith("延長") && !c.name.includes("OP")
  ).sort((a, b) => parseInt(a.name.replace(/[^\d]/g, "")) - parseInt(b.name.replace(/[^\d]/g, "")));

  const opCourses = courseList.filter(c => c.name.includes("OP"));
  const sortedCourses = [...normalCourses, ...extCourses, ...specialCourses, ...opCourses];
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("customers").select("*");
      setCustomers(data || []);
    })();
  }, []);
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("casts")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("role", "キャスト");
      setCasts(data || []);
      if (data?.length > 0) setSelectedCastId(String(data[0].id));
    })();
  }, [storeId]);
  useEffect(() => {
    if (casts.length) setSelectedCastId(String(casts[0].id));
    else setSelectedCastId("");
  }, [casts]);
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("category", "OP");
      setOpOptions(data || []);
    })();
  }, [storeId]);
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("category", "指名");
      setShimeiMenus(data || []);
    })();
  }, [storeId]);
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    (async () => {
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01T00:00:00`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate);
      setReservations(data || []);
    })();
  }, [storeId, selectedMonth]);
  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    (async () => {
      const prevMonth = getPrevMonth(selectedMonth);
      if (!prevMonth) return;
      const [year, month] = prevMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01T00:00:00`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate);
      setPrevReservations(data || []);
    })();
  }, [storeId, selectedMonth]);
  useEffect(() => {
    if (!storeId || !selectedMonth || !selectedCastId) return;
    (async () => {
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      const castIdNum = Number(selectedCastId);
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("cast_id", castIdNum)
        .gte("date", fromDate)
        .lte("date", toDate);
      setShifts(data || []);
    })();
  }, [storeId, selectedMonth, selectedCastId]);
  useEffect(() => {
    if (!storeId || !selectedMonth || !selectedCastId) return;
    (async () => {
      const prevMonth = getPrevMonth(selectedMonth);
      if (!prevMonth) return;
      const [year, month] = prevMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      const castIdNum = Number(selectedCastId);
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("cast_id", castIdNum)
        .gte("date", fromDate)
        .lte("date", toDate);
      setPrevShifts(data || []);
    })();
  }, [storeId, selectedMonth, selectedCastId]);

  useEffect(() => {
    if (!storeId || !selectedCastId || !selectedMonth) return;
    (async () => {
      const { data } = await supabase
        .from("salary_targets")
        .select("*")
        .eq("store_id", storeId)
        .eq("cast_id", selectedCastId)
        .eq("month", selectedMonth)
        .maybeSingle();
      if (data && data.target) {
        setSalesTarget(data.target);
      } else {
        setSalesTarget(300000); // デフォルト値
      }
    })();
  }, [storeId, selectedCastId, selectedMonth]);

  useEffect(() => {
    console.log("storeInfo:", storeInfo);
  }, [storeInfo]);

  useEffect(() => {
    if (tabIdx >= TABS.length) setTabIdx(0);
    // 「日記分析」タブが非表示になった場合にも対応
  }, [TABS, tabIdx]);

  const isSRankStore = useMemo(
    () => storeInfo && ["S", "Ｓ", "Sランク", "Ｓランク"].includes(storeInfo.rank),
    [storeInfo]
  );

  const TABS = useMemo(
    () => isSRankStore
      ? ALL_TABS
      : ALL_TABS.filter(tab => tab.label !== "日記分析"),
    [isSRankStore, storeInfo]
  );

  // ...getTabIndexもこの中に書く！
  const getTabIndex = label => TABS.findIndex(t => t.label === label);

  // 前月分の新規顧客ID
  const prevThisCastNewCustomerIds = useMemo(() => {
    if (!selectedMonth) return [];
    const prevMonth = getPrevMonth(selectedMonth);
    if (!prevMonth) return [];
    const [year, month] = prevMonth.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate(); 
    const monthStart = `${year}-${month}-01T00:00:00`;
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
    const map = {};
    (prevCastReservations || []).forEach(r => {
      if (!r.customer_id) return;
      const cid = String(r.customer_id);
      if (!map[cid]) map[cid] = [];
      map[cid].push(r);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)));
    return Object.entries(map)
      .filter(([cid, list]) => {
        if (!list.length) return false;
        const first = list[0];
        return first.datetime >= monthStart && first.datetime <= monthEnd;
      })
      .map(([cid]) => cid);
  }, [prevCastReservations, selectedMonth]);
  
  const prevNewCustomerReservations = useMemo(() =>
    (prevCastReservations || []).filter(r =>
      (prevThisCastNewCustomerIds || []).includes(String(r.customer_id))
    ),
    [prevCastReservations, prevThisCastNewCustomerIds]
  );
  
  const prevRepeatVisits = useMemo(() => {
    const visitMap = {};
    (prevNewCustomerReservations || []).forEach(r => {
      const cid = String(r.customer_id);
      if (!visitMap[cid]) visitMap[cid] = [];
      visitMap[cid].push(r);
    });
    let totalRepeat = 0;
    Object.values(visitMap).forEach(list => {
      if (list.length > 1) totalRepeat += (list.length - 1);
    });
    return totalRepeat;
  }, [prevNewCustomerReservations]);
  
  const prevUniqueNewCustomerIds = useMemo(() => {
    return Array.from(new Set(prevThisCastNewCustomerIds || []));
  }, [prevThisCastNewCustomerIds]);
  
  const prevRepeatCustomerCount = useMemo(() => {
    return (prevUniqueNewCustomerIds || []).filter(cid =>
      (prevCastReservations || []).filter(r => String(r.customer_id) === cid).length >= 2
    ).length;
  }, [prevCastReservations, prevUniqueNewCustomerIds]);
  
  const prevNewRepeatRatePerson = (prevUniqueNewCustomerIds && prevUniqueNewCustomerIds.length > 0)
    ? ((prevRepeatCustomerCount / prevUniqueNewCustomerIds.length) * 100).toFixed(1)
    : "0.0";
  
  const prevNewRepeatRate = (prevNewCustomerReservations && prevNewCustomerReservations.length > 0)
    ? ((prevRepeatVisits / prevNewCustomerReservations.length) * 100).toFixed(1)
    : "0.0";
  
  // ==== ここからキャンセル除外 ====
  const castReservations = useMemo(
    () =>
      Array.isArray(reservations)
        ? reservations.filter(
            r =>
              String(r.cast_id) === String(selectedCastId) &&
              r.kubun !== "キャンセル" &&
              r.kubun !== "ノーショウ"
          )
        : [],
    [reservations, selectedCastId]
  );
  const prevCastReservations = useMemo(
    () =>
      Array.isArray(prevReservations)
        ? prevReservations.filter(
            r =>
              String(r.cast_id) === String(selectedCastId) &&
              r.kubun !== "キャンセル" &&
              r.kubun !== "ノーショウ"
          )
        : [],
    [prevReservations, selectedCastId]
  );

  // 顧客IDごとに予約まとめ
  const customerReservations = useMemo(() => {
    const map = {};
    castReservations.forEach(r => {
      if (!r.customer_id) return;
      if (!map[r.customer_id]) map[r.customer_id] = [];
      map[r.customer_id].push(r);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)));
    return map;
  }, [castReservations]);

  const thisMonthNewCustomerIds = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate(); 
    const monthStart = `${year}-${month}-01T00:00:00`;
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
    return Object.entries(customerReservations)
      .filter(([cid, list]) => {
        if (!list.length) return false;
        const first = list[0];
        return first.datetime >= monthStart && first.datetime <= monthEnd;
      })
      .map(([cid]) => cid);
  }, [customerReservations, selectedMonth]);

  const thisCastNewCustomerIds = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const monthStart = `${year}-${month}-01T00:00:00`;
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
    const map = {};
    castReservations.forEach(r => {
      if (!r.customer_id) return;
      const cid = String(r.customer_id);
      if (!map[cid]) map[cid] = [];
      map[cid].push(r);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)));
    return Object.entries(map)
      .filter(([cid, list]) => {
        if (!list.length) return false;
        const first = list[0];
        return first.datetime >= monthStart && first.datetime <= monthEnd;
      })
      .map(([cid]) => cid);
  }, [castReservations, selectedMonth]);

  const storeRepeatCount = useMemo(() => {
    if (!selectedMonth) return { repeatNum: 0, repeatRate: "0.0" };
    const [year, month] = selectedMonth.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const monthStart = `${year}-${month}-01T00:00:00`;
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
    let repeatNum = 0;
    thisCastNewCustomerIds.forEach(cid => {
      const visits = castReservations
        .filter(r =>
          String(r.customer_id) === String(cid) &&
          r.datetime >= monthStart && r.datetime <= monthEnd
        )
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      if (visits.length >= 2) repeatNum++;
    });
    const repeatRate = thisCastNewCustomerIds.length
      ? ((repeatNum / thisCastNewCustomerIds.length) * 100).toFixed(1)
      : "0.0";
    return { repeatNum, repeatRate };
  }, [castReservations, thisCastNewCustomerIds, selectedMonth]);

  const newCustomerReservations = useMemo(() =>
    castReservations.filter(r =>
      thisMonthNewCustomerIds.includes(String(r.customer_id))
    ),
    [castReservations, thisMonthNewCustomerIds]
  );
  const repeatVisits = useMemo(() => {
    const visitMap = {};
    newCustomerReservations.forEach(r => {
      const cid = String(r.customer_id);
      if (!visitMap[cid]) visitMap[cid] = [];
      visitMap[cid].push(r);
    });
    let totalRepeat = 0;
    Object.values(visitMap).forEach(list => {
      if (list.length > 1) totalRepeat += (list.length - 1);
    });
    return totalRepeat;
  }, [newCustomerReservations]);
  const uniqueNewCustomerIds = useMemo(() => {
    return Array.from(new Set(thisCastNewCustomerIds));
  }, [thisCastNewCustomerIds]);
  const repeatCustomerCount = useMemo(() => {
    return uniqueNewCustomerIds.filter(cid =>
      castReservations.filter(r => String(r.customer_id) === cid).length >= 2
    ).length;
  }, [castReservations, uniqueNewCustomerIds]);
  const newRepeatRatePerson = uniqueNewCustomerIds.length > 0
    ? ((repeatCustomerCount / uniqueNewCustomerIds.length) * 100).toFixed(1)
    : "0.0";
  const newRepeatRate = newCustomerReservations.length > 0
    ? ((repeatVisits / newCustomerReservations.length) * 100).toFixed(1)
    : "0.0";
//  const totalHours = totalWorkMinutes ? (totalWorkMinutes / 60) : 0; //

  const cancelled = reservations.filter(r => String(r.cast_id) === String(selectedCastId) && (r.kubun === "キャンセル" || r.kubun === "ノーショウ"));
  const cancelLoss = cancelled.reduce((sum, r) => sum + (r.price || 0), 0);
  const customerIdToName = useMemo(() => {
    const map = {};
    customers.forEach(c => map[String(c.id)] = c.name);
    return map;
  }, [customers]);
  const shiftReservations = useMemo(() => {
    if (!shiftDetail || !Array.isArray(castReservations)) return [];
    const toDateYMD = v => {
      if (!v) return "";
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === "string") {
        if (v.includes("/")) {
          const [y, m, d] = v.split(" ")[0].split("/");
          return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        if (v.includes("-")) {
          return v.split("T")[0];
        }
      }
      return "";
    };
    return castReservations.filter(
      r => toDateYMD(r.datetime) === toDateYMD(shiftDetail.date)
    );
  }, [shiftDetail, castReservations]);
  const courseSales = useMemo(() => {
    const map = {};
    courseList.forEach(c => map[c.name] = 0);
    castReservations.forEach(r => {
      if (r.course && map.hasOwnProperty(r.course)) map[r.course] += (r.price || 0);
    });
    return Object.entries(map)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));
  }, [castReservations, courseList]);
  const opSales = useMemo(() => {
    const map = {};
    opOptions.forEach(o => map[o.name] = 0);
    castReservations.forEach(r => {
      let opArr = [];
      if (Array.isArray(r.op)) opArr = r.op;
      else if (typeof r.op === "string" && r.op.startsWith("[")) try { opArr = JSON.parse(r.op); } catch {}
      if (opArr.length > 0 && r.op_price) {
        opArr.forEach(op => {
          if (map.hasOwnProperty(op)) map[op] += r.op_price / opArr.length;
        });
      }
    });
    return Object.entries(map)
      .filter(([_, v]) => v > 0)
      .map(([label, value]) => ({ label, value }));
  }, [castReservations, opOptions]);
  const workingDays = Number(
    useMemo(() => (new Set(shifts.filter(isActualAttendance).map(s => s.date))).size, [shifts])
  );
  const denominator = workingDays + absentDays;
  const realWorkingDays = useMemo(() => shifts.filter(s => s.start_time && s.end_time).length, [shifts]);
  const totalWorkingMinutes = useMemo(() => (
    shifts.reduce((sum, s) => {
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        let minutes = (eh * 60 + em) - (sh * 60 + sm);
        if (minutes < 0) minutes += 24 * 60;
        return sum + minutes;
      }
      return sum;
    }, 0)
  ), [shifts]);
  const totalShiftMinutes = useMemo(() =>
    shifts.reduce((sum, s) => {
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        let min = (eh * 60 + em) - (sh * 60 + sm);
        if (min < 0) min += 24 * 60;
        return sum + min;
      }
      return sum;
    }, 0)
  , [shifts]);

  // --- 総実働分 ---
  const totalWorkMinutes = useMemo(
    () =>
      Array.isArray(castReservations)
        ? castReservations.reduce((sum, r) => {
            if (r.start_time && r.end_time) {
              const [sh, sm] = r.start_time.split(":").map(Number);
              const [eh, em] = r.end_time.split(":").map(Number);
              let min = (eh * 60 + em) - (sh * 60 + sm);
              if (min < 0) min += 24 * 60;
              return sum + min;
            }
            return sum;
          }, 0)
        : 0,
    [castReservations]
  );

  const workingRate = totalShiftMinutes
    ? Number(((totalWorkMinutes / totalShiftMinutes) * 100).toFixed(1))
    : 0;
  const avgWorkingMinutes = realWorkingDays ? Math.round(totalWorkingMinutes / realWorkingDays) : 0;
  const prevWorkingDays = useMemo(() => (new Set(prevShifts.map(s => s.date))).size, [prevShifts]);
  const prevWorkingRate = Number(((prevWorkingDays / 30) * 100).toFixed(1));
  function countMap(arr, key) {
    const obj = {};
    arr.forEach(r => {
      if (r[key]) obj[r[key]] = (obj[r[key]] || 0) + 1;
    });
    return obj;
  }
  function countCourseByName(arr, courseList) {
    const obj = {};
      courseList.forEach(c => { obj[c.name] = 0; });
    arr.forEach(r => {
      if (r.course && obj.hasOwnProperty(r.course)) {
        obj[r.course]++;
      }
    });
    return obj;
  }
  const courseCount = useMemo(() => countCourseByName(castReservations, courseList), [castReservations, courseList]);
  const prevCourseCount = useMemo(() => countCourseByName(prevCastReservations, courseList), [prevCastReservations, courseList]);
  function opStat(resArr) {
    let opTotal = 0, opPriceTotal = 0, opUsage = 0;
    resArr.forEach(r => {
      let opArr = [];
      if (Array.isArray(r.op)) opArr = r.op;
      else if (typeof r.op === "string" && r.op.startsWith("[")) try { opArr = JSON.parse(r.op); } catch {}
      if (opArr && opArr.length > 0) {
        opUsage += 1;
        opTotal += opArr.length;
      }
      opPriceTotal += Number(r.op_price) || 0;
    });
    const usageRate = resArr.length ? Math.round((opUsage / resArr.length) * 100) : 0;
    return { opTotal, opUsage, opPriceTotal, usageRate };
  }
  const opStats = useMemo(() => opStat(castReservations), [castReservations]);
  const prevOpStats = useMemo(() => opStat(prevCastReservations), [prevCastReservations]);
  function countOpByNameWithNoUse(resArr, opList) {
    const obj = {};
    if (Array.isArray(opList)) opList.forEach(op => { obj[op] = 0; });
    let noOpCount = 0;
    resArr.forEach(r => {
      let opArr = [];
      if (Array.isArray(r.op)) opArr = r.op;
      else if (typeof r.op === "string" && r.op.startsWith("[")) {
        try { opArr = JSON.parse(r.op); } catch {}
      }
      if (Array.isArray(opArr) && opArr.length > 0) {
        opArr.forEach(op => {
          if (obj.hasOwnProperty(op)) obj[op]++;
          else obj[op] = 1;
        });
      } else {
        noOpCount++;
      }
    });
    obj["OP未利用"] = noOpCount;
    return obj;
  }
  const opNames = useMemo(
    () => opOptions && Array.isArray(opOptions) ? opOptions.map(o => o.name) : [],
    [opOptions]
  );
  const opNameCount = useMemo(
    () => countOpByNameWithNoUse(castReservations, opNames),
    [castReservations, opNames]
  );
  const opPieData = Object.entries(opNameCount)
    .filter(([name, count]) => count > 0)
    .map(([label, value]) => ({ label, value }));
  const shimeiCount = useMemo(() => countMap(castReservations, "shimei"), [castReservations]);
  const prevShimeiCount = useMemo(() => countMap(prevCastReservations, "shimei"), [prevCastReservations]);
  const shimeiTotal = Object.values(shimeiCount).reduce((a, b) => a + b, 0);
  const prevShimeiTotal = Object.values(prevShimeiCount).reduce((a, b) => a + b, 0);
  const workComment = useMemo(() => {
    if (!selectedMonth) return "";
    if (prevWorkingDays === 0) return "前月データがありません。";
    const diff = (workingRate - prevWorkingRate).toFixed(1);
    if (diff > 5) return `稼働率が前月より${diff}%アップ！（今月${workingRate}%、前月${prevWorkingRate}%）`;
    if (diff < -5) return `稼働率が前月より${Math.abs(diff)}%ダウン（今月${workingRate}%、前月${prevWorkingRate}%）。無理のない範囲で出勤数UPを狙いましょう。`;
    return `稼働率は前月とほぼ同じです（今月${workingRate}%、前月${prevWorkingRate}%）。`;
  }, [workingRate, prevWorkingRate, prevWorkingDays, selectedMonth]);
  const courseComment = useMemo(() => {
    if (Object.keys(courseCount).length === 0) return "コース実績がありません。";
    if (Object.keys(prevCourseCount).length === 0) return "前月コース実績データがありません。";
    const result = [];
    for (const k in courseCount) {
      const now = courseCount[k] || 0;
      const prev = prevCourseCount[k] || 0;
      const diff = now - prev;
      result.push(`${k}：${now}件（${diff >= 0 ? "+" : ""}${diff}件）`);
    }
    return "今月と前月のコース利用差分 " + result.join(" ／ ");
  }, [courseCount, prevCourseCount]);
  const opComment = useMemo(() => {
    if (!opStats.opTotal) return "OP利用はありません。";
    if (!prevOpStats.opTotal) return `OP利用率は${opStats.usageRate}%、合計${opStats.opTotal}回（前月データなし）`;
    const diff = opStats.opTotal - prevOpStats.opTotal;
    return `OP利用：${opStats.opTotal}回（前月${prevOpStats.opTotal}回、${diff >= 0 ? "+" : ""}${diff}回）`;
  }, [opStats, prevOpStats]);
  const shimeiComment = useMemo(() => {
    if (Object.keys(shimeiCount).length === 0) return "指名データがありません。";
    if (Object.keys(prevShimeiCount).length === 0) return "前月指名データがありません。";
    const now = shimeiTotal, prev = prevShimeiTotal;
    const diff = now - prev;
    return `総指名件数：${now}件（前月${prev}件、${diff >= 0 ? "+" : ""}${diff}件）`;
  }, [shimeiCount, prevShimeiCount, shimeiTotal, prevShimeiTotal]);
  const repeatComment = useMemo(() => {
    if (newCustomerReservations.length === 0)
      return "新規接客データがありません。";
    if (repeatVisits === 0)
      return "今月の新規顧客によるリピートはまだありません。";
    return `新規接客${newCustomerReservations.length}件中、${repeatVisits}件がリピート（新規リピート率${newRepeatRate}%）`;
  }, [newCustomerReservations.length, repeatVisits, newRepeatRate]);
  // --- 総給料 ---
  const totalSalary = useMemo(
    () => Array.isArray(castReservations) ? castReservations.reduce((acc, r) => acc + (Number(r.cast_pay) || 0), 0) : 0,
    [castReservations]
  );
  const avgPrice = (castReservations.reduce((sum, r) => sum + (r.price || 0), 0) / (castReservations.length || 1)).toFixed(0);
  const prevTotalSalary = prevCastReservations.reduce((acc, r) => acc + (r.cast_pay || 0), 0);
  const prevAvgPrice = (prevCastReservations.reduce((sum, r) => sum + (r.price || 0), 0) / (prevCastReservations.length || 1)).toFixed(0);
  const prevCastCount = prevCastReservations.length;

  // --- リスク管理 ---
  // 1. 直近3ヶ月分のシフト日数を取得
  const [prevPrevShifts, setPrevPrevShifts] = useState([]);
  useEffect(() => {
    if (!storeId || !selectedMonth || !selectedCastId) return;
    (async () => {
      // 先々月
      const [y, m] = getPrevMonth(getPrevMonth(selectedMonth)).split("-");
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const fromDate = `${y}-${m}-01`;
      const toDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      const castIdNum = Number(selectedCastId);
      const { data } = await supabase
        .from("shifts")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .eq("cast_id", castIdNum)
        .gte("date", fromDate)
        .lte("date", toDate);
      setPrevPrevShifts(data || []);
    })();
  }, [storeId, selectedMonth, selectedCastId]);

  // 面談追加ダイアログ用
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingMemo, setMeetingMemo] = useState("");
  const [meetingResult, setMeetingResult] = useState("");
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingListOpen, setMeetingListOpen] = useState(false);


  const handleAddMeeting = async () => {
    if (!selectedCastId || !meetingDate) {
      alert("面談日を入力してください");
      return;
    }
    setSavingMeeting(true);
    const { error } = await supabase.from("cast_meetings").insert({
      store_id: storeId,
      cast_id: selectedCastId,
      meeting_date: meetingDate,
      memo: meetingMemo,
      result: meetingResult,
    });
    setSavingMeeting(false);
    if (error) {
      alert("保存失敗：" + error.message);
      return;
    }
    setMeetingDialogOpen(false);
    setMeetingDate("");
    setMeetingMemo("");
    setMeetingResult("");
    // 保存後に一覧再取得
    const { data } = await supabase
      .from("cast_meetings")
      .select("*")
      .eq("store_id", storeId)
      .eq("cast_id", selectedCastId)
      .order("meeting_date", { ascending: false });
    setMeetings(data || []);
  };

  const handleAddMemo = async () => {
    if (!selectedCastId || !memoText.trim()) {
      alert("対応内容を入力してください");
      return;
    }
    if (!userName.trim()) {
      alert("スタッフ名を入力してください");
      return;
    }
    setSavingMemo(true);
    const { error } = await supabase.from("cast_memos").insert({
      store_id: storeId,
      cast_id: selectedCastId,
      memo: memoText,
      staff_name: userName,
      created_at: new Date().toISOString()
    });
    setSavingMemo(false);
    if (error) {
      alert("保存エラー: " + error.message);
      return;
    }
    setMemoText("");   // メモ欄クリア
    setUserName("");   // スタッフ名クリア
    // 保存後リロード
    const { data } = await supabase
      .from("cast_memos")
      .select("*")
      .eq("store_id", storeId)
      .eq("cast_id", selectedCastId)
      .order("created_at", { ascending: false })
      .limit(3);
    setMemos(data || []);
  };

  const [adviceOpen, setAdviceOpen] = useState(false);

  const [memoText, setMemoText] = useState("");     // 入力値管理
  const [savingMemo, setSavingMemo] = useState(false); // 二重送信防止
  const [userName, setUserName] = useState("");

  // 備考・日記・面談履歴取得（必要に応じてテーブル名など要修正）
  const [diaries, setDiaries] = useState([]);
  const [memos, setMemos] = useState([]);
  const [meetings, setMeetings] = useState([]);
  useEffect(() => {
    if (!selectedCastId || !selectedMonth) return;
    (async () => {
      // 日記
      const [y, m] = selectedMonth.split("-");
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const fromDate = `${y}-${m}-01`;
      const toDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
      const { data } = await supabase
        .from("diaries")
        .select("*")
        .eq("cast_id", selectedCastId)
        .gte("date", fromDate)
        .lte("date", toDate);
      setDiaries(data || []);
    })();
    (async () => {
      // メモ
      const { data } = await supabase
        .from("cast_memos")
        .select("*")
        .eq("cast_id", selectedCastId)
        .order("created_at", { ascending: false })
        .limit(3);
      setMemos(data || []);
    })();
    (async () => {
      // 面談
      const { data } = await supabase
        .from("cast_meetings")
        .select("*")
        .eq("cast_id", selectedCastId)
        .order("meeting_date", { ascending: false });
      setMeetings(data || []);
    })();
  }, [selectedCastId, selectedMonth]);

  // 個別写メ日記取得
  const [diaryReportLogs, setDiaryReportLogs] = useState([]);
  const [dailyDiaryCounts, setDailyDiaryCounts] = useState({});
  const [diaryList, setDiaryList] = useState([]);
  const graphData = useMemo(() =>
    aggregateDiaryByDay(diaryList, selectedMonth),
    [diaryList, selectedMonth]
  );

  const [selectedDiary, setSelectedDiary] = useState(null);
  const [diaryDialogOpen, setDiaryDialogOpen] = useState(false);

  const sortedDiaryList = useMemo(() => {
    return [...diaryList].sort((a, b) => {
      const dateA = (a.report_date || a.date || "").replace(/[^\d]/g, "");
      const dateB = (b.report_date || b.date || "").replace(/[^\d]/g, "");
      return Number(dateB) - Number(dateA);
    });
  }, [diaryList]);

  // selectedCastNameを取得
  const selectedCastName = useMemo(() => {
    const selectedCast = casts.find(c => String(c.id) === String(selectedCastId));
    return selectedCast ? selectedCast.name : "";
  }, [casts, selectedCastId]);
  
  useEffect(() => {
  if (!storeId || !selectedCastId || !selectedMonth || !selectedCastName) return;
  (async () => {
    const [year, month] = selectedMonth.split("-");
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const fromDate = `${year}-${month}-01`;
    const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // daily_reportsからこの月のレコード取得
    const { data, error } = await supabase
      .from("daily_reports")
      .select("report_date, diary_logs")
      .eq("store_id", storeId)
      .gte("report_date", fromDate)
      .lte("report_date", toDate);

    if (error) {
      setDiaryReportLogs([]);
      setDailyDiaryCounts({});
      setDiaryList([]);
      return;
    }

    // すべての日記を抽出（全キャスト分）
    const allDiaries = [];
    (data || []).forEach(row => {
      if (Array.isArray(row.diary_logs)) {
        row.diary_logs.forEach(d => {
          allDiaries.push({ ...d, report_date: row.report_date });
        });
      }
    });
    // ここでキャスト名の一致をログ出力
    const names = new Set(allDiaries.map(d => d.cast));

    const clean = v => (v ? String(v).trim() : "");
    const diariesOfCast = allDiaries.filter(d => 
      clean(d.cast) === clean(selectedCastName)
    );
    const graphData = aggregateDiaryByDay(diariesOfCast);

    // ★ここで「d.date」で集計
    const dailyDiaryCountsObj = {};
    diariesOfCast.forEach(d => {
      const day = d.date || d.report_date || ""; // ←まずd.dateを見る
      if (!day) return;
      dailyDiaryCountsObj[day] = (dailyDiaryCountsObj[day] || 0) + 1;
    });

    // これをそのままDiaryCountGraphに渡す
    setDiaryReportLogs(diariesOfCast);
    setDailyDiaryCounts(dailyDiaryCountsObj);
    setDiaryList(diariesOfCast);
  })();
}, [storeId, selectedCastId, selectedMonth, selectedCastName]);

  // 直近3ヶ月の出勤日数
  const prevPrevWorkingDays = useMemo(() => (new Set(prevPrevShifts.map(s => s.date))).size, [prevPrevShifts]);

  // 1. 2か月連続出勤日数低下
  const shiftRate1 = prevWorkingDays > 0 ? ((workingDays - prevWorkingDays) / prevWorkingDays) * 100 : 0;
  const shiftRate2 = prevPrevWorkingDays > 0 ? ((prevWorkingDays - prevPrevWorkingDays) / prevPrevWorkingDays) * 100 : 0;
  const risk_shift_down = shiftRate1 < 0 && shiftRate2 < 0;

  // 2. 稼働率（接客時間/出勤時間）30％以下
  const risk_working_rate = workingRate <= 30;

  // 3. 今月給料合計50％以下
  const risk_salary_low = totalSalary <= salesTarget * 0.5;

  // 4. 前月比給料-40％
  const risk_salary_down = ((prevTotalSalary > 0) && ((totalSalary - prevTotalSalary) / prevTotalSalary) <= -0.4);

  // 5. 1日あたり給料平均 目標の半分以下
  const avgPerDay = workingDays ? (totalSalary / workingDays) : 0;
  const avgTarget = workingDays ? (salesTarget / workingDays) : 0;
  const risk_salary_per_day = avgPerDay <= avgTarget * 0.5;

  // 6. 欠勤回数（30%/連続3回以上）
  const absentDays = useMemo(
    () => shifts.filter(s => s.type === "当日欠勤").length,
    [shifts]
  );

  const shiftSubmittedDays = useMemo(
    () => (new Set(shifts.map(s => s.date))).size,
    [shifts]
  );

  const absentRate = useMemo(
    () => shiftSubmittedDays > 0 ? ((absentDays / shiftSubmittedDays) * 100).toFixed(1) : "0.0",
    [absentDays, shiftSubmittedDays]
  );

  const shiftDays = useMemo(
    () => shifts.filter(isActualAttendance).map(s => s.date).sort(),
    [shifts]
  );

  let maxConsecutiveAbsent = 0, cur = 0;
  shifts.forEach(s => {
    if (s.type === "当日欠勤") cur++;
    else cur = 0;
    if (cur > maxConsecutiveAbsent) maxConsecutiveAbsent = cur;
  });
  const risk_absent =
    (workingDays > 0 && absentDays >= Math.ceil(workingDays * 0.3)) ||
    (maxConsecutiveAbsent >= 3);

  // 7. 最終出勤日から14日以上
  const today = new Date();
  const actualShiftList = useMemo(
    () => shifts.filter(isActualAttendance).sort((a, b) => new Date(a.date) - new Date(b.date)),
    [shifts]
  );
  const lastShiftDate = actualShiftList.length > 0
    ? new Date(actualShiftList[actualShiftList.length - 1].date)
    : null;
  const daysSinceLastShift = lastShiftDate ? Math.floor((today - lastShiftDate) / (1000 * 60 * 60 * 24)) : null;
  const risk_last_shift = daysSinceLastShift !== null && daysSinceLastShift >= 14;

  // 8. 予約1日2件以下が3日以上
  const reservationPerDayMap = useMemo(() => {
    const map = {};
    castReservations.forEach(r => {
      const d = r.datetime.split("T")[0];
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [castReservations]);

  // 出勤日のみで「2件以下」が連続する最大日数を計算
  let maxConsecutiveLowReservationDays = 0, curLow = 0;
  shiftDays.forEach(day => {
    const count = reservationPerDayMap[day] || 0; // 出勤日の予約件数（0も含む！）
    if (count <= 2) {
      curLow++;
      if (curLow > maxConsecutiveLowReservationDays) maxConsecutiveLowReservationDays = curLow;
    } else {
      curLow = 0;
    }
  });
  const risk_reservation_low = maxConsecutiveLowReservationDays >= 3;

  // 9. キャンセル率30％以上
  const risk_cancel = (castReservations.length + cancelled.length) > 0 && (cancelled.length / (castReservations.length + cancelled.length)) >= 0.3;

  // 10. 日記投稿数（出勤日数*2件以下）
  const diaryCount = diaryList.length || diaries.length;
  const risk_diary = diaryCount <= workingDays * 2;

  // 11. 備考欄
  const riskWords = ["やめたい", "やる気", "退店", "続けられない", "疲れた", "辞め", "やめよう", "最近やる気が出ない", "退店検討"];
  const note = memos.length > 0 ? memos[0].memo || "" : "";
  const risk_note = riskWords.some(w => note.includes(w));

  // 12. 面談履歴
  const hasMeetingThisMonth = useMemo(() => {
    if (!selectedMonth || !meetings.length) return false;
    const [y, m] = selectedMonth.split("-");
    const lastDay = new Date(Number(y), Number(m), 0).getDate(); 
    const monthStart = `${y}-${m}-01`;
    const monthEnd = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    return meetings.some(m => m.meeting_date >= monthStart && m.meeting_date <= monthEnd);
  }, [selectedMonth, meetings]);
  const risk_no_meeting = !hasMeetingThisMonth;

  const latestMeeting = useMemo(() => {
    if (!meetings.length) return null;
    return meetings
      .filter(m => !!m.meeting_date)
      .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date))[0].meeting_date;
  }, [meetings]);


  // リスク判定用フラグの配列
const riskFlags = [
  risk_shift_down,
  risk_working_rate,
  risk_salary_low,
  risk_salary_down,
  risk_salary_per_day,
  risk_absent,
  risk_last_shift,
  risk_reservation_low,
  risk_cancel,
  risk_diary,
  risk_note,
  risk_no_meeting,
];

// trueの数をカウント
const riskCount = riskFlags.filter(Boolean).length;

// 判定ロジック
let riskLevel = "低";
if (riskCount >= 6) {
  riskLevel = "高";
} else if (riskCount >= 4) {
  riskLevel = "中";
} else {
  riskLevel = "低";
}

  // --- KPI ---
  const kpiValues = useMemo(() => {
    const salary = totalSalary;
    const workMinutes = totalWorkMinutes; // 実働分（接客時間合計）
    const shiftMinutes = totalShiftMinutes; // 出勤分（シフト時間合計）
    const resLength = Array.isArray(castReservations) ? castReservations.length : 0;
    return {
      hourlyWage: workMinutes > 0 ? Math.round(salary / workMinutes * 60) : 0, // 実働時給
      shiftHourlyWage: shiftMinutes > 0 ? Math.round(salary / shiftMinutes * 60) : 0, // 出勤時給（体感）
      avgSalesPerCustomer: resLength > 0 ? Math.round(salary / resLength) : 0,
    };
  }, [totalSalary, totalWorkMinutes, totalShiftMinutes, castReservations]);


  // --- ここからUI ---
  return (
    <>
    <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, minHeight: 500, bgcolor: "#fcfcfe", boxShadow: "0 6px 28px #6366f111" }}>
      <Box display="flex" alignItems="center" mb={2} gap={2}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>キャスト選択</InputLabel>
          <Select
            value={selectedCastId}
            label="キャスト選択"
            onChange={e => setSelectedCastId(String(e.target.value))}
          >
            {casts.map(c => (
              <MenuItem value={String(c.id)} key={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {casts.find(c => String(c.id) === String(selectedCastId)) && (
          <Chip icon={<PersonIcon sx={{ color: accent }} />} label={casts.find(c => String(c.id) === String(selectedCastId)).name} sx={{ fontWeight: 900, fontSize: 17, px: 2, borderRadius: 2, bgcolor: "#eef2ff", color: accent }} onClick={() => {}}/>
        )}
      </Box>
      <Divider sx={{ my: 1.5 }} />

      <Tabs
        value={tabIdx}
        onChange={(_, v) => setTabIdx(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2, "& .Mui-selected": { fontWeight: 900, color: accent } }}
      >
        {TABS.map((tab, idx) => (
          <Tab
            key={tab.label}
            icon={tab.icon}
            label={tab.label}
            sx={{ minWidth: 120, fontWeight: 900, fontSize: 15 }}
          />
        ))}
      </Tabs>

      <Box sx={{ minHeight: 300, p: 2 }}>
        {/* 出勤/稼働 */}
        {tabIdx === TABS.findIndex(t => t.label === "出勤/稼働") && (
          <Box>
            <Grid container spacing={2}>
              <KpiCard icon={<ShowChartIcon/>} label="シフト提出日数" value={shiftSubmittedDays} unit="日" color={accent}/>
              <Grid item><KpiCard icon={<InsightsIcon/>} label="稼働率" value={workingRate} unit="%" diff={workingRate-prevWorkingRate} color={accent}/></Grid>
              <Grid item><KpiCard icon={<CalendarTodayIcon/>} label="実働日数" value={workingDays} unit="日" diff={workingDays-prevWorkingDays} color={accent}/></Grid>
              <Grid item><KpiCard icon={<ArrowDownwardIcon/>}label="当日欠勤日数"value={absentDays}unit="日"color={pink}/></Grid>
              <Grid item><KpiCard icon={<TrendingFlatIcon/>}label="当日欠勤率"value={absentRate}unit="%"color={pink}/></Grid>
              <Grid item><KpiCard icon={<AutoAwesomeIcon/>} label="平均勤務時間" value={Math.floor(avgWorkingMinutes/60)} unit="時間" color={accent}/></Grid>
            </Grid>
            <Box mt={3} p={2} bgcolor="#f3f4f6" borderRadius={2} boxShadow="0 2px 8px #6366f122">
              <Typography fontWeight={900} color={accent}>📊 AI分析コメント</Typography>
              <Typography>{workComment}</Typography>
            </Box>
            <Box mt={3}>
              <Typography fontWeight={700} fontSize={15} color={accent}>出勤日リスト</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {shifts.filter(isActualAttendance).map(s => (
                 <Chip
                   key={s.id}
                   label={`${s.date} (${s.start_time || ""}〜${s.end_time || ""})`}
                   sx={{ fontSize: 13, mb: 0.5, cursor: "pointer" }}
                   onClick={() => handleShiftClick(s)}
                   color="primary"
                   variant="outlined"
                 />
               ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* コース・OP */}
        {tabIdx === TABS.findIndex(t => t.label === "コース・OP") && (
          <Box width="100%">
            {/* ▼ ここがKPIカード追加部分 ▼ */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {sortedCourses.map(course => (
                <Grid item key={course.name}>
                  <KpiCard
                    icon={<InsightsIcon />}
                    label={`${course.name}率`}
                    value={
                      castReservations.length
                        ? Math.round((courseCount[course.name] || 0) / castReservations.length * 100)
                        : 0
                    }
                    unit="%"
                    diff={
                      castReservations.length && prevCastReservations.length
                        ? Math.round(
                            ((courseCount[course.name] || 0) / castReservations.length * 100) -
                            ((prevCourseCount[course.name] || 0) / prevCastReservations.length * 100)
                          )
                        : 0
                    }
                    color={accent}
                  />
                </Grid>
              ))}
              <Grid item>
                <KpiCard
                  icon={<AutoAwesomeIcon />}
                  label="OP利用率"
                  value={
                    castReservations.length
                      ? Math.round((opStats.opUsage || 0) / castReservations.length * 100)
                      : 0
                  }
                  unit="%"
                  diff={
                    castReservations.length && prevCastReservations.length
                      ? Math.round(
                          ((opStats.opUsage || 0) / castReservations.length * 100) -
                          ((prevOpStats.opUsage || 0) / prevCastReservations.length * 100)
                        )
                      : 0
                  }
                  color={magenta}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="stretch">
              <Grid item xs={12} md={8}>
                <Box width="100%" minWidth={700}>
                  <BarGraph
                    data={sortedCourses.map(course => ({
                      label: course.name,
                      count: courseCount[course.name] || 0
                    }))}
                    color={accent}
                    title="コース別本数"
                    height={280}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box width="100%" minWidth={500}>
                  <PieGraph
                    data={opPieData}
                    colors={[magenta, orange, accent, green, pink, "#e5e7eb", "#c7d2fe", "#fca5a5"]}
                    title="OP別利用回数"
                    height={220}
                  />
                </Box>
              </Grid>
            </Grid>
            <Box mt={3} p={2} bgcolor="#f3f4f6" borderRadius={2} boxShadow="0 2px 8px #6366f122">
              <Typography fontWeight={900} color={accent}>📊 AI分析コメント</Typography>
              <Typography>{courseComment}</Typography>
              <Typography>{opComment}</Typography>
            </Box>
          </Box>
        )}

        {/* 指名/本指名 */}
        {tabIdx === TABS.findIndex(t => t.label === "指名/本指名") && (
          <Box>
            {/* 指名種別KPIカード */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {shimeiMenus.map(menu => (
                <Grid item key={menu.name}>
                  <KpiCard
                    icon={<AssignmentIndIcon />}
                    label={menu.name} // ←DBのnameカラムがラベルになる
                    value={Math.round((shimeiCount[menu.name] || 0) / (shimeiTotal || 1) * 100)}
                    unit="%"
                    diff={
                      Math.round(((shimeiCount[menu.name] || 0) / (shimeiTotal || 1) * 100) -
                      ((prevShimeiCount[menu.name] || 0) / (prevShimeiTotal || 1) * 100))
                    }
                    color={magenta}
                  />
                </Grid>
              ))}
              <Grid item>
                <KpiCard
                  icon={<AssignmentIndIcon />}
                  label="総指名件数"
                  value={shimeiTotal}
                  unit="件"
                  diff={shimeiTotal - prevShimeiTotal}
                  color={magenta}
                />
              </Grid>
            </Grid>
            {/* グラフ・コメント */}
            <BarGraph
              data={Object.entries(shimeiCount).map(([label, count]) => ({ label, count }))}
              color={magenta}
              title="指名種別本数"
              height={180}
            />
            <Box mt={3} p={2} bgcolor="#f3f4f6" borderRadius={2} boxShadow="0 2px 8px #6366f122">
              <Typography fontWeight={900} color={magenta}>📊 AI分析コメント</Typography>
              <Typography>{shimeiComment}</Typography>
            </Box>
          </Box>
        )}

         {/* 新規/リピート */}
         {tabIdx === TABS.findIndex(t => t.label === "新規/リピート") && (
           <Box>
             <Grid container spacing={2} sx={{ mb: 2 }}>
               <Grid item>
                 <KpiCard
                   icon={<RepeatIcon />}
                   label="新規接客数"
                   value={thisCastNewCustomerIds.length}
                   unit="件"
                   diff={thisCastNewCustomerIds.length - prevThisCastNewCustomerIds.length}
                   color={green}
                 />
               </Grid>
               <Grid item>
                 <KpiCard
                   icon={<RepeatIcon />}
                   label="リピート接客数"
                   value={repeatVisits}
                   unit="件"
                   diff={repeatVisits - prevRepeatVisits}
                   color="#fbbf24"
                 />
               </Grid>
               <Grid item>
                 <KpiCard
                   icon={<RepeatIcon sx={{ color: accent }} />}
                   label="新規リピート率"
                   value={newRepeatRatePerson}
                   unit="%"
                   diff={Number(newRepeatRatePerson) - Number(prevNewRepeatRatePerson)}
                   color={accent}
                 />
               </Grid>
               <Grid item>
                 <KpiCard
                   icon={<RepeatIcon sx={{ color: "#06b6d4" }} />}
                   label="店舗リピート数"
                   value={storeRepeatCount.repeatNum}
                   unit="人"
                   color="#06b6d4"
                 />
               </Grid>
               <Grid item>
                 <KpiCard
                   icon={<RepeatIcon sx={{ color: "#06b6d4" }} />}
                   label="店舗リピート率"
                   value={storeRepeatCount.repeatRate}
                   unit="%"
                   color="#06b6d4"
                 />
               </Grid>
             </Grid>
             <PieGraph
               data={[
                 { label: "新規", value: newCustomerReservations.length },
                 { label: "リピート", value: repeatVisits }
               ]}
               colors={[green, "#fbbf24"]}
               title="新規/リピート接客"
               height={180}
             />
             <Box mt={3} p={2} bgcolor="#f3f4f6" borderRadius={2} boxShadow="0 2px 8px #6366f122">
               <Typography fontWeight={900} color={green}>📊 AI分析コメント</Typography>
               <Typography>
                 今月の新規顧客：{uniqueNewCustomerIds.length}人 ／ うちリピート（2回目以上）は{repeatCustomerCount}人（新規リピート率{newRepeatRatePerson}%）
               </Typography>
               <Typography mt={1} color="#06b6d4">
                 新規顧客{thisCastNewCustomerIds.length}人中、{storeRepeatCount.repeatNum}人が2回目来店（店舗リピート率{storeRepeatCount.repeatRate}%）
               </Typography>
             </Box>
           </Box>
         )}
        {/* 売上・給料 */}
        {tabIdx === TABS.findIndex(t => t.label === "売上・給料") && (
          <Box>
            {/* --- 上段：KPIカード --- */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item><KpiCard icon={<AttachMoneyIcon/>} label="総給料" value={totalSalary.toLocaleString()} unit="円" color={orange} diff={totalSalary - prevTotalSalary}/></Grid>
              <Grid item><KpiCard icon={<ShowChartIcon/>} label="平均客単価" value={Number(avgPrice).toLocaleString()} unit="円" color={orange} diff={Number(avgPrice) - Number(prevAvgPrice)}/></Grid>
              <Grid item><KpiCard icon={<PersonIcon/>} label="総接客数" value={castReservations.length} unit="件" color={orange} diff={castReservations.length - prevCastCount}/></Grid>
           </Grid>

            {/* --- 中段：目標進捗バー --- */}
            <Box mt={3} mb={2} display="flex" alignItems="center" gap={2}>
              <Typography fontWeight={700} mb={1}>
                今月の給料目標
                {editTarget ? (
              <>
                <TextField
                  type="number"
                  size="small"
                  value={salesTarget}
                  onChange={e => setSalesTarget(Number(e.target.value))}
                  sx={{ ml: 2, width: 120 }}
                  inputProps={{ min: 0, step: 1000 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    setEditTarget(false);
                    if (!storeId || !selectedCastId || !selectedMonth) {
                      alert("必須情報が未入力です！");
                      return;
                    }
                    await supabase
                      .from("salary_targets")
                      .upsert([
                        {
                          store_id: storeId,
                          cast_id: Number(selectedCastId),
                          month: selectedMonth,
                          target: salesTarget,
                          updated_at: new Date().toISOString(),
                        },
                      ], { onConflict: ['store_id', 'cast_id', 'month'] });
                  }}
                  sx={{ ml: 1 }}
                >保存</Button>
              </>
            ) : (
              <span
                style={{ marginLeft: 8, cursor: "pointer", color: "#6366f1", fontWeight: 800 }}
                onClick={() => setEditTarget(true)}
                title="クリックで編集"
              >
                {salesTarget.toLocaleString()}円
              </span>
            )}
                まで
                <span style={{ color: accent, marginLeft: 10 }}>
                  {salesTarget > 0 ? Math.round((totalSalary / salesTarget) * 100) : 0}%
                </span>
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={salesTarget > 0 ? Math.min(100, Math.round((totalSalary / salesTarget) * 100)) : 0}
              sx={{ height: 14, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary">
              あと{Math.max(0, salesTarget - totalSalary).toLocaleString()}円
            </Typography>
        
            {/* --- 効率系KPI（横並び） --- */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item>
                <KpiCard
                  icon={<AttachMoneyIcon/>}
                  label="概算時給"
                  value={kpiValues.shiftHourlyWage.toLocaleString()} 
                  unit="円"
                  color={green}
                />
              </Grid>
              <Grid item>
                <KpiCard
                  icon={<AttachMoneyIcon/>}
                  label="1件平均給料"
                  value={kpiValues.avgSalesPerCustomer.toLocaleString()}
                  unit="円"
                  color={magenta}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <KpiCard icon={<TrendingDownIcon/>} label="キャンセル損失" value={cancelLoss.toLocaleString()} unit="円" color={pink}>
                  <Typography variant="caption" color="text.secondary">
                    キャンセル件数：{cancelled.length}
                  </Typography>
                </KpiCard>
              </Grid>
            </Grid>
        
            {/* --- Tips --- */}
            <Box mt={3} p={2} bgcolor="#f3f4f6" borderRadius={2} boxShadow="0 2px 8px #6366f122">
              <Typography fontWeight={900} color={orange}>💴 給料・売上Tips</Typography>
              <Typography>平均単価や本数の推移を分析し、さらに稼ぐコース提案や稼働日増加案も自動提示可能です。</Typography>
            </Box>
          </Box>
        )}

        {/* 日記分析 */}
        {tabIdx === TABS.findIndex(t => t.label === "日記分析") && (
          canUseCastDiaryAnalysis ? (
            <Box>
              <Typography fontWeight={900} fontSize={17} color={pink}>📝 日記分析</Typography>
              <Typography fontSize={15} mt={1}>
                {selectedCastName}の日記投稿分析
              </Typography>
              <Divider sx={{ my: 2 }} />
  
              {/* 投稿数グラフ */}
              <Box mt={2} mb={3}>
                <DiaryCountGraph
                  data={graphData}
                />
              </Box>
  
              {/* 投稿リスト */}
              <Box>
                <Typography fontWeight={700} mb={1}>投稿一覧</Typography>
                {sortedDiaryList.length === 0 ? (
                  <Typography color="text.secondary">この期間の投稿はありません。</Typography>
                ) : (
                  <Stack spacing={1}>
                    {sortedDiaryList.slice(0, 10).map((d, i) => (
                      <Paper
                        key={i}
                        sx={{ p: 1.2, bgcolor: "#fff", cursor: "pointer" }}
                        onClick={() => {
                          setSelectedDiary(d);
                          setDiaryDialogOpen(true);
                        }}
                      >
                       <Typography fontSize={13} color="#666">{d.date} {d.hour}時</Typography>
                        <Typography fontWeight={800}>{d.title}</Typography>
                        <Typography fontSize={14} color="#888">{d.body_preview}</Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Box>
          ) : (
            <Box mt={6} textAlign="center">
              <Typography color="text.secondary" fontWeight={700} fontSize={18}>
                この機能は利用できません
              </Typography>
              <Typography color="#aaa" fontSize={15} mt={1}>
                プランをアップグレードしてください
              </Typography>
            </Box>
          )
        )}

        {/* 退店リスク */}
        {tabIdx === TABS.findIndex(t => t.label === "退店リスク") && (
          <Box>
            {/* 1. リスク判定サマリー */}
            <Box p={2} bgcolor="#fff7f7" borderRadius={2} boxShadow="0 2px 8px #fee2e2">
              <Typography fontWeight={900} fontSize={20} color="#b91c1c">
                ⚠️ 退店リスク【{riskLevel}】
              </Typography>
              <Box display="flex" gap={1} mt={2}>
                <Chip icon={<CalendarTodayIcon />} label={`出勤 ${workingDays}日`} color={risk_shift_down ? "error" : "default"} onClick={() => {}}/>
                <Chip icon={<AssignmentIndIcon />} label={`接客数 ${castReservations.length}件`} color="default" onClick={() => {}}/>
                <Chip icon={<AttachMoneyIcon />} label={`給料 ${totalSalary.toLocaleString()}円`} color={risk_salary_low ? "error" : "default"} onClick={() => {}}/>
                <Chip icon={<TrendingDownIcon />} label={`欠勤 ${absentDays}日`} color={risk_absent ? "warning" : "default"} onClick={() => {}}/>
              </Box>
            </Box>
        
            {/* 2. リスク要因リスト（自動チェック） */}
            <Box mt={3} p={2} bgcolor="#f1f5f9" borderRadius={2}>
              <Typography fontWeight={700}>リスクアラート</Typography>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>
                  <input type="checkbox" checked={risk_shift_down} readOnly style={{marginRight:4}}/>
                  2か月連続で出勤日数が低下
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （今月: {workingDays}日 / 前月: {prevWorkingDays}日 / 先々月: {prevPrevWorkingDays}日）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_working_rate} readOnly style={{marginRight:4}}/>
                  稼働率30％以下
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （今月: {workingRate}%）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_salary_low} readOnly style={{marginRight:4}}/>
                  今月の給料合計が目標値の50%以下
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （今月: {totalSalary.toLocaleString()}円 / 目標: {salesTarget.toLocaleString()}円）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_salary_down} readOnly style={{marginRight:4}}/>
                  給料が前月比-40%以上ダウン
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （今月: {totalSalary.toLocaleString()}円 / 前月: {prevTotalSalary.toLocaleString()}円）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_salary_per_day} readOnly style={{marginRight:4}}/>
                  1日あたり給料平均が目標の半分以下
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （今月: {avgPerDay.toLocaleString()}円 / 目標: {avgTarget.toLocaleString()}円）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_absent} readOnly style={{marginRight:4}}/>
                  欠勤が多い（30%超 or 連続3回以上）
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （欠勤: {absentDays}日 / 出勤: {workingDays}日 / 連続: {maxConsecutiveAbsent}回）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_last_shift} readOnly style={{marginRight:4}}/>
                  最終出勤日から14日以上経過
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （最終出勤日: {lastShiftDate ? lastShiftDate.toLocaleDateString() : "なし"})
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_reservation_low} readOnly style={{marginRight:4}}/>
                    1日2件以下のお仕事が3日以上連続
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （最大連続日数: {maxConsecutiveLowReservationDays}日）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_cancel} readOnly style={{marginRight:4}}/>
                  キャンセル率30％以上
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （キャンセル: {cancelled.length}件 / 総接客数: {castReservations.length + cancelled.length}件 / {((cancelled.length / ((castReservations.length + cancelled.length) || 1)) * 100).toFixed(1)}%）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_diary} readOnly style={{marginRight:4}}/>
                  日記投稿数が出勤日数の2倍以下
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （日記: {diaryList.length}件 / 出勤: {workingDays}日）
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_note} readOnly style={{marginRight:4}}/>
                  備考欄に退店等のネガティブワードあり
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    {note ? `（最新: ${note.slice(0, 10)}...）` : ""}
                  </span>
                </li>
                <li>
                  <input type="checkbox" checked={risk_no_meeting} readOnly style={{marginRight:4}}/>
                  今月面談履歴なし（サポート面談推奨）
                  <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
                    （最新: {latestMeeting ? new Date(latestMeeting).toLocaleDateString() : "なし"})
                  </span>
                </li>
              </ul>
              <Typography variant="caption" color="text.secondary">
                ※該当項目のみ自動でチェック
              </Typography>
            </Box>
        
            {/* 3. AIリスク要因解説＆アクション提案 */}
            <Box p={2} bgcolor="#fff9db" borderRadius={3} boxShadow="0 1px 6px #ffecb366">
              <Typography fontWeight={900} fontSize={17} color="#eab308">
                <WarningAmberIcon sx={{mr:1, color:"#eab308"}} />
                AIによるリスク要因＆アクション提案
              </Typography>
              <Typography mt={1} color="#b45309" fontSize={15}>
                出勤数 <b>▲8日</b> / 本指名 <b>▲23件</b> など、複数項目で減少傾向。<br />
                面談やフォロー連絡推奨。
              </Typography>
              <Stack direction="row" gap={2} mt={2}>
                <Button variant="contained" color="warning" startIcon={<PersonSearchIcon />} onClick={() => setMeetingDialogOpen(true)}>面談記録を追加</Button>
                <Button variant="outlined" color="primary" startIcon={<BookIcon />} onClick={() => setMeetingListOpen(true)}>面談記録を表示</Button>
                {/* <Button variant="outlined" color="secondary" startIcon={<ChatIcon />}>LINEフォロー</Button> */}
                <Button variant="text" color="primary" startIcon={<TipsAndUpdatesIcon />} onClick={() => setAdviceOpen(true)}>育成アドバイス</Button>
              </Stack>
            </Box>
        
            {/* 5. 管理者アクション履歴・メモ */}
            <Box p={2} bgcolor="#f8fafc" borderRadius={3} boxShadow="0 1px 6px #e0e7ef99">
              <Typography fontWeight={900} fontSize={16} color="#374151" mb={1}>対応履歴・メモ</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <TextField
                  placeholder="対応内容・スタッフメモを記入…"
                  minRows={2}
                  multiline
                  sx={{ flex: 2 }}
                  value={memoText}
                  onChange={e => setMemoText(e.target.value)}
                />
                <TextField
                  placeholder="スタッフ名"
                  sx={{ width: 130 }}
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                />
                <Button
                  variant="contained"
                  color="success"
                  sx={{ height: 56 }}
                  disabled={savingMemo}
                  onClick={handleAddMemo}
                >
                  {savingMemo ? "保存中..." : "対応済みにする"}
                </Button>
              </Stack>
              {/* 過去メモ一覧（例） */}
              <Box mt={2}>
                <Typography fontSize={13} color="#888">過去の対応履歴</Typography>
                 <Stack spacing={1} mt={1}>
                   {memos.length === 0 ? (
                     <Typography color="text.secondary">対応履歴はありません。</Typography>
                   ) : (
                     memos.map((memo, idx) => (
                       <Paper
                         key={memo.id || idx}
                         elevation={idx === 0 ? 1 : 0}
                         sx={{ p:1.2, bgcolor: idx === 0 ? "#fff" : "#f3f4f6" }}
                       >
                         <Typography fontSize={14} fontWeight={700}>
                           {memo.created_at ? new Date(memo.created_at).toLocaleDateString() : "-"}{" "}
                           {memo.staff_name}
                         </Typography>
                         <Typography fontSize={14}>
                           {memo.memo}
                         </Typography>
                       </Paper>
                     ))
                   )}
                 </Stack>
               </Box>
            </Box>
          </Box>
        )}

        {/* アクション提案 */}
        {tabIdx === TABS.findIndex(t => t.label === "アクション提案") && (
        <Box>
          {/* ① AIサマリー */}
          <Paper sx={{ p: 2, bgcolor: "#f0fdf4", mb: 2 }}>
            <Typography fontWeight={900} color={accent} fontSize={18}>
              💡 今月のAI総合サマリー
            </Typography>
            <Typography fontSize={16}>
              {/* ※下のコメントは各タブのKPIやコメントから自動生成してもOK */}
              今月は出勤日数・指名数ともに減少傾向です。リピート対策と出勤頻度UPを目標にしましょう！
            </Typography>
          </Paper>
      
          {/* ② 各セクションKPI・要点ピックアップ */}
          <Paper sx={{ p: 2, bgcolor: "#f3f4f6", mb: 3 }}>
            <Typography fontWeight={800} color={accent} fontSize={16}>各項目の要点</Typography>
            <ul style={{ marginLeft: 18, marginTop: 8, fontSize: 15 }}>
              <li>
                <b>出勤・稼働：</b>
                {workingDays}日／稼働率{workingRate}%
                （先月比 {workingDays - prevWorkingDays > 0 ? `+${workingDays - prevWorkingDays}` : workingDays - prevWorkingDays}日）
              </li>
              <li>
                <b>指名：</b>
                本指名{shimeiCount["本指名"] || 0}件／前月比 {
                  (shimeiCount["本指名"] || 0) - (prevShimeiCount["本指名"] || 0) > 0
                    ? `+${(shimeiCount["本指名"] || 0) - (prevShimeiCount["本指名"] || 0)}`
                    : (shimeiCount["本指名"] || 0) - (prevShimeiCount["本指名"] || 0)
                }件
              </li>
              <li>
                <b>コース・OP：</b>
                最多コース：{Object.entries(courseCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
                ／ OP利用率{opStats.usageRate}%
              </li>
              <li>
                <b>新規/リピート：</b>
                新規{uniqueNewCustomerIds.length}人、リピート{repeatCustomerCount}人（新規リピート率{newRepeatRatePerson}%）
              </li>
              <li>
                <b>売上・給料：</b>
                総給料{totalSalary.toLocaleString()}円（前月比 {
                  totalSalary - prevTotalSalary > 0
                    ? `+${(totalSalary - prevTotalSalary).toLocaleString()}`
                    : (totalSalary - prevTotalSalary).toLocaleString()
                }円）
              </li>
              <li>
                <b>退店リスク：</b>
                {riskLevel}（{riskCount}件該当）／主なリスク：{[
                  risk_shift_down ? "出勤低下" : null,
                  risk_working_rate ? "稼働率低" : null,
                  risk_salary_low ? "給料低下" : null,
                  risk_absent ? "欠勤" : null,
                  risk_last_shift ? "最終出勤古い" : null,
                  risk_diary ? "日記少" : null,
                ].filter(Boolean).join("・") || "特になし"}
              </li>
            </ul>
          </Paper>
      
          {/* ③ 来月のKPI目標 */}
          <Paper sx={{ p: 2, bgcolor: "#fff9db", mb: 3 }}>
            <Typography fontWeight={700} color="#b45309" fontSize={16}>
              🎯 来月の目標KPI
            </Typography>
            <ul style={{ marginLeft: 18, fontSize: 15 }}>
              <li>出勤日数：{Math.max(workingDays + 2, 8)}日以上</li>
              <li>本指名：{Math.max((shimeiCount["本指名"] || 0) + 2, 3)}件以上</li>
              <li>日記投稿：{Math.max(diaries.length + 4, workingDays * 2)}件以上</li>
              <li>新規リピート率：{Math.min(Number(newRepeatRatePerson) + 5, 70)}%以上</li>
            </ul>
          </Paper>
      
          {/* ④ アクション施策ボタン・追加UI */}
          <Box mb={2}>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="warning" onClick={() => setMeetingDialogOpen(true)}>
                面談記録追加
              </Button>
               {/* <Button variant="outlined" color="primary" onClick={() => alert('LINEフォロー記録')}>
                LINEフォロー記録
              </Button> */}
              <Button variant="outlined" color="secondary" onClick={() => alert('日記サンプル配布記録')}>
                日記サンプル配布記録
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      </Box>
    </Paper>
    <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth>
     <DialogTitle>出勤詳細</DialogTitle>
     <DialogContent>
       {shiftDetail && (
         <>
           <Typography>日付：{shiftDetail.date}</Typography>
           <Typography>時間：{shiftDetail.start_time}〜{shiftDetail.end_time}</Typography>
           {shiftDetail.memo && (
             <Typography color="text.secondary" mt={1}>メモ：{shiftDetail.memo}</Typography>
           )}

           {/* --- 予約データ --- */}
           <Box mt={2}>
             <Typography fontWeight={700}>この日の予約</Typography>
             {shiftReservations.length === 0 ? (
               <Typography color="text.secondary">予約はありません。</Typography>
              ) : (
               shiftReservations.map(r => (
                 <Box key={r.id} sx={{ mb: 1, p: 1, bgcolor: "#f3f4f6", borderRadius: 1 }}>
                  <Typography fontSize={14}>
                    顧客名: {customerIdToName[String(r.customer_id)] || "(不明)"}
                  </Typography>                  
                  <Typography fontSize={13} color="text.secondary">
                    コース: {r.course}
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    指名: {r.shimei || "-"}
                  </Typography>
                  <Typography fontSize={13} color="text.secondary">
                    時間: {r.start_time || "-"}〜{r.end_time || "-"}
                  </Typography>                  
                  <Typography fontSize={13} color="text.secondary">
                    給料: {r.cast_pay ? `${r.cast_pay.toLocaleString()}円` : "-"}
                  </Typography>
                  {/* ここから割引情報追加 */}
                  {r.discount && (
                    <Typography fontSize={13} color="text.secondary">
                      割引: {r.discount}
                      {r.discount_price ? `（-${Number(r.discount_price).toLocaleString()}円）` : ""}
                    </Typography>
                  )}
                  {/* OP */}
                  {r.op && Array.isArray(r.op) && r.op.length > 0 && (
                    <Typography fontSize={12} color="text.secondary">
                      OP: {r.op.join(", ")}
                    </Typography>
                  )}
                  {r.op && typeof r.op === "string" && r.op.startsWith("[") && (() => {
                    try {
                      const arr = JSON.parse(r.op);
                      if (Array.isArray(arr) && arr.length > 0) {
                        return (
                          <Typography fontSize={12} color="text.secondary">
                            OP: {arr.join(", ")}
                          </Typography>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </Box>
               ))
             )}
           </Box>
         </>
       )}
     </DialogContent>
     <DialogActions>
       <Button onClick={() => setDetailOpen(false)}>閉じる</Button>
     </DialogActions>
    </Dialog>

    <Dialog open={meetingDialogOpen} onClose={() => setMeetingDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>面談記録を追加</DialogTitle>
      <DialogContent>
        <TextField
          label="面談日"
          type="date"
          value={meetingDate}
          onChange={e => setMeetingDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        <TextField
          label="面談内容（メモ）"
          multiline
          minRows={2}
          value={meetingMemo}
          onChange={e => setMeetingMemo(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="面談結果"
          multiline
          minRows={1}
          value={meetingResult}
          onChange={e => setMeetingResult(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setMeetingDialogOpen(false)}>キャンセル</Button>
        <Button onClick={handleAddMeeting} variant="contained" disabled={savingMeeting}>
          {savingMeeting ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={meetingListOpen} onClose={() => setMeetingListOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>面談記録一覧</DialogTitle>
      <DialogContent>
        {meetings.length === 0 ? (
          <Typography color="text.secondary">面談記録はありません。</Typography>
        ) : (
          <Stack spacing={2} mt={1}>
            {meetings.map((m, idx) => (
              <Paper key={m.id || idx} sx={{ p: 1.5, bgcolor: "#f9fafb" }}>
                <Typography fontWeight={700}>{m.meeting_date}</Typography>
                <Typography fontSize={14} color="#444">{m.memo}</Typography>
                {m.result && <Typography fontSize={13} color="text.secondary">結果：{m.result}</Typography>}
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setMeetingListOpen(false)}>閉じる</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={adviceOpen} onClose={() => setAdviceOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>育成アドバイス</DialogTitle>
      <DialogContent>
        <Typography>
          ● 今月のリピート率が下がっているので、次回来店の声かけを強化しましょう。<br />
          ● 日記投稿数が減っているため、簡単な写真と感謝コメント投稿を増やすのが効果的です。<br />
          ● 出勤日数が少ない場合は「出勤日を事前にお客様にお伝えする」ことで予約率UPが期待できます。<br />
          <br />
          ※この欄は今後AI自動アドバイスにできます。サンプル文章を表示中。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAdviceOpen(false)} color="primary" variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={diaryDialogOpen} onClose={() => setDiaryDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {selectedDiary?.title}
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" fontSize={13}>
          {selectedDiary?.date} {selectedDiary?.hour ? `${selectedDiary.hour}時` : ""}
        </Typography>
        {/* 本文HTML（デコ画像含む） */}
        <Box mt={2}>
          {selectedDiary?.body ? (
            <div
              style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={{ __html: selectedDiary.body }}
            />
          ) : (
            <Typography color="text.secondary">内容なし</Typography>
          )}
        </Box>
        {/* === 画像プレビュー === */}
        {selectedDiary?.image_urls && selectedDiary.image_urls.length > 0 && (
          <Stack direction="row" spacing={2} mt={3} flexWrap="wrap">
            {selectedDiary.image_urls.map((url, idx) => {
              const absUrl = toAbsoluteHeavenUrl(url);
              return (
                <a
                  href={absUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                 key={idx}
                  style={{ display: "inline-block", marginRight: 10 }}
                >
                  画像{idx + 1}を別タブで開く
                </a>
              );
            })}
          </Stack>
        )}

        {/* =================== */}
        {selectedDiary?.diary_url && (
          <Box mt={2}>
            <Button
              href={selectedDiary.diary_url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
            >
              Heaven管理画面で開く
            </Button>
          </Box>
            )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDiaryDialogOpen(false)}>閉じる</Button>
      </DialogActions>
    </Dialog>

    </>
  );
}
