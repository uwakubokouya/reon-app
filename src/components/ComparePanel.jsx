import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Paper, Typography, Box, Grid, Card, CardContent, Chip
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";

// ユーティリティ: 月表示
function formatMonthYM(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${y}年${m}月`;
}
function getPrevMonthYM(ym) {
  if (!ym) return "";
  let [y, m] = ym.split("-").map(Number);
  m--;
  if (m === 0) {
    y--; m = 12;
  }
  return `${y}-${m.toString().padStart(2, "0")}`;
}
function getPrevYearYM(ym) {
  if (!ym) return "";
  let [y, m] = ym.split("-");
  y = Number(y) - 1;
  return `${y}-${m}`;
}
function generateMonthRange(fromYM, toYM) {
  const range = [];
  let ym = fromYM;
  while (ym <= toYM) {
    range.push(ym);
    let [y, m] = ym.split("-").map(Number);
    m++;
    if (m > 12) { y++; m = 1; }
    ym = `${y}-${m.toString().padStart(2, "0")}`;
  }
  return range;
}
function DiffRate({ now, prev }) {
  if (prev == null || prev === undefined) return <span style={{ color: "#888" }}>-</span>;
  if (prev === 0) {
    if (now === 0) return <span style={{ color: "#888" }}>0%</span>;
    return <span style={{ color: "#1e88e5", fontWeight: 700 }}>+∞%</span>;
  }
  const rate = ((now - prev) / prev) * 100;
  if (rate > 0) return (
    <span style={{ color: "#10b981", fontWeight: 700, marginLeft: 4 }}>
      <ArrowUpwardIcon sx={{ fontSize: 16, mb: "-2px" }} />
      {`+${rate.toFixed(1)}%`}
    </span>
  );
  if (rate < 0) return (
    <span style={{ color: "#ef5350", fontWeight: 700, marginLeft: 4 }}>
      <ArrowDownwardIcon sx={{ fontSize: 16, mb: "-2px" }} />
      {`${rate.toFixed(1)}%`}
    </span>
  );
  return (
    <span style={{ color: "#888", fontWeight: 700, marginLeft: 4 }}>
      <TrendingFlatIcon sx={{ fontSize: 16, mb: "-2px" }} />
      0%
    </span>
  );
}
function StatCard({ label, value, prev, prevYear }) {
  return (
    <Card sx={{ minWidth: 170, borderRadius: 3, boxShadow: "0 1px 10px #0001", m: 0.5 }}>
      <CardContent>
        <Typography fontSize={13} color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography fontWeight={900} fontSize={22} color="#222">
          {value?.toLocaleString() ?? "-"}
        </Typography>
        <Box display="flex" gap={1} alignItems="center" mt={1}>
          <Box fontSize={12} color="#666">前月比</Box>
          <DiffRate now={value} prev={prev} />
        </Box>
        <Box display="flex" gap={1} alignItems="center" mt={0.5}>
          <Box fontSize={12} color="#666">前年比</Box>
          <DiffRate now={value} prev={prevYear} />
        </Box>
      </CardContent>
    </Card>
  );
}

// 本体
export default function ComparePanel({ storeId }) {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);

  // データ取得
  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      let query = supabase.from("daily_reports").select("*").order("report_date", { ascending: true });
      if (storeId) query = query.eq("store_id", storeId);
      const { data, error } = await query;
      setReports(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchData();
  }, [storeId]);

  // 月ごと集計
  const monthMap = useMemo(() => {
    const m = {};
    reports.forEach(r => {
      const ym = (r.report_date || r.date || "").slice(0, 7); // YYYY-MM
      if (!ym) return;
      if (!m[ym]) m[ym] = {
        sales: 0, cash: 0, expense: 0, castPay: 0, days: 0
      };
      m[ym].sales += Number(r.sales_cash || 0) + Number(r.sales_card || 0) + Number(r.sales_paypay || 0);
      m[ym].cash += Number(r.cash_balance || 0);
      m[ym].expense += Number(r.expense_total || 0);
      // cast_salary (json)
      let castSalary = [];
      if (Array.isArray(r.cast_salary)) castSalary = r.cast_salary;
      else if (typeof r.cast_salary === "string" && r.cast_salary.startsWith("[")) {
        try { castSalary = JSON.parse(r.cast_salary); } catch { castSalary = []; }
      }
      m[ym].castPay += castSalary.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      m[ym].days++;
    });
    return m;
  }, [reports]);

  // 月範囲生成
  const allMonths = Object.keys(monthMap).sort();
  if (!allMonths.length) {
    return <Paper sx={{ p: 3, borderRadius: 3, minHeight: 400 }}>データがありません。</Paper>;
  }
  const lastYM = allMonths[allMonths.length - 1];
  const monthsRange = generateMonthRange(
    getPrevMonthYM(getPrevYearYM(lastYM)), // 1年前の前月
    lastYM
  );
  // 欠損を0で埋める
  const dataArr = monthsRange.map(m => ({
    month: `${m.slice(5)}月`,
    ym: m,
    売上: monthMap[m]?.sales || 0,
    現金残高: monthMap[m]?.cash || 0,
    経費: monthMap[m]?.expense || 0,
    キャスト給: monthMap[m]?.castPay || 0,
  }));

  const lastIdx = dataArr.length - 1;
  const lastYMLabel = dataArr[lastIdx]?.ym;
  const prevMonthYM = getPrevMonthYM(lastYMLabel);
  const prevYearYM = getPrevYearYM(lastYMLabel);
  const prevIdx = dataArr.findIndex(row => row.ym === prevMonthYM);
  const prevYearIdx = dataArr.findIndex(row => row.ym === prevYearYM);
  const labels = ["売上", "現金残高", "経費", "キャスト給"];

  return (
    <Paper sx={{ p: 3, borderRadius: 3, minHeight: 400 }}>
      <Typography
        component="span"
        fontWeight={900}
        fontSize={19}
        mb={2}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        前月・前年比較
        <Chip label="自動集計" color="primary" size="small" sx={{ ml: 1 }} onClick={() => {}}/>
      </Typography>
      <Box mb={2} fontSize={15} fontWeight={600}>
        今月：{formatMonthYM(lastYMLabel)}　
        前月：{formatMonthYM(prevMonthYM)}　
        前年同月：{formatMonthYM(prevYearYM)}
      </Box>
      <Grid container spacing={1} mb={1}>
        {labels.map(label => (
          <Grid item xs={12} sm={6} md={3} key={label} onClick={() => {}}>
            <StatCard
              label={label}
              value={dataArr[lastIdx]?.[label]}
              prev={prevIdx !== -1 ? dataArr[prevIdx]?.[label] : undefined}
              prevYear={prevYearIdx !== -1 ? dataArr[prevYearIdx]?.[label] : undefined}
            />
          </Grid>
        ))}
      </Grid>
      <Box mt={2} mb={2}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dataArr.slice(-13)} margin={{ left: 18, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={v => v?.toLocaleString() + "円"} />
            <Legend />
            <Bar dataKey="売上" fill="#6366f1" />
            <Bar dataKey="現金残高" fill="#06b6d4" />
            <Bar dataKey="経費" fill="#f7a823" />
            <Bar dataKey="キャスト給" fill="#f08080" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
