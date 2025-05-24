import React, { useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Box, Paper, Typography, Stack, Button, Table, TableBody, TableCell, TableHead, TableRow, Divider, Chip
} from "@mui/material";
import {
  Dashboard, Analytics, Chat
} from "@mui/icons-material";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from "recharts";

// ---- データ例 ----
const salesData = [
  { date: '5/1', sales: 18000 },
  { date: '5/2', sales: 21000 },
  { date: '5/3', sales: 19500 },
  { date: '5/4', sales: 24000 },
  { date: '5/5', sales: 22500 },
  { date: '5/6', sales: 19800 },
  { date: '5/7', sales: 23000 },
];

const tabelog = {
  shopName: "REON居酒屋（仮）",
  averageScore: 3.5,
  reviewCount: 98,
  ranking: "地域5位",
  rivals: [
    { name: "NEO居酒屋", score: 3.8, rank: "地域2位" },
    { name: "大衆バルKAZE", score: 3.7, rank: "地域4位" },
    { name: "寿司本舗", score: 3.4, rank: "地域7位" }
  ]
};

// ---- レイアウト保存/取得 ----
function saveLayout(l) {
  localStorage.setItem("reon-layout-dashboard", JSON.stringify(l));
}
function getLayout(fallback) {
  try {
    return JSON.parse(localStorage.getItem("reon-layout-dashboard")) || fallback;
  } catch {
    return fallback;
  }
}

// ---- レイアウト初期値 ----
const layoutDefault = [
  { i: "aiSummary", x: 0, y: 0, w: 6, h: 1, minW: 3, maxW: 12 },
  { i: "aiAlert", x: 6, y: 0, w: 6, h: 1, minW: 3, maxW: 12 },
  { i: "aiActions", x: 0, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "aiChat", x: 3, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "tabelog", x: 6, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "competitorTrends", x: 9, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "aiForecast", x: 9, y: 3, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "graph", x: 0, y: 3, w: 6, h: 2, minW: 4, minH: 2 },
  { i: "table", x: 6, y: 3, w: 6, h: 3, minW: 4, minH: 2 },
];

export default function DashboardPage() {
  const [layout, setLayout] = useState(getLayout(layoutDefault));

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      <GridLayout
        className="layout"
        layout={layout}
        cols={16}
        rowHeight={95}
        width={1650}
        isDraggable
        isResizable
        draggableHandle=".panel-header"
        onLayoutChange={l => {
          setLayout(l);
          saveLayout(l);
        }}
        style={{ background: "#eaf6fd" }}
      >
        {/* --- 各パネル --- */}
        {/* 1. AIサマリー */}
        <div key="aiSummary">
          <Paper elevation={2} sx={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", px: 3, bgcolor: "#fffbe6"
          }}>
            <div className="panel-header" style={{ fontWeight: "bold", cursor: "move", color: "#ffaa00" }}>
              <Dashboard sx={{ mr: 1, color: "#ffaa00" }} />AIサマリー
            </div>
            <Typography sx={{ ml: 2 }}>
              今日は平日比+13%と好調！クチコミも新規獲得2件。SNS経由の流入が増加傾向です。
            </Typography>
          </Paper>
        </div>
        {/* 2. AI異常検知 */}
        <div key="aiAlert">
          <Paper elevation={2} sx={{
            width: "100%", height: "100%", display: "flex", alignItems: "center", px: 3, bgcolor: "#fff5cc"
          }}>
            <div className="panel-header" style={{ fontWeight: "bold", cursor: "move", color: "#ee9900" }}>
              <Analytics sx={{ mr: 1, color: "#ee9900" }} />AI異常検知
            </div>
            <Typography sx={{ ml: 2 }}>
              売上が17時台に一時急減しています。競合店のキャンペーンに注意！
            </Typography>
          </Paper>
        </div>
        {/* 3. AI推奨アクション */}
        <div key="aiActions">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#e3f8fd" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 10, cursor: "move", color: "#19A7C8" }}>
              <Analytics sx={{ fontSize: 20, mr: 1 }} />AI推奨アクション
            </div>
            <Stack spacing={2}>
              <Button variant="contained" color="info" sx={{ textAlign: "left" }}>SNSで本日のオススメ料理を投稿しましょう</Button>
              <Button variant="contained" color="info" sx={{ textAlign: "left" }}>明日の仕込みを前倒しで実施</Button>
              <Button variant="contained" color="info" sx={{ textAlign: "left" }}>クチコミ返信を今夜中に2件行うと良いです</Button>
            </Stack>
          </Paper>
        </div>
        {/* 4. AI質問ボックス */}
        <div key="aiChat">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#e3f8fd" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 8, cursor: "move", color: "#19A7C8" }}>
              <Chat sx={{ fontSize: 20, mr: 1 }} />AI質問ボックス
              <Button variant="contained" color="info" size="small" sx={{ ml: 2 }}>今週は何が売上アップ要因？</Button>
            </div>
            <Box sx={{ mb: 1, fontSize: 14 }}>
              SNSで新メニュー告知を実施したことと、リピーターの来店増が大きな要因です。
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", bgcolor: "#fff", borderRadius: 2, px: 1, py: 0.5 }}>
              <input
                style={{
                  border: "none", outline: "none", fontSize: 15, background: "transparent", width: "100%"
                }}
                placeholder="AIに質問する（例：今日の売上を上げるには？）"
              />
              <Button variant="contained" sx={{ ml: 1, minWidth: 40, px: 1 }}>&#9654;</Button>
            </Box>
          </Paper>
        </div>
        {/* 5. 食べログ主要指標＋競合 */}
        <div key="tabelog">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#f6fdff" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 8, cursor: "move", color: "#19A7C8" }}>
              食べログ主要指標
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>店舗名: {tabelog.shopName}</li>
              <li>平均スコア: {tabelog.averageScore} / 5</li>
              <li>口コミ数: {tabelog.reviewCount}件</li>
              <li>ランキング: {tabelog.ranking}</li>
            </ul>
            <Divider sx={{ my: 1 }} />
            <Typography fontWeight="bold" fontSize={13}>【競合比較】</Typography>
            {tabelog.rivals.map((r, i) =>
              <Chip key={r.name} label={`${r.name}（平均: ${r.score} / ランク: ${r.rank}）`} size="small"
                sx={{ m: 0.5, bgcolor: "#e0f3ff" }} />
            )}
          </Paper>
        </div>
        {/* 6. 競合店の最新動向 */}
        <div key="competitorTrends">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#fff" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 6, cursor: "move", color: "#199eb8" }}>
              <Analytics sx={{ fontSize: 20, mr: 1 }} />競合店の最新動向
            </div>
            <Typography>
              <b>居酒屋NEO：</b> 新メニュー開始 <Chip size="small" label="点数+0.1pt" sx={{ ml: 1, fontSize: 12 }} /> <span style={{ fontSize: 12, color: "#888" }}>5/22</span><br />
              <b>大衆バルKAZE：</b> 割引キャンペーン開始
              <Box sx={{ mt: 1 }}>
                <Chip label="口コミ急増" color="info" size="small" sx={{ mr: 1 }} />
                <span style={{ fontSize: 12, color: "#888" }}>5/21</span>
              </Box>
            </Typography>
          </Paper>
        </div>
        {/* 7. AI未来予測／来店数予測 */}
        <div key="aiForecast">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#fffbe6" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 6, cursor: "move", color: "#ffb800" }}>
              <Analytics sx={{ fontSize: 20, mr: 1 }} />AI未来予測／来店数予測
            </div>
            <Typography sx={{ fontSize: 15 }}>
              <b>今週(6/20～6/26)の来店予測：</b><br />
              週末（土・日）で来店が15%増加とAIが予測しています。<br />
              天候も晴れ傾向なため集客チャンス！<br /><br />
              <b>売上予測：</b> 22.6万円／日（先週比+8%）
            </Typography>
          </Paper>
        </div>
        {/* 8. 売上推移グラフ */}
        <div key="graph">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#fff" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 6, cursor: "move", color: "#19A7C8" }}>
              売上推移グラフ
              <Chip label="AI分析" color="info" size="small" sx={{ ml: 1 }} />
            </div>
            <Box sx={{ width: "100%", height: "calc(100% - 28px)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="sales" stroke="#19A7C8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </div>
        {/* 9. 売上データテーブル */}
        <div key="table">
          <Paper elevation={3} sx={{ height: "100%", p: 2, bgcolor: "#fff" }}>
            <div className="panel-header" style={{ fontWeight: "bold", marginBottom: 10, cursor: "move", color: "#19A7C8" }}>
              売上データ
            </div>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>日付</TableCell>
                  <TableCell>売上</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesData.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.sales}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </div>
      </GridLayout>
    </Box>
  );
}
