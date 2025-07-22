import React, { useEffect, useState } from "react";
import {
  Box, Card, Typography, Button, TextField, Chip, Divider, Stack, Checkbox,
  FormControlLabel, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Table, TableBody, TableRow, TableCell
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaidIcon from "@mui/icons-material/Paid";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from "recharts";
import { useSettings, mapStoreIdForDB } from "../SettingsContext";
import { supabase } from '../lib/supabase';
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PercentIcon from "@mui/icons-material/Percent";
import AddIcon from "@mui/icons-material/Add";

const accent = "#6366f1";
const cyan = "#06b6d4";
const pink = "#e879f9";
const gradBG = "linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 80%)";
const glassStyle = {
  background: "rgba(255,255,255,0.89)",
  boxShadow: "0 8px 32px 0 rgba(34,197,246,0.13), 0 1.5px 8px 0 #6366f113",
  border: "1.5px solid rgba(220,230,255,0.18)",
  backdropFilter: "blur(7px)",
  borderRadius: 12,
  overflow: "hidden"
};

export default function DailyReportPage() {
  const { staff = [], menuList = [], discounts = [], coupons = [], expenseItems = [], currentStoreId, sessionId, extraCookies } = useSettings();
  const store_id = mapStoreIdForDB ? mapStoreIdForDB(currentStoreId) : currentStoreId;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState(0);

  // 集計データ
  const [autoReport, setAutoReport] = useState({
    totalSales: 0,
    salesByType: { cash: 0, card: 0, paypay: 0 },
    courses: [],
    coursesCount: [],
    shimei: [],
    shimeiCount: [],
    ops: [],
    opCount: [],
    discounts: [],
    discountCount: [],
    castPays: [],
    totalCastPay: 0,
    couponUsage: [],
    orderList: [],
    adjustments: [],         // 調整額（値引き）金額リスト
    adjustmentsCount: [],    // 調整額（件数リスト）
    extraCharges: [],        // 追加料金 金額リスト
    extraChargesCount: [],
  });

  const expenseOptions = (expenseItems || []).map(x => typeof x === "object" ? x.name : x);
  const nonCastStaff = (staff || []).filter(s =>
    s.isActive !== false &&
    s.role && s.role !== "キャスト"
  );

  const [expenses, setExpenses] = useState([{ type: "支出", category: "", detail: "", amount: "" }]);
  const [pay, setPay] = useState([{ staff: "", amount: "" }]);
  const [checklist, setChecklist] = useState([
    { label: "出勤キャスト点呼・身だしなみ確認", checked: false },
    { label: "ルーム/待合室 清掃・消毒", checked: false },
    { label: "釣銭・現金残高点検", checked: false },
    { label: "予約/受付リスト確認", checked: false },
    { label: "備品/消耗品チェック", checked: false }
  ]);
  const [memo, setMemo] = useState("");
  const [closed, setClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [diaries, setDiaries] = useState([]);
  const [confirmNoDiaryOpen, setConfirmNoDiaryOpen] = useState(false);

  const recruitResults = [
    "採用", "面接のみ", "返事待ち", "不採用", "その他"
  ];
  const [recruits, setRecruits] = useState([
    { media: "", name: "", result: "", memo: "" }
  ]);

  const summaryCards = [
    {
      label: "コース売上合計",
      icon: <BarChartIcon sx={{ fontSize: 26, color: accent }} />,
      color: accent,
      value: autoReport.courses.reduce((sum, c) => sum + (c.total || 0), 0),
    },
    {
      label: "指名料合計",
      icon: <PersonPinIcon sx={{ fontSize: 26, color: pink }} />,
      color: pink,
      value: autoReport.shimei.reduce((sum, s) => sum + (s.total || 0), 0),
    },
    {
      label: "OP売上合計",
      icon: <LocalOfferIcon sx={{ fontSize: 26, color: cyan }} />,
      color: cyan,
      value: autoReport.ops.reduce((sum, o) => sum + (o.total || 0), 0),
    },
    {
      label: "割引合計",
      icon: <PercentIcon sx={{ fontSize: 26, color: "#10b981" }} />,
      color: "#10b981",
      value: autoReport.discounts.reduce((sum, d) => sum + (d.amount || 0), 0),
    },
    {
      label: "調整額（値引き）合計",
      icon: <PercentIcon sx={{ fontSize: 26, color: "#666" }} />,
      color: "#666",
      value: autoReport.adjustments?.[0]?.amount || 0,  // ←ここで合計金額
    },
    {
      label: "追加料金合計",
      icon: <AddIcon sx={{ fontSize: 26, color: pink }} />,
      color: pink,
      value: autoReport.extraCharges?.[0]?.amount || 0,  // ←ここで合計金額
    },
  ];

  const tabContent = [
    {
      label: "コース",
      color: accent,
      list: autoReport.coursesCount.map(c => ({ name: c.name, value: c.count })),
      valueLabel: "件数",
    },
    {
      label: "指名",
      color: pink,
      list: autoReport.shimeiCount.map(s => ({ name: s.name, value: s.count })),
      valueLabel: "件数",
    },
    {
      label: "OP",
      color: cyan,
      list: autoReport.opCount.map(o => ({ name: o.name, value: o.count })),
      valueLabel: "件数",
    },
    {
      label: "割引",
      color: "#10b981",
      list: autoReport.discountCount.map(d => ({ name: d.name, value: d.count })),
      valueLabel: "件数",
    },
    {
      label: "調整額",
      color: "#666",
      list: (autoReport.adjustmentsCount || []).map(a => ({ name: a.name, value: a.count })),
      valueLabel: "件数",
    },
    {
      label: "追加料金",
      color: pink,
      list: (autoReport.extraChargesCount || []).map(a => ({ name: a.name, value: a.count })),
      valueLabel: "件数",
    }
  ];


  // 写メ日記取得
  const handleFetchDiaries = async () => {
    setSaving(true);
    try {
      const center = new Date(date);
      const fromDate = new Date(center); fromDate.setDate(center.getDate() - 1);
      const toDate = new Date(center); toDate.setDate(center.getDate() + 0);
      const yyyyMMdd = d => d.toISOString().slice(0, 10);
      const API_BASE = "http://localhost:8000";
      const url = `${API_BASE}/api/heaven/diary_hourly`;
      const body = {
        session_id: sessionId,
        shopdir: store_id,
        extra_cookies: extraCookies,
        from_date: yyyyMMdd(fromDate),
        to_date: yyyyMMdd(toDate),
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 406) {
        setDiaries([]);
        alert("写メ日記はありませんでした");
        return;
      }
      const data = await res.json();
      if (data.ok && data.diaries) {
        const newDiaries = data.diaries;
        const existingKeys = new Set(
          diaries.map(d => `${d.date}_${d.cast}_${d.title}`)
        );
        const uniqueNewDiaries = newDiaries.filter(
          d => !existingKeys.has(`${d.date}_${d.cast}_${d.title}`)
        );
        const merged = [...diaries, ...uniqueNewDiaries];
        setDiaries(merged);
        alert(`写メ日記データを取得しました！（新規${uniqueNewDiaries.length}件）`);
      } else {
        setDiaries([]);
        alert("写メ日記の取得に失敗しました");
      }
    } catch (e) {
      setDiaries([]);
      alert("エラー: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // 集計データ・DB取得
  useEffect(() => {
    async function fetchData() {
      if (!store_id || !date) return;
      const { data: report } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('store_id', store_id)
        .eq('report_date', date)
        .maybeSingle();
      if (report) {
        setClosed(!!report.closed);
        setMemo(report.memo || "");
        setChecklist(report.checklist || [
          { label: "出勤キャスト点呼・身だしなみ確認", checked: false },
          { label: "ルーム/待合室 清掃・消毒", checked: false },
          { label: "釣銭・現金残高点検", checked: false },
          { label: "予約/受付リスト確認", checked: false },
          { label: "備品/消耗品チェック", checked: false }
        ]);
        setExpenses(report.expenses || [{ category: "", detail: "", amount: "" }]);
        setPay(report.pay || [{ staff: "", amount: "" }]);
        setDiaries(report.diary_logs || []);
        setRecruits(report.recruit_logs || [{ media: "", name: "", result: "", memo: "" }]);
      } else {
        setClosed(false);
        setMemo("");
        setChecklist([
          { label: "出勤キャスト点呼・身だしなみ確認", checked: false },
          { label: "ルーム/待合室 清掃・消毒", checked: false },
          { label: "釣銭・現金残高点検", checked: false },
          { label: "予約/受付リスト確認", checked: false },
          { label: "備品/消耗品チェック", checked: false }
        ]);
        setExpenses([{ category: "", detail: "", amount: "" }]);
        setPay([{ staff: "", amount: "" }]);
        setDiaries([]);
        setRecruits([{ media: "", name: "", result: "", memo: "" }]);
      }
      const { data: reservations } = await supabase
        .from('reservations')
        .select('*')
        .eq('store_id', store_id)
        .gte('datetime', `${date}T00:00:00`)
        .lte('datetime', `${date}T23:59:59`)
        .not('kubun', 'ilike', '%キャンセル%');

      const salesByType = { cash: 0, card: 0, paypay: 0 };
      let totalSales = 0, courses = {}, shimei = {}, shimeiCount = {}, ops = {}, opCount = {}, discountTotals = {}, castPaysRaw = {}, totalCastPayRaw = 0;
      let couponUsage = {}, orderList = {};

      for (const r of reservations || []) {
        // 支払い
        if (r.payment_method === "cash") salesByType.cash += Number(r.price) || 0;
        if (r.payment_method === "card") salesByType.card += Number(r.price) || 0;
        if (r.payment_method === "paypay") salesByType.paypay += Number(r.price) || 0;
        totalSales += Number(r.price) || 0;

        // コース
        if (r.course) courses[r.course] = (courses[r.course] || 0) + (Number(r.course_price) || 0);

        // 指名金額・本数
        if (r.shimei) {
          shimei[r.shimei] = (shimei[r.shimei] || 0) + (Number(r.shimei_fee) || 0);
          shimeiCount[r.shimei] = (shimeiCount[r.shimei] || 0) + 1;
        }
        // --- OP金額・本数 集計 ---
        if (Array.isArray(r.op_detail) && r.op_detail.length > 0) {
          for (const opItem of r.op_detail) {
            ops[opItem.name] = (ops[opItem.name] || 0) + Number(opItem.price || 0);
            opCount[opItem.name] = (opCount[opItem.name] || 0) + 1;
          }
        } else if (Array.isArray(r.op) && r.op.length > 0) {
          for (const opName of r.op) {
            ops[opName] = (ops[opName] || 0) + ((Number(r.op_price) || 0) / r.op.length);
            opCount[opName] = (opCount[opName] || 0) + 1;
          }
        }
        // --- 割引金額 ---
        if (r.discount && r.discount !== "null" && r.discount !== "") {
          let discountNames = [];
          try {
            discountNames = JSON.parse(r.discount);
          } catch {
            discountNames = [r.discount];
          }

          // ここは単純にr.discount_amountを割引コード数で割って分配
          const totalAmount = Number(r.discount_amount) || 0;
          const perDiscountAmount = totalAmount / discountNames.length;

          for (const name of discountNames) {
            discountTotals[name] = (discountTotals[name] || 0) + perDiscountAmount;
          }
        }
        // キャスト給
        if (r.cast_id) {
          castPaysRaw[r.cast_id] = (castPaysRaw[r.cast_id] || 0) + (Number(r.cast_pay) || 0);
          totalCastPayRaw += Number(r.cast_pay) || 0;
        }
      }
      // --- 給料確定データ（salaries） ---
      const { data: salaryRows } = await supabase
        .from('salaries')
        .select('*')
        .eq('store_id', store_id)
        .eq('date', date);
      const salaryMap = {};
      for (const s of salaryRows || []) {
        if (s.cast_id && s.final_salary != null) {
          salaryMap[s.cast_id] = Number(s.final_salary);
        }
      }
      let castPays = [];
      let totalCastPay = 0;
      for (const castId of Object.keys(salaryMap)) {
        let total = salaryMap[castId];
        castPays.push({ cast_id: castId, total });
        totalCastPay += total;
      }
      let coursesCount = {};
      for (const r of reservations || []) {
        if (r.course) coursesCount[r.course] = (coursesCount[r.course] || 0) + 1;
      }
      let discountCount = {};
      for (const r of reservations || []) {
        // 割引は配列 or 文字列
        let discountNames = [];
        try {
          discountNames = JSON.parse(r.discount);
        } catch {
          if (r.discount) discountNames = [r.discount];
        }
        for (const name of discountNames) {
          discountCount[name] = (discountCount[name] || 0) + 1;
        }
      }
      let adjustments = { "調整額": 0 };
      let adjustmentsCount = { "調整額": 0 };
      let extraCharges = { "追加料金": 0 };
      let extraChargesCount = { "追加料金": 0 };

      for (const r of reservations || []) {
        const adjust = Number(r.price_adjust) || 0;
        if (adjust < 0) {
          adjustments["調整額"] += adjust;    // 値引き合計
          adjustmentsCount["調整額"] += 1;    // 値引き件数
        }
        if (adjust > 0) {
          extraCharges["追加料金"] += adjust;  // 追加料金合計
          extraChargesCount["追加料金"] += 1;  // 追加料金件数
        }
      }
      setAutoReport({
        totalSales,
        salesByType,
        courses: Object.entries(courses).map(([name, total]) => ({ name, total })),
        coursesCount: Object.entries(coursesCount).map(([name, count]) => ({ name, count })),
        shimei: Object.entries(shimei).map(([name, total]) => ({ name, total })),
        shimeiCount: Object.entries(shimeiCount).map(([name, count]) => ({ name, count })),
        ops: Object.entries(ops).map(([name, total]) => ({ name, total })),
        opCount: Object.entries(opCount).map(([name, count]) => ({ name, count })),
        discounts: Object.entries(discountTotals).map(([name, amount]) => ({ name, amount })),
        discountCount: Object.entries(discountCount).map(([name, count]) => ({ name, count })),
        adjustments: Object.entries(adjustments).map(([name, amount]) => ({ name, amount })),
        adjustmentsCount: Object.entries(adjustmentsCount).map(([name, count]) => ({ name, count })),
        extraCharges: Object.entries(extraCharges).map(([name, amount]) => ({ name, amount })),
        extraChargesCount: Object.entries(extraChargesCount).map(([name, count]) => ({ name, count })),
        castPays,
        totalCastPay,
        couponUsage,
        orderList,
        castPaysRaw,
        totalCastPayRaw,
      });
    }
    fetchData();
  }, [store_id, date]);

  // 日付移動
  const moveDay = diff => {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + diff);
    setDate(dt.toISOString().slice(0, 10));
  };

  // 入力系
  const handleExpenseChange = (i, field, val) => {
    const arr = [...expenses];
    arr[i][field] = val;
    setExpenses(arr);
  };
  const handleAddExpense = () => setExpenses([...expenses, { category: "", detail: "", amount: "" }]);
  const handlePayChange = (i, field, val) => {
    const arr = [...pay];
    arr[i][field] = val;
    setPay(arr);
  };
  const handleAddPay = () => setPay([...pay, { staff: "", amount: "" }]);
  const handleChecklistChange = idx =>
    setChecklist(checklist.map((c, i) => i === idx ? { ...c, checked: !c.checked } : c));

  // 合計
  const totalExpense = expenses.reduce((sum, e) => {
    const v = Number(e.amount || 0);
    return sum + (e.type === "収入" ? v : -v);
  }, 0);
  const totalPay = pay.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalCastPay = autoReport.totalCastPay || 0;
  const cashBalance =
    Number(autoReport.totalSales || 0)
    - Number(totalCastPay)
    + Number(totalExpense)
    - Number(totalPay);

  // 直近3日分を取得
  const getRecentDiaryLogs = async (store_id, date) => {
    const dates = [];
    for (let i = -2; i <= 0; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    const { data, error } = await supabase
      .from("daily_reports")
      .select("diary_logs")
      .eq("store_id", store_id)
      .in("report_date", dates);

    if (!data) return [];
    return data.flatMap(r => r.diary_logs || []);
  };

  // 締め保存
  const handleCloseButtonClick = () => {
    if (!diaries || diaries.length === 0) {
      setConfirmNoDiaryOpen(true);
      return;
    }
    handleClose();
  };
  const handleClose = async () => {
    setSaving(true);
    setErr("");
    try {
      const recentDiaries = await getRecentDiaryLogs(store_id, date);
      const existingKeys = new Set(
        recentDiaries.map(d => `${d.date}_${d.cast}_${d.title}`)
      );
      const uniqueNewDiaries = diaries.filter(
        d => !existingKeys.has(`${d.date}_${d.cast}_${d.title}`)
      );

      const saveData = {
        store_id: store_id,
        report_date: date,
        sales_cash: autoReport.salesByType.cash,
        sales_card: autoReport.salesByType.card,
        sales_paypay: autoReport.salesByType.paypay,
        discount_total: autoReport.discounts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
        expense_total: totalExpense,
        pay_total: totalPay,
        cash_balance: cashBalance,
        memo: memo,
        memo_readed: false,
        closed: true,
        order_list: autoReport.courses,
        coupon_usage: autoReport.discounts,
        expenses: expenses,
        pay: pay,
        checklist: checklist,
        cast_salary: autoReport.castPays,
        op_detail: autoReport.ops,
        op_count: autoReport.opCount,
        shimei: autoReport.shimei,
        shimei_count: autoReport.shimeiCount,
        diary_logs: uniqueNewDiaries,
        recruit_logs: recruits,
      };
      console.log("[保存送信データ]", saveData);

      const { error } = await supabase.from("daily_reports")
        .upsert([saveData], { onConflict: ['report_date', 'store_id'] });

      if (error) throw error;
      setClosed(true);
    } catch (e) {
      setErr(e.message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };
  const handleUnlock = () => setClosed(false);

  // グラフ用
  const courseChart = autoReport.courses.length
    ? autoReport.courses.map(x => ({ name: x.name, 金額: x.total }))
    : [];
  const shimeiChart = autoReport.shimei.some(x => x.total > 0)
    ? autoReport.shimei.map(x => ({ name: x.name, 金額: x.total }))
    : autoReport.shimeiCount.map(x => ({ name: x.name, 件数: x.count }));
  const opChart = autoReport.ops.some(x => x.total > 0)
    ? autoReport.ops.map(x => ({ name: x.name, 金額: x.total }))
    : autoReport.opCount.map(x => ({ name: x.name, 件数: x.count }));
  const castPayChart = autoReport.castPays.map(c => ({
    name: (staff || []).find(s => String(s.id) === String(c.cast_id))?.name || `ID:${c.cast_id}`,
    給料: c.total
  }));

  return (
    <Box sx={{
      width: "100%",
      minHeight: "100vh",
      bgcolor: gradBG,
      px: { xs: 1, md: 3 },
      pt: 3,
      pb: 4,
      overflowX: "auto"
    }}>
      {/* ---- ヘッダー ---- */}
      <Box mb={2} display="flex" alignItems="center" gap={2}>
        <Box ml="auto" display="flex" alignItems="center" gap={1}>
          <Button onClick={() => moveDay(-1)}>前日</Button>
          <TextField
            type="date"
            size="small"
            variant="outlined"
            value={date}
            onChange={e => setDate(e.target.value)}
            sx={{ minWidth: 140, bgcolor: "#fff", borderRadius: 2 }}
            inputProps={{ style: { fontSize: 18 } }}
          />
          <Button onClick={() => moveDay(1)}>翌日</Button>
        </Box>
      </Box>

      {/* ---- エラー ---- */}
      <Dialog open={!!err} onClose={() => setErr("")}>
        <DialogTitle>保存エラー</DialogTitle>
        <DialogContent>{err}</DialogContent>
        <DialogActions>
          <Button onClick={() => setErr("")}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* ---- パネル全体 ---- */}
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Box sx={{
          width: "100%",
          ...glassStyle,
          borderRadius: 12,
          p: { xs: 2, md: 4 },
          minWidth: { xs: "auto", md: 400 },
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column"
        }}>
          <Box sx={{ mb: 1, pb: 1, borderBottom: "1.5px dashed #e0e7ef" }}>
            <Typography fontWeight={700} color={cyan} fontSize={16}>日報入力パネル</Typography>
          </Box>
          <Box display="flex" alignItems="center" mb={2} gap={2}>
            <CalendarMonthIcon sx={{ color: cyan }} />
            <Typography fontWeight={700} fontSize={17}>
              {date}
            </Typography>
            {closed && (
              <Chip label="締め済" color="success" icon={<DoneAllIcon />} sx={{ ml: 2, fontWeight: "bold" }} />
            )}

             {/* ← ここに売上合計 */}
  <Typography
    fontWeight={900}
    fontSize={25}
    color={accent}
    sx={{ ml: 3 }}
  >
    総売上：{autoReport.totalSales?.toLocaleString() || 0}円
  </Typography>
          </Box>
          <Divider sx={{ my: 2 }} />

          {/* ====== 売上・詳細 ====== */}
          <Box sx={{
            p: { xs: 1, md: 3 },
            borderRadius: 4,
            bgcolor: "#fcfcfe",
            boxShadow: "0 6px 28px #6366f111",
            maxWidth: 1300,
            mx: "auto"
          }}>
            <Typography variant="h6" fontWeight={900} sx={{ color: accent, mb: 3, fontSize: 23 }}>
              コース・指名・OP・割引・調整額・追加料金 集計（{date}）
            </Typography>

            {/* サマリーカード */}
            <Box display="flex" gap={2} mb={3} flexWrap="wrap" justifyContent="left">
              {summaryCards.map(card => (
                <Card
                  key={card.label}
                  sx={{
                    width: 195, minHeight: 80, px: 2, py: 1.5,
                    display: "flex", alignItems: "center", gap: 1.4,
                    borderLeft: `5px solid ${card.color}`,
                    boxShadow: "0 2px 12px #c7d0ff33",
                    bgcolor: "#fff", borderRadius: 3,
                  }}
                >
                  <Box>{card.icon}</Box>
                  <Box>
                    <Typography fontSize={13.5} color={card.color} fontWeight={800}>
                      {card.label}
                    </Typography>
                    <Typography fontSize={24} fontWeight={900} sx={{ color: "#23235a", letterSpacing: 1 }}>
                      {Number(card.value).toLocaleString()} <span style={{ fontSize: 16, color: "#555" }}>円</span>
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Box>

            {/* タブ */}
            <Box>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                  mb: 2,
                  ".MuiTab-root": { fontWeight: 800, fontSize: 15, px: 3, borderRadius: 2 },
                  ".MuiTabs-indicator": { background: accent }
                }}
              >
                {tabContent.map((tabItem, i) => (
                  <Tab
                    key={tabItem.label}
                    label={tabItem.label}
                    sx={{ color: tab === i ? tabItem.color : "#888" }}
                  />
                ))}
              </Tabs>
              <Divider />
              <Box mt={3}>
                <Typography fontWeight={900} color={tabContent[tab].color} fontSize={16} mb={1.2}>
                  {tabContent[tab].label}詳細
                </Typography>
                <Table size="small" sx={{ minWidth: 260 }}>
                  <TableBody>
                    {tabContent[tab].list.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} align="center" sx={{ color: "#aaa" }}>データなし</TableCell>
                      </TableRow>
                    ) : (
                      tabContent[tab].list.map((item, idx) => (
                        <TableRow key={`${item.name}-${item.value}-${idx}`}>
                          <TableCell sx={{ fontWeight: 500, fontSize: 16, color: "#333" }}>{item.name}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 16 }}>
                            {item.value.toLocaleString()} <span style={{ fontWeight: 400, fontSize: 13, color: "#777" }}>件</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </Box>

          {/* ==== キャスト給明細 ==== */}
<Divider sx={{ my: 2 }} />
<Box mb={3}>
  <Typography fontWeight={900} fontSize={20} color={cyan} mb={1}>
    <PaidIcon sx={{ color: pink, mr: 1, fontSize: 23, mb: "-3px" }} />
    総キャスト給：{autoReport.totalCastPay.toLocaleString()}円
  </Typography>

  {/* BarChart部分を下記テーブルに置換 */}
  <Table size="small" sx={{ minWidth: 260 }}>
    <TableBody>
      {autoReport.castPays.map((item, idx) => (
        <TableRow key={idx}>
          <TableCell sx={{ fontWeight: 500, fontSize: 16, color: "#333" }}>
            {(staff || []).find(s => String(s.id) === String(item.cast_id))?.name || `ID:${item.cast_id}`}
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 16 }}>
            {Number(item.total || 0).toLocaleString()} <span style={{ fontWeight: 400, fontSize: 13, color: "#777" }}>円</span>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Box>


          <Divider sx={{ my: 2 }} />
          {/* ---- 経費入力 ---- */}
          <Box mb={3} width="100%">
            <Typography fontWeight={700} fontSize={17} color={accent} mb={1}>
              <ReceiptIcon sx={{ mr: 1, color: "#38bdf8" }} />経費入力
            </Typography>
            <Stack spacing={1.2}>
              {expenses.map((exp, i) => (
                <Stack key={i} direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    label="カテゴリ"
                    value={exp.category}
                    onChange={e => handleExpenseChange(i, "category", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 140, width: 180, bgcolor: "#f9fafb", borderRadius: 2 }}
                  >
                    <MenuItem value="">選択</MenuItem>
                    {expenseOptions.map(x =>
                      <MenuItem key={x} value={x}>{x}</MenuItem>
                    )}
                  </TextField>
                  <TextField
                    label="詳細"
                    value={exp.detail}
                    onChange={e => handleExpenseChange(i, "detail", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 140, width: 220, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <TextField
                    label="金額"
                    type="number"
                    value={exp.amount}
                    onChange={e => handleExpenseChange(i, "amount", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    InputProps={{ endAdornment: <span>円</span> }}
                    sx={{ width: 120, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <TextField
                    select
                    label="区分"
                    value={exp.type || "支出"}
                    onChange={e => handleExpenseChange(i, "type", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 80, bgcolor: "#f9fafb", borderRadius: 2, mr: 1 }}
                  >
                    <MenuItem value="支出">支出</MenuItem>
                    <MenuItem value="収入">収入</MenuItem>
                  </TextField>
                  <IconButton
                    aria-label="削除"
                    color="error"
                    onClick={() => setExpenses(expenses.filter((_, idx) => idx !== i))}
                    disabled={closed}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              {!closed && (
                <Button
                  variant="contained"
                  color="info"
                  onClick={handleAddExpense}
                  sx={{
                    bgcolor: cyan,
                    color: "#fff",
                    borderRadius: 2,
                    fontWeight: 700,
                    mt: 1,
                    alignSelf: "flex-start",
                  }}
                >
                  ＋ 経費追加
                </Button>
              )}
            </Stack>
            <Box mt={1} ml={1.5}>
              <Chip
                label={`合計：${totalExpense >= 0 ? '+' : ''}${totalExpense.toLocaleString()}円`}
                color={totalExpense >= 0 ? "success" : "info"}
                sx={{ fontWeight: "bold", bgcolor: "#e0f2fe" }}
                onClick={() => { }}
              />
            </Box>
          </Box>

          {/* ---- スタッフ日払い ---- */}
          <Divider sx={{ my: 2 }} />
          <Box mb={3} width="100%">
            <Typography fontWeight={700} fontSize={17} color={accent} mb={1}>
              <PaidIcon sx={{ mr: 1, color: "#f472b6" }} />スタッフ日払い
            </Typography>
            <Stack spacing={1.2}>
              {pay.map((p, i) => (
                <Stack key={i} direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    label="スタッフ名"
                    value={p.staff}
                    onChange={e => handlePayChange(i, "staff", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 180, width: 240, bgcolor: "#f9fafb", borderRadius: 2 }}
                  >
                    <MenuItem value="">選択</MenuItem>
                    {(nonCastStaff || []).map(x =>
                      <MenuItem key={x.name || x} value={x.name || x}>{x.name || x}</MenuItem>
                    )}
                  </TextField>
                  <TextField
                    label="金額"
                    type="number"
                    value={p.amount}
                    onChange={e => handlePayChange(i, "amount", e.target.value)}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    InputProps={{ endAdornment: <span>円</span> }}
                    sx={{ width: 180, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <IconButton
                    aria-label="削除"
                    color="error"
                    onClick={() => setPay(pay.filter((_, idx) => idx !== i))}
                    disabled={closed}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              {!closed && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleAddPay}
                  sx={{
                    bgcolor: "#f472b6",
                    color: "#fff",
                    borderRadius: 2,
                    fontWeight: 700,
                    mt: 1,
                    alignSelf: "flex-start",
                  }}
                >
                  ＋ 日払い追加
                </Button>
              )}
            </Stack>
            <Box mt={1} ml={1.5}>
              <Chip
                label={`合計：${totalPay.toLocaleString()}円`}
                color="secondary"
                sx={{ fontWeight: "bold", bgcolor: "#fbeffb" }}
                onClick={() => { }}
              />
            </Box>
          </Box>

          {/* ---- 求人情報 ---- */}
          <Divider sx={{ my: 2 }} />
          <Box mb={3} width="100%">
            <Typography fontWeight={700} fontSize={17} color={accent} mb={0.5}>
              求人情報
            </Typography>
            <Stack spacing={1.2}>
              {recruits.map((rec, i) => (
                <Stack key={i} direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="媒体名"
                    value={rec.media}
                    onChange={e => {
                      const arr = [...recruits];
                      arr[i].media = e.target.value;
                      setRecruits(arr);
                    }}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 100, width: 120, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <TextField
                    label="名前"
                    value={rec.name}
                    onChange={e => {
                      const arr = [...recruits];
                      arr[i].name = e.target.value;
                      setRecruits(arr);
                    }}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 100, width: 120, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <TextField
                    select
                    label="結果"
                    value={rec.result}
                    onChange={e => {
                      const arr = [...recruits];
                      arr[i].result = e.target.value;
                      setRecruits(arr);
                    }}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 120, width: 130, bgcolor: "#f9fafb", borderRadius: 2 }}
                  >
                    {recruitResults.map(option => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="備考"
                    value={rec.memo}
                    onChange={e => {
                      const arr = [...recruits];
                      arr[i].memo = e.target.value;
                      setRecruits(arr);
                    }}
                    size="small"
                    variant="outlined"
                    disabled={closed}
                    sx={{ minWidth: 160, width: 200, bgcolor: "#f9fafb", borderRadius: 2 }}
                  />
                  <IconButton
                    aria-label="削除"
                    color="error"
                    onClick={() => setRecruits(recruits.filter((_, idx) => idx !== i))}
                    disabled={closed}
                    sx={{ ml: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              {!closed && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setRecruits([...recruits, { media: "", name: "", result: "", memo: "" }])}
                  sx={{
                    bgcolor: cyan,
                    color: "#fff",
                    borderRadius: 2,
                    fontWeight: 700,
                    mt: 1,
                    alignSelf: "flex-start",
                  }}
                >
                  ＋ 求人追加
                </Button>
              )}
            </Stack>
          </Box>

          {/* ---- チェックリスト ---- */}
          <Divider sx={{ my: 2 }} />
          <Box mb={3} width="100%">
            <Typography fontWeight={700} fontSize={17} color={accent} mb={0.5}>
              <DoneAllIcon sx={{ mr: 1, color: "#38bdf8" }} />本日営業チェックリスト
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
              {checklist.map((item, i) => (
                <FormControlLabel
                  key={item.label}
                  control={
                    <Checkbox
                      checked={item.checked}
                      onChange={() => handleChecklistChange(i)}
                      disabled={closed}
                      sx={{
                        color: cyan,
                        "&.Mui-checked": { color: accent }
                      }}
                    />
                  }
                  label={<Typography fontSize={14} fontWeight={600}>{item.label}</Typography>}
                />
              ))}
              {/* チェックリストの右端にボタンを追加 */}
              <Button
                variant="contained"
                color="info"
                sx={{ fontWeight: 700, borderRadius: 2, ml: 2, minWidth: 140 }}
                onClick={handleFetchDiaries}
                disabled={saving}
              >
                写メ日記取得・保存
              </Button>
            </Stack>
          </Box>

          {/* ---- 現金残高 ---- */}
          <Divider sx={{ my: 2 }} />
          <Box
            mb={3}
            width="100%"
            sx={{
              background: "linear-gradient(90deg,#a5b4fc 0%, #5eead4 100%)",
              borderRadius: 3,
              boxShadow: "0 4px 24px #5eead477,0 1.5px 8px #6366f116",
              p: 3,
              display: "flex",
              alignItems: "center",
              gap: 2,
              position: "relative",
              minHeight: 80
            }}
          >
            <AttachMoneyIcon sx={{ fontSize: 40, color: "#fff", mr: 2, textShadow: "0 2px 12px #6366f155" }} />
            <Box>
              <Typography
                fontWeight={900}
                fontSize={22}
                color="#fff"
                letterSpacing={1.5}
                sx={{
                  textShadow: "0 2px 12px #6366f180"
                }}
              >
                本日現金残高
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  color: "#f1f5f9",
                  mt: 0.2,
                  textShadow: "0 2px 12px #2221"
                }}
              >
                売上−給料-経費−日払い の自動計算
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Box
              sx={{
                px: 3,
                py: 1.5,
                bgcolor: "#fff",
                color: "#22d3ee",
                fontWeight: 900,
                fontSize: 30,
                borderRadius: "48px",
                boxShadow: "0 2px 16px #5eead433, 0 0.5px 2px #818cf866",
                ml: 2,
                border: "2.5px solid #67e8f9"
              }}
            >
              {cashBalance.toLocaleString()}円
            </Box>
          </Box>

          {/* ---- メモ欄 ---- */}
          <Box mb={2} width="100%">
            <Typography fontWeight={700} fontSize={16} color={accent} mb={0.5}>
              引き継ぎ事項・メモ
            </Typography>
            <TextField
              label="気づき/注意点/イレギュラーなど自由記入"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              disabled={closed}
              sx={{ bgcolor: "#f7f8fa", borderRadius: 2 }}
            />
          </Box>

          {/* ---- アクション ---- */}
          <Stack direction="row" spacing={2} mt={2} justifyContent="flex-end">
            {!closed ? (
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  fontWeight: "bold", px: 4, borderRadius: 2, letterSpacing: 2, bgcolor: accent,
                  boxShadow: "0 2px 10px #6366f122",
                  "&:hover": { bgcolor: "#5856d6" }
                }}
                onClick={handleCloseButtonClick}
                disabled={saving}
              >
                {saving ? "保存中..." : "締め作業を完了する"}
              </Button>
            ) : (
              <Button
                variant="text"
                color="secondary"
                sx={{ fontWeight: 700, borderRadius: 2 }}
                onClick={handleUnlock}
              >
                編集解除
              </Button>
            )}
          </Stack>

          {/* --- 写メ日記未取得時の確認ダイアログ --- */}
          <Dialog open={confirmNoDiaryOpen} onClose={() => setConfirmNoDiaryOpen(false)}>
            <DialogTitle>写メ日記未取得で締め作業を行いますか？</DialogTitle>
            <DialogContent>
              <Typography>
                写メ日記が取得されていません。<br />
                このまま締め作業を完了しますか？
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmNoDiaryOpen(false)}>キャンセル</Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setConfirmNoDiaryOpen(false);
                  handleClose();
                }}
              >
                はい、このまま完了する
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  )
};