import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  Divider, Table, TableHead, TableBody, TableRow, TableCell, Card
} from "@mui/material";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { AttachMoney, Star, EventAvailable, TrendingUp } from "@mui/icons-material";

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
  // 表示する値が0なら描画しない
  if (percent === 0) return null;
  const RADIAN = Math.PI / 180;
  // 円グラフ外に少しラベルを出す（cx, cyは中心）
  const radius = innerRadius + (outerRadius - innerRadius) * 0.75;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#222" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontWeight={700} fontSize={16}>
      {Math.round(percent * 100)}%
    </text>
  );
};

// --- カスタム凡例関数（%表示付き） ---
function renderCustomLegend({ payload, data }) {
  // payloadのvalueがundefinedの場合、dataから該当typeの値を引く
  const total = data.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  return (
    <ul style={{ display: "flex", gap: 16, listStyle: "none", margin: 0, padding: 0 }}>
      {payload.map((entry, idx) => {
        // entry.valueがundefinedの場合はdataから取得
        const value = typeof entry.value === "number"
          ? entry.value
          : (data.find(d => d.type === entry.payload.type)?.value ?? 0);
        const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
        return (
          <li key={idx} style={{ display: "flex", alignItems: "center", fontWeight: 700 }}>
            <span style={{
              width: 14, height: 14, display: "inline-block",
              background: entry.color, marginRight: 6, borderRadius: 3
            }} />
            <span style={{ color: entry.color, marginRight: 4 }}>{entry.payload.type}</span>
            <span style={{ color: "#696969", marginLeft: 0 }}>{percent}%</span>
          </li>
        );
      })}
    </ul>
  );
}

// 色テーマ
const THEME = {
  orders:   { bg: "#e0f7fa", accent: "#03bcea", icon: <AttachMoney sx={{ color: "#03bcea", fontSize: 32, mr: 1 }} /> },
  bounce:   { bg: "#e0fbe0", accent: "#17b86c", icon: <Star sx={{ color: "#17b86c", fontSize: 32, mr: 1 }} /> },
  users:    { bg: "#fffde0", accent: "#f7a823", icon: <EventAvailable sx={{ color: "#f7a823", fontSize: 32, mr: 1 }} /> },
  visitors: { bg: "#fee2e2", accent: "#e4544c", icon: <TrendingUp sx={{ color: "#e4544c", fontSize: 32, mr: 1 }} /> },
};

// 円グラフ色
const COLORS = ["#06b6d4", "#22c55e", "#fbbf24", "#ef4444", "#8884d8", "#6ee7b7", "#f472b6", "#fca5a5", "#64748b", "#f87171"];

export default function KpiDetailDialog({
  open,
  type,
  onClose,
  todayShifts = [],
  salesByType = {},
  salesByCast = [],
  shimeiPie = [],
  shimeiPieByCast = [],
  shiftTable = [],
  monthWorkByCast = {},
  absentRateByCast = {},
  workRateByCast = []
}) {
  // 色やアイコンの自動割り当て
  const t = THEME[type] || { bg: "#f4f4f5", accent: "#888", icon: null };
  let title = "";
  let body = null;

  if (type === "orders") {
    title = "売上の詳細";
    body = (
      <Box>
        <Card sx={{ bgcolor: t.bg, mb: 2, p: 2, boxShadow: "0 2px 10px #03bcea22" }}>
          <Box display="flex" alignItems="center" mb={1}>
            {t.icon}
            <Typography fontWeight={900} fontSize={18}>本日の売上内訳</Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap" mb={1.5}>
            <Typography sx={{ flex: 1, color: "#039be5", fontWeight: 700 }}>
              現金売上：<span style={{ fontWeight: 900 }}>¥{salesByType.cash?.toLocaleString() ?? 0}</span>
            </Typography>
            <Typography sx={{ flex: 1, color: "#6366f1", fontWeight: 700 }}>
              カード売上：<span style={{ fontWeight: 900 }}>¥{salesByType.card?.toLocaleString() ?? 0}</span>
            </Typography>
            <Typography sx={{ flex: 1, color: "#22c55e", fontWeight: 700 }}>
              PayPay売上：<span style={{ fontWeight: 900 }}>¥{salesByType.paypay?.toLocaleString() ?? 0}</span>
            </Typography>
          </Box>
          <Typography mt={1} fontWeight={900} fontSize={20} color={t.accent}>
            総売上：¥{salesByType.total?.toLocaleString() ?? 0}
          </Typography>
        </Card>
        <Divider sx={{ my: 2 }} />
        <Card sx={{ bgcolor: "#fff", p: 2, boxShadow: "0 1px 8px #03bcea18" }}>
          <Typography fontWeight={900} mb={1}>キャスト別売上</Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f0fbff" }}>
                <TableCell>キャスト名</TableCell>
                <TableCell align="right">現金</TableCell>
                <TableCell align="right">カード</TableCell>
                <TableCell align="right">PayPay</TableCell>
                <TableCell align="right">合計</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salesByCast.map(cast => (
                <TableRow key={cast.id}>
                  <TableCell>{cast.name}</TableCell>
                  <TableCell align="right">¥{cast.cash?.toLocaleString() ?? 0}</TableCell>
                  <TableCell align="right">¥{cast.card?.toLocaleString() ?? 0}</TableCell>
                  <TableCell align="right">¥{cast.paypay?.toLocaleString() ?? 0}</TableCell>
                  <TableCell align="right"><b>¥{cast.total?.toLocaleString() ?? 0}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Box>
    );
  } else if (type === "bounce") {
    title = "指名率の詳細";
    body = (
      <Box>
        <Card sx={{ bgcolor: t.bg, p: 2, mb: 2, boxShadow: "0 2px 10px #22c55e22" }}>
          <Box display="flex" alignItems="center" mb={1}>
            {t.icon}
            <Typography fontWeight={900} fontSize={18}>全体指名種別割合</Typography>
          </Box>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={shimeiPie}
                dataKey="value"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={70}
                labelLine={false}
                label={renderCustomLabel}
                fill="#8884d8"
              >
                {shimeiPie.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Legend content={(props) => renderCustomLegend({ ...props, data: shimeiPie })} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Divider sx={{ my: 2 }} />
        <Typography fontWeight={900} mb={1}>キャスト別指名種別割合</Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {shimeiPieByCast.map(cast => (
            <Card key={cast.id} sx={{ width: 180, mb: 2, p: 1, bgcolor: "#fff" }}>
              <Typography fontSize={13} fontWeight={700}>{cast.name}</Typography>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={cast.pie} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={48} labelLine={false} label={renderCustomLabel}>
                    {cast.pie.map((entry, idx) => (
                      <Cell key={`cell-${cast.id}-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Card>
          ))}
        </Box>
      </Box>
    );
  } else if (type === "users") {
    title = "出勤情報の詳細";
    body = (
      <Card sx={{ bgcolor: t.bg, p: 2, boxShadow: "0 2px 10px #f7a82322" }}>
        <Box display="flex" alignItems="center" mb={1}>
          {t.icon}
          <Typography fontWeight={900} fontSize={18}>本日のシフト一覧</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fffbe5" }}>
              <TableCell>キャスト名</TableCell>
              <TableCell>出勤時刻</TableCell>
              <TableCell>退勤時刻</TableCell>
              <TableCell>当月稼働時間</TableCell>
              <TableCell>当日欠勤率</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shiftTable.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.start_time}</TableCell>
                <TableCell>{s.end_time}</TableCell>
                <TableCell>{monthWorkByCast[s.id] ? monthWorkByCast[s.id].toFixed(1) : "--"}</TableCell>
                <TableCell>{absentRateByCast[s.id] ?? "0"}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  } else if (type === "visitors") {
    title = "稼働率の詳細";
    body = (
      <Card sx={{ bgcolor: t.bg, p: 2, boxShadow: "0 2px 10px #e4544c22" }}>
        <Box display="flex" alignItems="center" mb={1}>
          {t.icon}
          <Typography fontWeight={900} fontSize={18}>キャスト別稼働率（当日）</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#ffeaea" }}>
              <TableCell>キャスト名</TableCell>
              <TableCell align="right">稼働率（％）</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workRateByCast.map(cast => (
              <TableRow key={cast.id}>
                <TableCell>{cast.name}</TableCell>
                <TableCell align="right">{cast.rate?.toFixed(1) ?? "--"}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  } else {
    title = "詳細情報";
    body = <Typography>詳細データなし</Typography>;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { bgcolor: "#f9fbfd", borderRadius: 3, boxShadow: "0 6px 36px #0002" } }}
    >
      <DialogTitle sx={{ fontWeight: 900, letterSpacing: 1.2, fontSize: 22 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>{body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{
          bgcolor: t.accent, color: "#fff", fontWeight: 700,
          "&:hover": { bgcolor: "#6366f1" }
        }}>
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
}
