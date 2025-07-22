import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Box, Paper, Typography, Card, LinearProgress, Tabs, Tab, Divider, Avatar,
  Select, MenuItem, FormControl, InputLabel, CircularProgress
} from "@mui/material";
import {
  Timeline, Favorite, CreditCard, LocalOffer, EmojiEvents, TrendingUp
} from "@mui/icons-material";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell
} from "recharts";
import DailyDetailPanel from "../components/DailyDetailPanel";
import CastSalaryPanel from "../components/CastSalaryPanel";
import DiaryCountPanel from "../components/DiaryCountPanel";
import CourseOpPanel from "../components/CourseOpPanel";
import CastAnalysisPanel from "../components/CastAnalysisPanel";
import ComparePanel from "../components/ComparePanel";
import { useSettings } from "../SettingsContext";
import { canUseFeature } from "../../features";


const accent = "#6366f1";
const cyan = "#06b6d4";
const magenta = "#e879f9";
const orange = "#ffbc42";
const green = "#16db65";
const gradBG = "radial-gradient(circle at 70% 20%, #dbeafe 0%, #f3e8ff 70%, #f1f5f9 100%)";

// 月リスト生成
function getMonthOptions() {
  const arr = [];
  const now = new Date();
  const startYear = 2024;
  const endYear = now.getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === endYear && m > now.getMonth() + 1) break;
      arr.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return arr.reverse();
}

// --- サマリー上部 ---
function SummaryHeader({
  dailyReports, forecast = 0, goal = 0, courseData = [],
  unitPrice = 0, visitors = 0, cancelRate = 0, selectedMonth
}) {
  const today = new Date();
  const [year, month] = selectedMonth.split("-");
  const daysInMonth = new Date(year, month, 0).getDate();
  const sumActual = dailyReports.reduce((sum, v) => sum + (v.value || 0), 0);
  const sumCash = dailyReports.reduce((sum, v) => sum + (v.cash || 0), 0);
  const sumCard = dailyReports.reduce((sum, v) => sum + (v.card || 0), 0);
  const sumPayPay = dailyReports.reduce((sum, v) => sum + (v.paypay || 0), 0);
  const avg = daysInMonth > 0 ? sumActual / daysInMonth : 0;

  const actuals = Array.from({ length: daysInMonth }, (_, i) =>
    dailyReports[i]?.value ?? 0
  );
  const graphData = Array.from({ length: daysInMonth }, (_, i) => ({
    name: `${i + 1}日`,
    actual: actuals[i] ?? 0,
  }));

  const goalRate = goal > 0 ? Math.round((sumActual / goal) * 100) : 0;
  const salesCards = [
    { label: "売上合計", value: sumActual, icon: <Favorite sx={{ color: green }} />, color: green },
    { label: "現金売上", value: sumCash, icon: <Favorite sx={{ color: green }} />, color: green },
    { label: "カード売上", value: sumCard, icon: <CreditCard sx={{ color: orange }} />, color: orange },
    { label: "PayPay", value: sumPayPay, icon: <LocalOffer sx={{ color: cyan }} />, color: cyan },
    { label: "今月達成率", value: `${goalRate}%`, icon: <EmojiEvents sx={{ color: magenta }} />, color: magenta, progress: true },
  ];

  return (
    <Paper sx={{
      p: 3, mb: 3, borderRadius: 3, position: "relative", boxShadow: 7, display: "flex", gap: 3,
      background: "rgba(255,255,255,0.97)", alignItems: "stretch", minHeight: 320
    }}>
      {/* 左：売上グラフ */}
      <Box sx={{ width: "60%", minWidth: 340, pt: 1 }}>
        <Typography fontWeight={900} fontSize={19} color={cyan} mb={1.5} letterSpacing={1.1}>
          月間売上グラフ
        </Typography>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={graphData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={13} />
            <Tooltip formatter={v => v ? `${Number(v).toLocaleString()}円` : "-"} />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              name="実績"
              stroke={cyan}
              strokeWidth={3}
              dot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <Box mt={1.3} mb={0.5} sx={{ textAlign: "left" }}>
          <TrendingUp sx={{ color: cyan, mr: 1 }} />
          <span style={{ fontWeight: 900, fontSize: 19, color: cyan }}>
            見込み額 {forecast.toLocaleString()}円
          </span>
        </Box>
        <Typography fontWeight={900} fontSize={16} color={magenta} mt={2} mb={1}>
          コース別本数グラフ
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={courseData}>
            <XAxis dataKey="name" fontSize={10} />
            <YAxis fontSize={11} />
            <Tooltip formatter={v => v + "本"} />
            <Bar dataKey="count" fill={magenta}>
              {courseData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={i % 2 ? cyan : magenta} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {/* 右：売上カード */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.2 }}>
        {salesCards.map(card => (
          <Card key={card.label} sx={{
            position: "relative", px: 2.5, py: 1.6, mb: 0.8, minHeight: 54,
            display: "flex", alignItems: "center", borderRadius: 2, boxShadow: 2,
            background: "#fff"
          }}>
            <Box sx={{ fontSize: 33, mr: 2, color: card.color }}>
              {card.icon}
            </Box>
            <Box>
              <Typography fontSize={16} fontWeight={700} color={card.color}>{card.label}</Typography>
              <Typography fontSize={21} fontWeight={900} sx={{ color: "#2a2a2a" }}>
                {card.progress
                  ? (
                    <>
                      {card.value}
                      <LinearProgress
                        variant="determinate"
                        value={parseInt(card.value)}
                        sx={{
                          mt: 0.7, height: 9, borderRadius: 7,
                          [`& .MuiLinearProgress-bar`]: {
                            background: `linear-gradient(90deg,${magenta} 0%,${cyan} 100%)`
                          }
                        }}
                      />
                    </>
                  )
                  : `${Number(card.value).toLocaleString()}円`
                }
              </Typography>
            </Box>
          </Card>
        ))}
        <Divider sx={{ my: 1.1 }} />
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", alignItems: "flex-end" }}>
          {/* 来店組数 */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography fontSize={14.5} color={cyan} fontWeight={700}>来店組数</Typography>
            <Typography fontSize={20} fontWeight={900}>{visitors}組</Typography>
          </Box>
          {/* 客単価 */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography fontSize={14.5} color={magenta} fontWeight={700}>客単価</Typography>
            <Typography fontSize={20} fontWeight={900}>{unitPrice.toLocaleString()}円</Typography>
          </Box>
          {/* キャンセル率 */}
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography fontSize={14.5} color="#ff0000" fontWeight={700}>キャンセル率</Typography>
            <Typography fontSize={20} fontWeight={900}>{cancelRate}%</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// ==================== メイン ==========================
export default function SalesDashboard() {
  const [tab, setTab] = useState(0);
  const { currentStoreId, goal } = useSettings();

  // 月リストはstateで管理
  const [monthOptions, setMonthOptions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  // 各種データ
  const [dailyReports, setDailyReports] = useState([]);
  const [reservationsMonth, setReservationsMonth] = useState([]);
  const [visitors, setVisitors] = useState(0);
  const [courseData, setCourseData] = useState([]);
  const [cancelRate, setCancelRate] = useState(0);
  const [castList, setCastList] = useState([]);

  const [goalFromDB, setGoalFromDB] = useState(0);
  useEffect(() => {
    if (!currentStoreId) return;
    supabase.from("settings")
      .select("value")
      .eq("store_id", currentStoreId)
      .eq("key", "sales_goal")
      .maybeSingle()
      .then(({ data }) => setGoalFromDB(Number(data?.value || 0)));
  }, [currentStoreId]);

  const [userRank, setUserRank] = useState("C"); // デフォルトはCなど

  useEffect(() => {
    if (!currentStoreId) return;
    async function fetchStoreInfo() {
      const { data, error } = await supabase
        .from("stores")
        .select("rank")
        .eq("store_id", currentStoreId)
        .single();
      if (data && data.rank) setUserRank(data.rank);
    }
    fetchStoreInfo();
  }, [currentStoreId]);

  // --- キャスト一覧を取得 ---
  useEffect(() => {
    if (!currentStoreId) return;
    async function fetchCasts() {
      const { data, error } = await supabase
        .from("casts")
        .select("id, name")
        .eq("store_id", currentStoreId);
      setCastList(data || []);
    }
    fetchCasts();
  }, [currentStoreId]);

  // ★ 1. 月リストだけ最初に全件取得（daily_reportsから）
  useEffect(() => {
    async function fetchMonthList() {
      if (!currentStoreId) return;
      const { data, error } = await supabase
        .from("daily_reports")
        .select("report_date")
        .eq("store_id", currentStoreId);
      if (error || !data) return;
      // YYYY-MMだけ抽出してユニーク・降順
      const monthSet = new Set(
        data
          .map(row => row.report_date && row.report_date.slice(0, 7))
          .filter(Boolean)
      );
      const sorted = Array.from(monthSet).sort().reverse();
      setMonthOptions(sorted);
      // まだ未選択ならデフォルトセット
      if (!selectedMonth && sorted.length) setSelectedMonth(sorted[0]);
    }
    fetchMonthList();
    // eslint-disable-next-line
  }, [currentStoreId]);

  // ★ 2. 月選択が変わった時の売上データ取得（ここはそのまま）
  useEffect(() => {
    if (!currentStoreId || !selectedMonth) return;
    async function fetchReservations() {
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01T00:00:00`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;

      // 日付配列を必ず先に作成
      const days = Array.from({ length: lastDay }, (_, i) => {
        return `${year}-${month}-${String(i + 1).padStart(2, "0")}`;
      });

      // 日次レポート（給料明細・利益など含む）
      const { data: dailyReportsDataRaw } = await supabase
        .from("daily_reports")
        .select("*")
        .eq("store_id", currentStoreId)
        .gte("report_date", fromDate.slice(0, 10))
        .lte("report_date", toDate.slice(0, 10));

      // 予約（キャンセル除く）
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", currentStoreId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate)
        .not("kubun", "ilike", "%キャンセル%");

      // 予約（キャンセル含む）
      const { data: allReservations } = await supabase
        .from("reservations")
        .select("id, kubun, datetime, price, payment_method")
        .eq("store_id", currentStoreId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate);

      // --- 日次レポートデータと予約データを合成 ---
      const daily = days.map(dateStr => {
        // 該当日のレポート
        const report = (dailyReportsDataRaw || []).find(r =>
          (r.report_date || r.date) === dateStr
        ) || {};

        let diary_logs = [];
        if (report.diary_logs) {
          try {
            diary_logs = typeof report.diary_logs === "string"
              ? JSON.parse(report.diary_logs)
              : report.diary_logs;
          } catch {
            diary_logs = [];
          }
        }

        // 予約（キャンセル除く）
        const thisDay = (reservations || []).filter(r => r.datetime.slice(0, 10) === dateStr);
        // 予約（キャンセル含む）
        const allThisDay = (allReservations || []).filter(r => r.datetime.slice(0, 10) === dateStr);
        const cancels = allThisDay.filter(r => r.kubun && r.kubun.includes("キャンセル")).length;
        const total = allThisDay.length;
        const cancel_rate = total ? Math.round((cancels / total) * 100) : 0;

        return {
          date: dateStr,
          // 売上・決済は予約データが優先、それ以外は日次レポートから
          value: thisDay.reduce((acc, r) => acc + Number(r.price || 0), 0),
          cash: thisDay
            .filter(r => ["現金", "cash"].includes(r.payment_method))
            .reduce((acc, r) => acc + Number(r.price || 0), 0),
          card: thisDay
            .filter(r => ["カード", "card"].includes(r.payment_method))
            .reduce((acc, r) => acc + Number(r.price || 0), 0),
          paypay: thisDay
            .filter(r => ["PayPay", "paypay", "ペイペイ"].includes(r.payment_method))
            .reduce((acc, r) => acc + Number(r.price || 0), 0),
          visitors: thisDay.length,
          cancel_rate,
          // 日次レポート特有のフィールド（ここを絶対に落とさない！）
          cast_salary: report.cast_salary ?? null,
          cash_balance: report.cash_balance ?? null,
          diary_logs,
          // 他必要なカラムをここで
        };
      });
      setDailyReports(daily);
      setReservationsMonth(Array.isArray(reservations) ? reservations : []);

      // 月全体キャンセル率
      if (allReservations) {
        const total = allReservations.length;
        const cancels = allReservations.filter(r => r.kubun && r.kubun.includes("キャンセル")).length;
        setCancelRate(total ? Math.round((cancels / total) * 100) : 0);
      } else {
        setCancelRate(0);
      }
      setVisitors(Array.isArray(reservations) ? reservations.length : 0);
      console.log(dailyReports.map(r => ({
        date: r.date,
        diary_logs: r.diary_logs
      })));
    }
    fetchReservations();
  }, [currentStoreId, selectedMonth]);


  // --- コース別本数グラフ ---
  useEffect(() => {
    if (!currentStoreId || !selectedMonth) return;
    async function fetchCourseCounts() {
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01T00:00:00`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;
      const { data, error } = await supabase
        .from("reservations")
        .select("course")
        .eq("store_id", currentStoreId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate)
        .not("kubun", "ilike", "%キャンセル%");
      if (error) {
        setCourseData([]);
        return;
      }
      const countMap = {};
      data.forEach(row => {
        const name = row.course || "未設定";
        countMap[name] = (countMap[name] || 0) + 1;
      });
      const arr = Object.entries(countMap)
        .filter(([name, cnt]) => name && cnt > 0)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setCourseData(arr);
    }
    fetchCourseCounts();
  }, [currentStoreId, selectedMonth]);


  // サマリー用
  const today = new Date();
  const viewingYear = Number(selectedMonth.split("-")[0]);
  const viewingMonth = Number(selectedMonth.split("-")[1]);
  const isCurrentMonth = (today.getFullYear() === viewingYear && (today.getMonth() + 1) === viewingMonth);
  const currentDay = isCurrentMonth ? today.getDate() : new Date(viewingYear, viewingMonth, 0).getDate();
  const sumTotal = dailyReports.reduce((sum, r) => sum + (r.value || 0), 0);
  const unitPrice = visitors ? Math.round(sumTotal / visitors) : 0;
  const totalDays = new Date(viewingYear, viewingMonth, 0).getDate();
  const averageDaily = currentDay > 0 ? Math.round(sumTotal / currentDay) : 0;
  const forecast = averageDaily * totalDays;
  const goalNum = Number(goal || 0);

  // タブ
  const tabs = useMemo(() => [
    { label: "日別売上詳細", panel: <DailyDetailPanel dailyReports={dailyReports} reservations={reservationsMonth} castList={castList} /> },
    { label: "キャスト別給料額", panel: <CastSalaryPanel dailyReports={dailyReports} castList={castList} reservationsMonth={reservationsMonth} /> },
    ...(canUseFeature("diaryTab", userRank) ? [
      { label: "写メ日記本数", panel: <DiaryCountPanel dailyReports={dailyReports} shopdir={currentStoreId} extraCookies={{}} /> }
    ] : []),
    { label: "コース・OP・指名分析", panel: <CourseOpPanel reservationsMonth={reservationsMonth} selectedMonth={selectedMonth} storeId={currentStoreId} /> },
    ...(["A", "S"].includes(userRank)
      ? [{
        label: "在籍キャスト分析",
        panel: (
          <CastAnalysisPanel
            reservationsMonth={reservationsMonth}
            storeId={currentStoreId}
            selectedMonth={selectedMonth}
            canUseCastDiaryAnalysis={canUseFeature("castDiaryAnalysis", userRank)}
          />
        )
      }]
      : []),
    { label: "前月・前年比較", panel: <ComparePanel storeId={currentStoreId} /> }
  ], [dailyReports, reservationsMonth, castList, currentStoreId, selectedMonth, userRank]);

  // ←これ追加！
  useEffect(() => {
    if (tab >= tabs.length) {
      setTab(0);
    }
  }, [tabs.length]);

  return (
    <Box sx={{
      p: { xs: 1, md: 3 },
      width: "100%",
      minHeight: "100vh",
      bgcolor: gradBG,
      borderRadius: "0 0 32px 32px",
      overflow: "hidden"
    }}>
      {/* --- ヘッダー --- */}
      <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
        <InputLabel>月選択</InputLabel>
        <Select
          value={selectedMonth}
          label="月選択"
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {monthOptions.map(m => (
            <MenuItem key={m} value={m}>{m.replace("-", "年") + "月"}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* --- サマリー --- */}
      <SummaryHeader
        dailyReports={dailyReports}
        forecast={forecast}
        goal={goalFromDB}
        courseData={courseData}
        unitPrice={unitPrice}
        visitors={visitors}
        cancelRate={cancelRate}
        selectedMonth={selectedMonth}
      />

      {/* --- タブパネル --- */}
      <Paper sx={{
        mt: 2,
        borderRadius: 4,
        boxShadow: 8,
        bgcolor: "#f6f7fa",
        p: 0,
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.16s, background 0.14s",
        '&:hover': { boxShadow: "0 10px 34px #818cf844", background: "#f8fafc" }
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            borderBottom: 1,
            borderColor: "#e0e7ff",
            "& .MuiTabs-indicator": {
              background: "linear-gradient(90deg,#4339f2 60%,#5ad2f6 100%)"
            }
          }}
        >
          {tabs.map((t, i) => <Tab key={i} label={t.label} sx={{
            fontSize: 16, fontWeight: "bold", borderRadius: 4, mx: 0.5, minHeight: 42
          }} />)}
        </Tabs>
        <Divider />
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {tabs[tab]?.panel ?? null}
        </Box>
      </Paper>
    </Box>
  );
}
