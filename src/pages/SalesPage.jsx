import React, { useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Box, Paper, Typography, Card, CardContent, LinearProgress, Button, Tabs, Tab, Divider
} from "@mui/material";
import {
  Search, ArrowUpward, ArrowDownward, Timeline
} from "@mui/icons-material";

// --- 仮データ ---
const summary = { total: 2120000, visitors: 340, unitPrice: 6235, goalRate: 95, goal: 2200000 };
const dailySummary = { total: 168000, cash: 98000, card: 70000, visitors: 41 };
const ranking = Array.from({ length: 20 }).map((_, i) => ({
  rank: i + 1,
  menu: ["生ビール", "ハンバーグ", "焼き鳥盛り", "ポテトフライ", "枝豆", "サラダ", "寿司盛り", "ジントニック", "日本酒", "グラスワイン", "ウーロン茶"][i % 11],
  category: i % 3 === 0 ? "ドリンク" : "フード",
  sales: 1700000 - i * 34000,
  count: 1300 - i * 34,
  up: Math.random() > 0.5
}));
const categoryColor = { "ドリンク": "#5ad2f6", "フード": "#a3d977", "デザート": "#c7b6ff" };
const rankColor = [ "#3b82f6", "#16db65", "#ffbc42" ];
const categoryStructure = [
  { name: "ドリンク", value: 1080000, fill: "#5ad2f6" },
  { name: "フード", value: 820000, fill: "#a3d977" },
  { name: "デザート", value: 220000, fill: "#c7b6ff" }
];

// --- レイアウト ---
const layoutDefault = [
  { i: "summary", x: 0, y: 0, w: 16, h: 3, static: true },
  { i: "advice", x: 0, y: 3, w: 8, h: 1 },
  { i: "compare", x: 8, y: 3, w: 8, h: 1 },
  { i: "tabs", x: 0, y: 4, w: 16, h: 10 },
];

const STORAGE_KEY = "reon-dashboard-layout-v4";
function saveLayoutToStorage(layout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}
function getLayoutFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : layoutDefault;
  } catch {
    return layoutDefault;
  }
}

// --- 日別サマリーカード ---
function DailySummaryCards({ total, cash, card, visitors }) {
  const items = [
    { label: "総売上", value: `${total.toLocaleString()}円`, color: "#4339f2", bg: "#f4f8ff" },
    { label: "現金売上", value: `${cash.toLocaleString()}円`, color: "#16db65", bg: "#eafff2" },
    { label: "カード売上", value: `${card.toLocaleString()}円`, color: "#ffbc42", bg: "#fffbe0" },
    { label: "来店人数", value: `${visitors}人`, color: "#7b40f6", bg: "#f5f0ff" }
  ];
  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        gap: 3,
        mt: 0,
        mb: 3,
        px: 0,
        '@media (max-width: 1000px)': { flexWrap: "wrap", gap: 2 }
      }}
    >
      {items.map((item) => (
        <Paper
          key={item.label}
          sx={{
            flex: 1,
            minWidth: 160,
            maxWidth: 250,
            p: 3,
            bgcolor: item.bg,
            borderRadius: 4,
            boxShadow: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: item.color, fontWeight: "bold", fontSize: 18, mb: 0.5 }}>
            {item.label}
          </Typography>
          <Typography sx={{ fontSize: 28, fontWeight: "bold", color: "#222" }}>
            {item.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

// --- パネル類 ---
function DailyDetail() {
  // 仮日報データ
  const [selectedDate, setSelectedDate] = useState("2024-05-21");
  const fakeData = {
    date: selectedDate,
    sales: [
      { menu: "生ビール", count: 120, price: 550, total: 66000 },
      { menu: "ハイボール", count: 15, price: 900, total: 13500 },
      { menu: "焼き鳥盛り", count: 24, price: 680, total: 16320 },
      { menu: "サラダ", count: 19, price: 500, total: 9500 }
    ],
    expenses: [
      { name: "食材費", amount: 20000 },
      { name: "備品", amount: 3800 }
    ],
    pay: [
      { name: "山田花子", amount: 12000 },
      { name: "田中太郎", amount: 9500 }
    ],
    memo: "イベントデー。雨で客足やや少なめ。"
  };
  const totalSales = fakeData.sales.reduce((a, b) => a + b.total, 0);
  const totalExpenses = fakeData.expenses.reduce((a, b) => a + b.amount, 0);
  const totalPay = fakeData.pay.reduce((a, b) => a + b.amount, 0);
  const [calOpen, setCalOpen] = useState(false);

  return (
    <Box sx={{
      width: "100%", minHeight: 480, bgcolor: "transparent",
      display: "flex", flexDirection: "column", gap: 3, p: 0,
    }}>
      {/* 日付＆ナビゲーション */}
      <Box sx={{
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, mb: 1,
      }}>
        <Button size="small" variant="text" sx={{ minWidth: 36, color: "#666" }}>前日</Button>
        <Button
          size="small"
          sx={{
            bgcolor: "#4339f2", color: "#fff", borderRadius: 2, fontWeight: "bold", px: 2, boxShadow: 1, "&:hover": { bgcolor: "#3127bb" }
          }}
          onClick={() => setCalOpen(v => !v)}
        >
          {selectedDate}
        </Button>
        <Button size="small" variant="text" sx={{ minWidth: 36, color: "#666" }}>翌日</Button>
      </Box>
      {calOpen && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setCalOpen(false); }}
            style={{
              fontSize: 18, padding: "8px 18px", border: "1.5px solid #4339f2", borderRadius: 6
            }}
          />
        </Box>
      )}

      {/* --- サマリーカード挿入 --- */}
      <DailySummaryCards {...dailySummary} />

      {/* ↓この下にいつもの詳細 */}
      <Box sx={{
        bgcolor: "rgba(248,250,255,0.95)",
        borderRadius: 6, boxShadow: 4, p: 4, mb: 1,
        width: "100%", minHeight: 200, display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}>
        <Typography sx={{
          fontWeight: "bold", fontSize: 22, color: "#4339f2", letterSpacing: 1, mb: 2
        }}>
          日別売上詳細
        </Typography>
        <table style={{
          width: "100%", fontSize: 16, borderCollapse: "collapse", marginBottom: 0
        }}>
          <thead>
            <tr style={{ background: "#e3e6ff" }}>
              <th style={{ textAlign: "left", padding: "4px 16px" }}>商品名</th>
              <th style={{ textAlign: "right" }}>数</th>
              <th style={{ textAlign: "right" }}>単価</th>
              <th style={{ textAlign: "right" }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {fakeData.sales.map((row, idx) => (
              <tr key={row.menu} style={{
                background: idx % 2 === 0 ? "#f8fafd" : "#f4f6fc"
              }}>
                <td style={{ padding: "4px 16px", fontWeight: 500 }}>{row.menu}</td>
                <td style={{ textAlign: "right", fontWeight: 500 }}>{row.count}</td>
                <td style={{ textAlign: "right" }}>{row.price.toLocaleString()}円</td>
                <td style={{ textAlign: "right", fontWeight: 700, color: "#4339f2" }}>{row.total.toLocaleString()}円</td>
              </tr>
            ))}
            <tr style={{ background: "#e5e7fa" }}>
              <td colSpan={3} style={{ textAlign: "right", fontWeight: "bold", padding: "6px 16px" }}>売上合計</td>
              <td style={{ textAlign: "right", fontWeight: "bold", color: "#3b82f6", fontSize: 18 }}>{totalSales.toLocaleString()}円</td>
            </tr>
          </tbody>
        </table>
      </Box>

      {/* 下段：3分割カード */}
      <Box sx={{
        display: "flex", gap: 2, mt: 1,
        width: "100%",
      }}>
        {/* 経費詳細 */}
        <Paper sx={{
          flex: 1, p: 3, borderRadius: 6, boxShadow: 2,
          minWidth: 180, minHeight: 110, display: "flex", flexDirection: "column", bgcolor: "#f4fef7"
        }}>
          <Typography sx={{ fontWeight: "bold", color: "#16db65", mb: 1 }}>経費詳細</Typography>
          {fakeData.expenses.map((row, idx) => (
            <Box key={row.name} sx={{ display: "flex", justifyContent: "space-between", fontSize: 15, mb: 0.5 }}>
              <span>{row.name}</span>
              <span style={{ fontWeight: 700 }}>{row.amount.toLocaleString()}円</span>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#16db65" }}>
            <span>合計</span>
            <span>{totalExpenses.toLocaleString()}円</span>
          </Box>
        </Paper>
        {/* 日払い */}
        <Paper sx={{
          flex: 1, p: 3, borderRadius: 6, boxShadow: 2,
          minWidth: 180, minHeight: 110, display: "flex", flexDirection: "column", bgcolor: "#fff4fa"
        }}>
          <Typography sx={{ fontWeight: "bold", color: "#ff89bb", mb: 1 }}>日払い</Typography>
          {fakeData.pay.map((row, idx) => (
            <Box key={row.name} sx={{ display: "flex", justifyContent: "space-between", fontSize: 15, mb: 0.5 }}>
              <span>{row.name}</span>
              <span style={{ fontWeight: 700 }}>{row.amount.toLocaleString()}円</span>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#ff89bb" }}>
            <span>合計</span>
            <span>{totalPay.toLocaleString()}円</span>
          </Box>
        </Paper>
        {/* メモ */}
        <Paper sx={{
          flex: 2, p: 3, borderRadius: 6, boxShadow: 2,
          minWidth: 220, minHeight: 110, bgcolor: "#f6f7fa"
        }}>
          <Typography sx={{ fontWeight: "bold", color: "#7b40f6", mb: 1 }}>メモ</Typography>
          <Typography fontSize={15}>{fakeData.memo}</Typography>
        </Paper>
      </Box>
    </Box>
  );
}

function Ranking() {
  return (
    <Paper sx={{
      p: 2, borderRadius: 4, boxShadow: 4, height: "100%", minHeight: 320, display: "flex", flexDirection: "column", bgcolor: "#f3f8ff"
    }}>
      <Box className="panel-header" sx={{ fontWeight: "bold", color: "#7b40f6", mb: 1, cursor: "move", fontSize: 18 }}>
        月間メニューランキング
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "60vh" }}>
        <table style={{ width: "100%", fontSize: 14, borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: "#e5e4f7" }}>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>順位</th>
              <th style={{ textAlign: "left" }}>メニュー</th>
              <th>カテゴリ</th>
              <th>売上</th>
              <th>注文数</th>
              <th>変動</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, idx) => (
              <tr key={row.menu + row.rank}
                style={{
                  background: idx === 0 ? "#e3f1fd" : idx === 1 ? "#e0ffe8" : idx === 2 ? "#fff7e0" : undefined
                }}>
                <td style={{ color: rankColor[idx] || "#888", fontWeight: "bold", padding: "2px 8px" }}>{row.rank}</td>
                <td>{row.menu}</td>
                <td>
                  <span style={{
                    background: categoryColor[row.category],
                    color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12
                  }}>{row.category}</span>
                </td>
                <td style={{ color: idx < 3 ? rankColor[idx] : "#333" }}>{row.sales.toLocaleString()}</td>
                <td>{row.count}</td>
                <td>
                  <span style={{
                    color: row.up ? "#f39c12" : "#e74c3c", fontWeight: "bold"
                  }}>
                    {row.up ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Paper>
  );
}

function GraphPanel() {
  return (
    <Paper sx={{ p: 2, borderRadius: 4, boxShadow: 4, height: "100%", bgcolor: "#f8f3fd" }}>
      <Box className="panel-header" sx={{ fontWeight: "bold", color: "#ab47bc", mb: 1, cursor: "move", fontSize: 18 }}>
        月間売上構成グラフ
      </Box>
      <Typography color="text.secondary" fontSize={13} align="center">[円グラフ or 棒グラフ]</Typography>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        {categoryStructure.map((c) => (
          <Box key={c.name} sx={{
            mx: 1, px: 2, py: 1, bgcolor: c.fill, color: "#fff", borderRadius: 2, fontWeight: "bold"
          }}>{c.name}：{c.value.toLocaleString()}円</Box>
        ))}
      </Box>
    </Paper>
  );
}

function SearchPanel() {
  return (
    <Paper sx={{ p: 2, borderRadius: 4, boxShadow: 4, height: "100%", bgcolor: "#eefbfb" }}>
      <Box className="panel-header" sx={{ fontWeight: "bold", color: "#2fbfdc", mb: 1, cursor: "move", fontSize: 18 }}>メニュー検索</Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Search color="action" />
        <input placeholder="キーワード" style={{
          flex: 1, border: "none", outline: "none", background: "none", fontSize: 16
        }} />
      </Box>
      <Typography color="text.secondary" fontSize={12} sx={{ mt: 2 }}>
        ※キーワードでメニューやカテゴリを検索できます
      </Typography>
    </Paper>
  );
}

function AdvicePanel() {
  return (
    <Paper sx={{ p: 2, bgcolor: "#f8f5ff", borderRadius: 4, boxShadow: 4, height: "100%" }}>
      <Box className="panel-header" sx={{ fontWeight: "bold", color: "#a96fff", mb: 1, cursor: "move", fontSize: 18 }}>
        AIアドバイス
      </Box>
      <Typography variant="body2" fontSize={15}>
        <b>🍺生ビール</b>が前年比+18%絶好調。22時台の売上はSNS強化が有効。週末は<b>デザート</b>増加傾向。
      </Typography>
    </Paper>
  );
}

function ComparePanel() {
  return (
    <Paper sx={{ p: 2, bgcolor: "#e0e7ff", borderRadius: 4, boxShadow: 4, height: "100%" }}>
      <Box className="panel-header" sx={{ fontWeight: "bold", color: "#388e3c", mb: 1, cursor: "move", fontSize: 18 }}>
        前月/前年比較
      </Box>
      <Typography fontSize={16}>前月比 <b style={{ color: "#388e3c" }}>+8%</b> ／ 前年比 <b style={{ color: "#388e3c" }}>+22%</b></Typography>
    </Paper>
  );
}

// ---- メイン ----
export default function SalesDashboard() {
  const [layout, setLayout] = useState(getLayoutFromStorage());
  const [tab, setTab] = useState(0);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    saveLayoutToStorage(newLayout);
  };
  const handleReset = () => {
    setLayout(layoutDefault);
    saveLayoutToStorage(layoutDefault);
  };

  // タブ順指定
  const tabs = [
    { label: "日別売上詳細", panel: <DailyDetail /> },
    { label: "月間メニューランキング", panel: <Ranking /> },
    { label: "月間売上構成グラフ", panel: <GraphPanel /> },
    { label: "メニュー検索", panel: <SearchPanel /> },
  ];

  return (
    <Box sx={{
      width: "100vw", minHeight: "100vh", p: 0, pt: 0,
      bgcolor: "linear-gradient(135deg,#e0e7ff 0%,#e0f2fe 100%)",
    }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button variant="outlined" onClick={handleReset} size="small" sx={{ fontSize: 12 }}>レイアウトリセット</Button>
      </Box>
      <GridLayout
        className="layout"
        layout={layout}
        cols={16}
        rowHeight={90}
        width={1600}
        isDraggable
        isResizable
        draggableHandle=".panel-header"
        onLayoutChange={handleLayoutChange}
        style={{
          minHeight: 600,
          marginTop: 0, 
          paddingTop: 0,
        }}
      >
        {/* サマリー（月次用・タブ共通ヘッダ） */}
        <div key="summary">
          <Paper
            sx={{
              p: 2,
              mt: 0,
              mb: 0,
              bgcolor: "rgba(245,247,255,0.99)",
              borderRadius: 6,
              boxShadow: 8,
              height: "auto",
              overflow: "visible",
            }}
          >
            <Box sx={{ fontWeight: "bold", fontSize: 28, color: "#4339f2", mb: 2, letterSpacing: 2 }}>
              <Timeline sx={{ mr: 2, color: "#4339f2", fontSize: 38, verticalAlign: "middle" }} />
              月間売上サマリー
            </Box>
            <Box
              sx={{
                width: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                mb: 2,
                alignItems: "stretch",
                '@media (max-width: 1100px)': {
                  gap: 1,
                },
              }}
            >
              {/* 各カード幅制限 */}
              <Card sx={{
                flex: "1 1 200px",
                minWidth: 180,
                maxWidth: 320,
                bgcolor: "#f0f7ff",
                boxShadow: 3,
                borderRadius: 3,
                m: 0,
              }}>
                <CardContent>
                  <Typography sx={{ fontSize: 16, color: "#4339f2" }}>売上合計</Typography>
                  <Typography sx={{ fontWeight: "bold", fontSize: 28 }}>{summary.total.toLocaleString()}円</Typography>
                </CardContent>
              </Card>
              <Card sx={{
                flex: "1 1 200px",
                minWidth: 180,
                maxWidth: 320,
                bgcolor: "#e0ffe0",
                boxShadow: 3,
                borderRadius: 3,
                m: 0,
              }}>
                <CardContent>
                  <Typography sx={{ fontSize: 16, color: "#22bb22" }}>来店数</Typography>
                  <Typography sx={{ fontWeight: "bold", fontSize: 28 }}>{summary.visitors}人</Typography>
                </CardContent>
              </Card>
              <Card sx={{
                flex: "1 1 200px",
                minWidth: 180,
                maxWidth: 320,
                bgcolor: "#fffbe0",
                boxShadow: 3,
                borderRadius: 3,
                m: 0,
              }}>
                <CardContent>
                  <Typography sx={{ fontSize: 16, color: "#ffbc42" }}>客単価</Typography>
                  <Typography sx={{ fontWeight: "bold", fontSize: 28 }}>{summary.unitPrice.toLocaleString()}円</Typography>
                </CardContent>
              </Card>
              <Card sx={{
                flex: "1 1 240px",
                minWidth: 220,
                maxWidth: 340,
                bgcolor: "#e3f1fd",
                boxShadow: 3,
                borderRadius: 3,
                m: 0,
              }}>
                <CardContent>
                  <Typography sx={{ fontSize: 16, color: "#4339f2" }}>達成率</Typography>
                  <Typography sx={{ fontWeight: "bold", fontSize: 28 }}>{summary.goalRate}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={summary.goalRate}
                    sx={{
                      height: 14, borderRadius: 5, mt: 1,
                      [`& .MuiLinearProgress-bar`]: {
                        background: "linear-gradient(90deg,#4339f2 40%,#5ad2f6 100%)"
                      }
                    }}
                  />
                  <Typography fontSize={12}>
                    {summary.total.toLocaleString()}円／目標 {summary.goal.toLocaleString()}円
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </div>
        {/* AIアドバイス */}
        <div key="advice">
          <AdvicePanel />
        </div>
        {/* 前月/前年比較 */}
        <div key="compare">
          <ComparePanel />
        </div>
        {/* タブ式で下部パネル */}
        <div key="tabs">
          <Paper sx={{
            height: "100%",
            borderRadius: 6,
            boxShadow: 8,
            bgcolor: "#f6f7fa",
            p: 0,
            display: "flex",
            flexDirection: "column"
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
              {tabs.map((t, i) => <Tab key={i} label={t.label} sx={{ fontSize: 16, fontWeight: "bold" }} />)}
            </Tabs>
            <Divider />
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              {tabs[tab].panel}
            </Box>
          </Paper>
        </div>
      </GridLayout>
    </Box>
  );
}
