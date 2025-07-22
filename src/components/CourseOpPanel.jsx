import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import {
  Box, Paper, Typography, Card, Table, TableBody, TableCell, TableRow, Tabs, Tab, Divider
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PercentIcon from "@mui/icons-material/Percent";
import AddIcon from "@mui/icons-material/Add";

const accent = "#6366f1";
const orange = "#ffbc42";
const magenta = "#e879f9";
const green = "#10b981";
const pink = "#f472b6";

function sumByGroup(data, groupKey, valueKey = "price", parseArray = false) {
  const result = {};
  data.forEach(r => {
    if (parseArray) {
      let items = [];
      try {
        if (typeof r[groupKey] === "string" && r[groupKey].startsWith("[")) items = JSON.parse(r[groupKey]);
        else if (Array.isArray(r[groupKey])) items = r[groupKey];
        if (!items || items.length === 0) items = ["なし"];
      } catch { items = ["不明"]; }
      items.forEach(item => {
        result[item] = (result[item] || 0) + Number(r[valueKey] || 0);
      });
    } else {
      const key = r[groupKey] || "なし";
      result[key] = (result[key] || 0) + Number(r[valueKey] || 0);
    }
  });
  return result;
}

export default function CourseOpPanel({ storeId, selectedMonth }) {
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!storeId || !selectedMonth) return;
    setLoading(true);
    async function fetchData() {
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const fromDate = `${year}-${month}-01T00:00:00`;
      const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}T23:59:59`;

      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("datetime", fromDate)
        .lte("datetime", toDate)
        .not("kubun", "ilike", "%キャンセル%");
      setReservations(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchData();
  }, [storeId, selectedMonth]);

  // --- 各集計 ---
  const courseList = useMemo(() => {
    const obj = sumByGroup(reservations, "course", "course_price");
    return Object.entries(obj).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
  }, [reservations]);
  const shimeiList = useMemo(() => {
    const obj = sumByGroup(reservations, "shimei", "shimei_fee");
    return Object.entries(obj).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
  }, [reservations]);
  const opList = useMemo(() => {
    const obj = sumByGroup(reservations, "op", "op_price", true);
    return Object.entries(obj).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
  }, [reservations]);
  const courseTotal = useMemo(() => courseList.reduce((sum, item) => sum + item.sales, 0), [courseList]);
  const shimeiTotal = useMemo(() => shimeiList.reduce((sum, item) => sum + item.sales, 0), [shimeiList]);
  const opTotal = useMemo(() => opList.reduce((sum, item) => sum + item.sales, 0), [opList]);

  // --- 割引 ---
  const discountList = useMemo(() => {
    const obj = sumByGroup(reservations, "discount", "discount_amount");
    return Object.entries(obj).map(([name, sales]) => ({ name, sales })).filter(x => x.sales !== 0);
  }, [reservations]);
  const discountTotal = useMemo(() => discountList.reduce((sum, item) => sum + item.sales, 0), [discountList]);

  // --- 調整額 ---
  const priceAdjustDiscountList = useMemo(() =>
    reservations.filter(r => Number(r.price_adjust) < 0)
      .map(r => ({ name: "価格調整（値引き）", sales: Number(r.price_adjust) })),
    [reservations]
  );
  const priceAdjustAddList = useMemo(() =>
    reservations.filter(r => Number(r.price_adjust) > 0)
      .map(r => ({ name: "価格調整（追加料金）", sales: Number(r.price_adjust) })),
    [reservations]
  );
  const priceAdjustDiscountTotal = useMemo(() =>
    priceAdjustDiscountList.reduce((sum, item) => sum + item.sales, 0), [priceAdjustDiscountList]);
  const priceAdjustAddTotal = useMemo(() =>
    priceAdjustAddList.reduce((sum, item) => sum + item.sales, 0), [priceAdjustAddList]);

  // --- サマリーカード ---
  const summaryCards = [
    { label: "コース売上合計", icon: <BarChartIcon sx={{ fontSize: 26, color: accent }} />, color: accent, value: courseTotal },
    { label: "指名料合計", icon: <PersonPinIcon sx={{ fontSize: 26, color: magenta }} />, color: magenta, value: shimeiTotal },
    { label: "OP売上合計", icon: <LocalOfferIcon sx={{ fontSize: 26, color: orange }} />, color: orange, value: opTotal },
    { label: "割引合計", icon: <PercentIcon sx={{ fontSize: 26, color: green }} />, color: green, value: discountTotal },
    { label: "調整額（値引き）合計", icon: <PercentIcon sx={{ fontSize: 26, color: "#666" }} />, color: "#666", value: priceAdjustDiscountTotal },
    { label: "追加料金合計", icon: <AddIcon sx={{ fontSize: 26, color: pink }} />, color: pink, value: priceAdjustAddTotal }
  ];

  // --- タブ内容（useMemoで安全に管理）---
  const tabContent = useMemo(() => [
    {
      label: "コース",
      color: accent,
      list: courseList,
      valueLabel: "売上",
    },
    {
      label: "指名",
      color: magenta,
      list: shimeiList,
      valueLabel: "売上",
    },
    {
      label: "OP",
      color: orange,
      list: opList,
      valueLabel: "売上",
    },
    {
      label: "割引",
      color: green,
      list: discountList,
      valueLabel: "割引額",
    },
    {
      label: "調整額",
      color: "#666",
      list: [...priceAdjustDiscountList, ...priceAdjustAddList],
      valueLabel: "金額",
    },
  ], [
    courseList,
    shimeiList,
    opList,
    discountList,
    priceAdjustDiscountList,
    priceAdjustAddList,
  ]);

  // --- 月表記 ---
  const monthLabel = useMemo(() => {
    if (!selectedMonth) return "--";
    const parts = selectedMonth.split("-");
    if (parts.length !== 2) return selectedMonth;
    return `${parts[0]}年${parts[1]}月`;
  }, [selectedMonth]);

  return (
    <Paper sx={{
      p: { xs: 2, md: 4 },
      borderRadius: 4,
      bgcolor: "#fcfcfe",
      boxShadow: "0 6px 28px #6366f111"
    }}>
      <Typography variant="h6" fontWeight={900} sx={{ color: accent, mb: 3 }}>
        コース・指名・OP・割引・調整額・追加料金 集計（{monthLabel}）
      </Typography>

      {/* サマリーカード */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap" justifyContent="center">
        {summaryCards.map(card => (
          <Card
            key={card.label}
            sx={{
              width: 180, minHeight: 70, mx: 1, my: 1,
              px: 2, py: 1.3, display: "flex", alignItems: "center", gap: 1.4,
              borderLeft: `5px solid ${card.color}`,
              boxShadow: "0 2px 10px #6366f115",
              bgcolor: "#fff", borderRadius: 2,
            }}
          >
            <Box>{card.icon}</Box>
            <Box>
              <Typography fontSize={13} color={card.color} fontWeight={800}>
                {card.label}
              </Typography>
              <Typography fontSize={20} fontWeight={900} sx={{ color: "#2a2a2a", letterSpacing: 1 }}>
                {Number(card.value).toLocaleString()} 円
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
            ".MuiTab-root": { fontWeight: 800, fontSize: 15, px: 3 },
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
          <Table size="small" sx={{ minWidth: 220 }}>
            <TableBody>
              {tabContent[tab].list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ color: "#aaa" }}>データなし</TableCell>
                </TableRow>
              ) : (
                tabContent[tab].list.map((item, idx) => (
                  <TableRow key={`${item.name}-${item.sales}-${idx}`}>
                    <TableCell sx={{ fontWeight: 500 }}>{item.name}</TableCell>
                    <TableCell align="right">
                      {item.sales.toLocaleString()} 円
                                </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Paper>
  );
}
