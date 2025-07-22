import React, { useState, useMemo, useEffect } from "react";
import {
  Paper, Typography, Box, TextField, Button, Card, Divider, Chip, MenuItem, Table, TableBody, TableCell, TableRow
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import GroupsIcon from "@mui/icons-material/Groups";
import CancelIcon from "@mui/icons-material/Cancel";
import PercentIcon from "@mui/icons-material/Percent";
import { format } from "date-fns";

const accent = "#6366f1";
const cyan = "#06b6d4";
const magenta = "#e879f9";
const orange = "#ffbc42";
const green = "#16db65";

export default function DailyDetailPanel({ dailyReports = [], reservations = [], castList = [] }) {
  // 日付リスト生成（report_date推奨、なければdate, created_at対応）
  const allDates = dailyReports
    .map(r => r.report_date || r.date || (r.created_at && r.created_at.slice(0, 10)) || "")
    .filter(Boolean)
    .sort();

  // 本日日付（YYYY-MM-DD）
  const today = format(new Date(), "yyyy-MM-dd");

  // **ここを関数化**
  const getDefaultDate = () =>
    allDates.includes(today)
      ? today
      : (allDates.length > 0 ? allDates[allDates.length - 1] : "");

  // useStateは初期値""で
  const [selectedDate, setSelectedDate] = useState("");

  // **ここがポイント！**
  useEffect(() => {
    if (!selectedDate && allDates.length > 0) {
      setSelectedDate(getDefaultDate());
    }
    // eslint-disable-next-line
  }, [allDates, selectedDate]);

  // 日付リストは再定義（dailyReports依存）
  const dateList = useMemo(() => allDates, [dailyReports]);

  // 指定日のdailyReport（詳細）
  const detail = dailyReports.find(r =>
    (r.report_date || r.date || (r.created_at && r.created_at.slice(0, 10))) === selectedDate
  );

  // ...この下はあなたの元コードそのままでOK！

  // ID→名前変換
  const getCastName = (cast_id) => {
    const found = castList.find(c => String(c.id) === String(cast_id));
    return found ? found.name : `ID:${cast_id}`;
  };

  // --- 給料詳細 ---
  let castSalaryList = [];
  if (detail && detail.cast_salary) {
    try {
      const salaryObj = typeof detail.cast_salary === "string"
        ? JSON.parse(detail.cast_salary)
        : detail.cast_salary;
      if (Array.isArray(salaryObj)) {
        castSalaryList = salaryObj;
      } else if (typeof salaryObj === "object") {
        castSalaryList = Object.entries(salaryObj).map(([name, salary]) => ({ name, salary }));
      }
    } catch {}
  }
  const cashBalance = detail?.cash_balance ?? null;

  // その日の予約データ
  const todayReservations = useMemo(
    () => reservations.filter(r => r.datetime && r.datetime.slice(0, 10) === selectedDate),
    [reservations, selectedDate]
  );

  // --- 各集計 ---
  const courseSummary = {};
  const shimeiSummary = {};
  const opSummary = {};
  const waribikiSummary = {};

  todayReservations.forEach(r => {
    const course = r.course || "未設定";
    courseSummary[course] = (courseSummary[course] || 0) + 1;
    const shimei = r.shimei_type || r.shimei || "無し";
    shimeiSummary[shimei] = (shimeiSummary[shimei] || 0) + 1;
    let opArr = [];
    try {
      if (typeof r.op === "string" && r.op.startsWith("[")) {
        opArr = JSON.parse(r.op);
      }
      if (Array.isArray(opArr) && opArr.length === 0) {
        opArr = ["なし"];
      }
    } catch {
      opArr = ["不明"];
    }
    opArr.forEach(op => {
      opSummary[op] = (opSummary[op] || 0) + 1;
    });
    const waribiki = r.discount || r.waribiki || "無し";
    if (waribiki) waribikiSummary[waribiki] = (waribikiSummary[waribiki] || 0) + 1;
  });

  const visitors = detail?.visitors ?? "";
  const unitPrice = detail && detail.visitors ? Math.round((detail.value || 0) / detail.visitors) : 0;
  const cancelRate = detail?.cancel_rate ?? "";

  // 前日・翌日
  const moveDay = diff => {
    if (!selectedDate) return;
    const idx = dateList.indexOf(selectedDate);
    if (idx === -1) return;
    const newIdx = idx + diff;
    if (newIdx >= 0 && newIdx < dateList.length) {
      setSelectedDate(dateList[newIdx]);
    }
  };

  // 売上カード
  const salesCards = [
    {
      label: "売上合計",
      value: detail?.value ?? 0,
      icon: <FavoriteIcon sx={{ color: green, fontSize: 32 }} />,
      color: green,
      big: true
    },
    {
      label: "現金売上",
      value: detail?.cash ?? 0,
      icon: <MonetizationOnIcon sx={{ color: cyan, fontSize: 32 }} />,
      color: cyan
    },
    {
      label: "カード売上",
      value: detail?.card ?? 0,
      icon: <CreditCardIcon sx={{ color: orange, fontSize: 32 }} />,
      color: orange
    },
    {
      label: "PayPay売上",
      value: detail?.paypay ?? 0,
      icon: <LocalOfferIcon sx={{ color: magenta, fontSize: 32 }} />,
      color: magenta
    }
  ];

  return (
    <Paper sx={{
      p: { xs: 2, md: 4 },
      borderRadius: 4,
      minHeight: 370,
      background: "rgba(255,255,255,0.99)",
      boxShadow: "0 6px 30px #6366f114"
    }}>
      {/* 日付選択とナビ */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <TextField
          select
          label="日付を選択"
          value={selectedDate || ""}
          onChange={e => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
          sx={{ minWidth: 180, background: "#f4f7fa", borderRadius: 2 }}
        >
          {dateList.map(date => (
            <MenuItem key={date} value={date}>{date}</MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={() => moveDay(-1)} disabled={!selectedDate || dateList.indexOf(selectedDate) === 0}>前日</Button>
        <Button variant="outlined" onClick={() => moveDay(1)} disabled={!selectedDate || dateList.indexOf(selectedDate) === dateList.length - 1}>翌日</Button>
      </Box>

      {/* データ本体 */}
      {detail ? (
        <>
          {/* 売上カード */}
          <Box display="flex" gap={3} flexWrap="wrap" mb={2}>
            {salesCards.map(card => (
              <Card
                key={card.label}
                sx={{
                  flex: card.big ? "1.2" : "1",
                  minWidth: card.big ? 220 : 180,
                  minHeight: 96,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  px: 3,
                  py: 2,
                  boxShadow: "0 3px 18px #06b6d433",
                  borderLeft: `5px solid ${card.color}`,
                  bgcolor: "#f9fafb",
                  borderRadius: 2,
                  fontWeight: card.big ? 900 : 700,
                }}
              >
                <Box>{card.icon}</Box>
                <Box>
                  <Typography fontSize={15} color={card.color} fontWeight={800}>
                    {card.label}
                  </Typography>
                  <Typography fontSize={card.big ? 26 : 21} fontWeight={900} sx={{ color: "#2a2a2a", letterSpacing: 1 }}>
                    {Number(card.value).toLocaleString()}円
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>

          {/* 給料詳細 & 利益 */}
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={3} alignItems="flex-start" mb={1}>
            {/* 左：給料詳細テーブル */}
            <Box sx={{ flex: 2 }}>
              <Typography fontWeight={700} color={cyan} mb={1}>給料詳細</Typography>
              <Table size="small" sx={{ mb: 1, maxWidth: 450 }}>
                <TableBody>
                  {castSalaryList.length ? castSalaryList.map((item, idx) => (
                    <TableRow key={item.name || item.cast_id || idx}>
                      <TableCell>
                        {item.name || (item.cast_id ? getCastName(item.cast_id) : "-")}
                      </TableCell>
                      <TableCell align="right">
                        {Number(item.salary || item.total || 0).toLocaleString()}円
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: "#aaa" }}>データなし</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
            {/* 右：利益を大きく表示 */}
            <Box sx={{
              flex: 1,
              ml: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: 20,
                  color: green,
                  mb: 1
                }}
              >
                利益
              </Typography>
              <Box sx={{
                fontWeight: 900,
                fontSize: 36,
                color: green,
                bgcolor: "#e0fbe5",
                px: 3,
                py: 2,
                borderRadius: 3,
                boxShadow: "0 3px 20px #16db6522",
                minWidth: 120,
                textAlign: "center"
              }}>
                {cashBalance !== null ? Number(cashBalance).toLocaleString() + "円" : "—"}
              </Box>
            </Box>
          </Box>
          {/* コース・指名・OP・割引 詳細 */}
          <Divider sx={{ my: 2 }} />
          <Box display="flex" gap={2} flexWrap="wrap" justifyContent="space-between" mb={1}>
            {/* コース別 */}
            <Box flex={1} minWidth={180}>
              <Typography fontWeight={700} mb={1} color={accent}>コース本数</Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(courseSummary).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell align="right">{v}本</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {/* 指名 */}
            <Box flex={1} minWidth={140}>
              <Typography fontWeight={700} mb={1} color={magenta}>指名種別</Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(shimeiSummary).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell align="right">{v}件</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {/* OP */}
            <Box flex={1} minWidth={140}>
              <Typography fontWeight={700} mb={1} color={orange}>OP利用</Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(opSummary).map(([op, cnt]) => (
                    <TableRow key={op}>
                      <TableCell>{op}</TableCell>
                      <TableCell>{cnt}件</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {/* 割引 */}
            <Box flex={1} minWidth={140}>
              <Typography fontWeight={700} mb={1} color={cyan}>割引利用</Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(waribikiSummary).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell align="right">{v}件</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>

          {/* 下部の指標 */}
          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-around" alignItems="center" mt={2} gap={3}>
            <Box textAlign="center" flex={1}>
              <Chip
                onClick={() => {}}
                icon={<GroupsIcon sx={{ color: cyan }} />}
                label={
                  <span>
                    <span style={{ fontWeight: 900, fontSize: 22, color: cyan }}>{visitors || 0}</span>
                    <span style={{ fontWeight: 600, fontSize: 16, marginLeft: 4, color: "#666" }}>組</span>
                  </span>
                }
                sx={{
                  bgcolor: "#e0f2fe", color: cyan, px: 2, py: 1.2, fontWeight: 800, fontSize: 20,
                  borderRadius: "1.7em"
                }}
              />
              <Typography fontWeight={700} fontSize={15} color={cyan} mt={0.8}>来店組数</Typography>
            </Box>
            <Box textAlign="center" flex={1}>
              <Chip
                onClick={() => {}}
                icon={<MonetizationOnIcon sx={{ color: magenta }} />}
                label={
                  <span>
                    <span style={{ fontWeight: 900, fontSize: 22, color: magenta }}>{unitPrice?.toLocaleString() || 0}</span>
                    <span style={{ fontWeight: 600, fontSize: 16, marginLeft: 4, color: "#666" }}>円</span>
                  </span>
                }
                sx={{
                  bgcolor: "#f3e8ff", color: magenta, px: 2, py: 1.2, fontWeight: 800, fontSize: 20,
                  borderRadius: "1.7em"
                }}
              />
              <Typography fontWeight={700} fontSize={15} color={magenta} mt={0.8}>客単価</Typography>
            </Box>
            <Box textAlign="center" flex={1}>
              <Chip
                onClick={() => {}}
                icon={<CancelIcon sx={{ color: "#ff4444" }} />}
                label={
                  <span>
                    <span style={{ fontWeight: 900, fontSize: 22, color: "#ff4444" }}>{cancelRate || 0}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, marginLeft: 4, color: "#444" }}>%</span>
                  </span>
                }
                sx={{
                  bgcolor: "#ffe4e1", color: "#ff4444", px: 2, py: 1.2, fontWeight: 800, fontSize: 20,
                  borderRadius: "1.7em"
                }}
              />
              <Typography fontWeight={700} fontSize={15} color="#ff4444" mt={0.8}>キャンセル率</Typography>
            </Box>
          </Box>
        </>
      ) : (
        <Typography sx={{ mt: 6, fontSize: 22, textAlign: "center", color: "#bbb" }}>
          データなし
        </Typography>
      )}
    </Paper>
  );
}
