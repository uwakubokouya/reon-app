import React, { useState } from "react";
import {
  Box, Paper, Card, CardContent, Typography, Chip, Button, TextField,
  Avatar, Stack, IconButton, Divider
} from "@mui/material";
import EmojiObjectsIcon from "@mui/icons-material/EmojiObjects";
import InsightsIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import ForumIcon from "@mui/icons-material/Forum";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RefreshIcon from "@mui/icons-material/Refresh";
import FavoriteIcon from "@mui/icons-material/Favorite";
import StarIcon from "@mui/icons-material/Star";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

// --- スタイル共通
const accent = "#6366f1";
const cyan = "#06b6d4";
const magenta = "#e879f9";
const orange = "#fb923c";
const gradBG = "radial-gradient(circle at 70% 12%, #e0e7ff 0%, #f3e8ff 80%, #f1f5f9 100%)";
const glassStyle = {
  background: "rgba(255,255,255,0.93)",
  boxShadow: "0 8px 36px #818cf822,0 2px 8px #06b6d418",
  border: "1.5px solid #e0e7ff44",
  borderRadius: 18,
  backdropFilter: "blur(7px)"
};

// --- ダミーデータ
const salesTrendData = [
  { date: "6/1", 売上: 180000 }, { date: "6/2", 売上: 220000 }, { date: "6/3", 売上: 197000 }, { date: "6/4", 売上: 242000 },
  { date: "6/5", 売上: 214000 }, { date: "6/6", 売上: 229000 }, { date: "6/7", 売上: 270000 },
];
const castRank = [
  { name: "さくら", 売上: 980000, 指名: 21, OP: 12 },
  { name: "もえ", 売上: 840000, 指名: 17, OP: 18 },
  { name: "ゆり", 売上: 735000, 指名: 16, OP: 11 },
];
const uniqueIndex = [
  { 指標: "リピーター率", 値: 82 },
  { 指標: "平均指名回数", 値: 2.8 },
  { 指標: "コース追加率", 値: 49 },
  { 指標: "離脱予兆", 値: 19 },
];

const aiActions = [
  "本日18:00にX限定“合言葉割”投稿で新規指名が＋8組予測。即発信を推奨！",
  "来週木曜は競合割引が増加予測。LINE配信でリピーター流出を防げます。",
  "新人割・本指名割りを日替わりでアピールすると失客防止＋売上UP！",
  "写メ日記の投稿頻度を増やすとインスタ流入も2割増。週3投稿を目安に！"
];
const dropReasons = [
  "今週の来店減は人気キャスト“もえ”休み＆競合イベント重複が要因。",
  "新規リピーター化率が微減。LINEフォロー自動送信の強化が有効。",
  "インスタ流入増加中だが、客単価はX経由の方が高い傾向。",
  "土日午後の競合店割引で流出増。指名割・ポイント施策が有効。",
];
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function AiAdvicePage() {
  const [aiAction, setAiAction] = useState(getRandom(aiActions));
  const [dropReason, setDropReason] = useState(getRandom(dropReasons));
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState("");
  const [chat, setChat] = useState([{ type: "ai", text: "売上・稼働・リピート対策など現場の悩みは何でも相談OK！" }]);
  const [chatInput, setChatInput] = useState("");

  const handleSimulate = () => {
    setSimResult(`施策「${simInput}」をAIが予測 → 週売上＋18万円／リピート＋8%が期待できます。`);
  };
  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    setChat([...chat, { type: "user", text: chatInput }]);
    setTimeout(() => {
      setChat(c => [
        ...c,
        { type: "ai", text: `「${chatInput}」についてのAI分析：\n集客・リピート・指名売上アップを総合的にご提案！` }
      ]);
    }, 700);
    setChatInput("");
  };

  return (
    <Box sx={{
      p: { xs: 1, md: 3 },
      width: "100%",
      minHeight: "100vh",
      bgcolor: gradBG,
      borderRadius: "0 0 32px 32px",
      overflow: "hidden"
    }}>

      {/* --- 上部サマリー --- */}
      <Paper
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 8,
          display: "flex",
          gap: { xs: 2, md: 4 },
          p: { xs: 1.5, md: 3 },
          flexDirection: "row",
          alignItems: "stretch",
          minHeight: { xs: 0, md: 230 },
          width: "100%"
        }}
      >
        {/* 左：キャストランキング+KPI */}
        <Box sx={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* キャストランキング */}
          <Card sx={{ ...glassStyle, p: 2, borderRadius: 3, mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon sx={{ color: accent, mr: 1 }} />
                <Typography fontWeight={700} fontSize={16}>キャスト売上・指名ランキング</Typography>
              </Box>
              {castRank.map((c, i) => (
                <Box key={i} display="flex" alignItems="center" mb={0.5}>
                  <Chip
                    icon={i === 0 ? <StarIcon sx={{ color: "#fde047" }} /> : <FavoriteIcon sx={{ color: cyan }} />}
                    label={`No.${i + 1}`}
                    size="small"
                    color={i === 0 ? "primary" : "default"}
                    sx={{ mr: 1 }}
                    clickable={false}
                    component="div"
                    onClick={() => {}}
                  />
                  <Typography fontWeight="bold" mr={1}>{c.name}</Typography>
                  <Typography color="#64748b" fontWeight={600} sx={{ minWidth: 80 }}>{c.売上.toLocaleString()}円</Typography>
                  <Typography color={cyan} fontWeight={700} ml={1}>指名{c.指名}件</Typography>
                  <Typography color={magenta} fontWeight={700} ml={2}>OP{c.OP}件</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
          {/* KPI/独自指標 */}
          <Card sx={{ ...glassStyle, p: 2, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <PeopleIcon sx={{ color: accent, mr: 1 }} />
                <Typography fontWeight={700} fontSize={16}>現場KPI/独自指標</Typography>
              </Box>
              <Stack direction="row" gap={2}>
                {uniqueIndex.map((u, i) => (
                  <Card key={u.指標} sx={{
                    bgcolor: "#f1f5f9",
                    boxShadow: "0 1.5px 8px #818cf833",
                    px: 1.7, py: 1.2, borderRadius: 3, minWidth: 86, textAlign: "center"
                  }}>
                    <Typography fontWeight="bold" fontSize={12} color={accent}>{u.指標}</Typography>
                    <Typography fontSize={18} fontWeight="bold" color={u.値 >= 80 ? "success.main" : (u.値 < 40 ? "error.main" : accent)}>
                      {u.値}
                    </Typography>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
        {/* 右：売上グラフ */}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 420, display: "flex", flexDirection: "column", gap: 2, justifyContent: "center" }}>
          <Card sx={{ ...glassStyle, p: 2, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon sx={{ color: cyan, mr: 1 }} />
                <Typography fontWeight={700} fontSize={16}>今月の売上推移</Typography>
              </Box>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="売上" stroke={magenta} strokeWidth={4} dot={{ r: 4, fill: accent }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* --- 下部：AIアドバイス＆チャット --- */}
      <Paper
        sx={{
          borderRadius: 4,
          boxShadow: 8,
          p: { xs: 2, md: 4 },
          bgcolor: "#f6f7fa",
          width: "100%",
          maxWidth: 1650,
          mx: "auto"
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} gap={3} alignItems="flex-start">
          {/* 左：AI推奨/シミュ/減少分析 */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 530 }}>
            {/* AI推奨アクション */}
            <Card sx={{ ...glassStyle, mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1.5}>
                  <EmojiObjectsIcon sx={{ color: cyan, mr: 1 }} />
                  <Typography fontWeight={700} fontSize={18} color={cyan}>AI推奨アクション</Typography>
                  <IconButton onClick={() => setAiAction(getRandom(aiActions))} size="small" sx={{ ml: 1 }}>
                    <RefreshIcon />
                  </IconButton>
                </Box>
                <Typography fontSize={17.5} fontWeight="bold">{aiAction}</Typography>
              </CardContent>
            </Card>
            {/* シミュレーション */}
            <Card sx={{ ...glassStyle, mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1.5}>
                  <SwapHorizIcon sx={{ color: accent, mr: 1 }} />
                  <Typography fontWeight={700} fontSize={18} color={accent}>施策シミュレーション</Typography>
                </Box>
                <Box display="flex" gap={1.2}>
                  <TextField
                    size="small"
                    label="例：新人割＋SNS投稿"
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    sx={{ flex: 1, bgcolor: "#f3f4f6", borderRadius: 2 }}
                  />
                  <Button
                    variant="contained"
                    sx={{ bgcolor: accent, color: "#fff", fontWeight: 700, ":hover": { bgcolor: "#818cf8" } }}
                    onClick={handleSimulate}
                  >AI予測</Button>
                </Box>
                {simResult && <Typography mt={1.2} color={accent} fontWeight="bold" fontSize={15}>{simResult}</Typography>}
              </CardContent>
            </Card>
            {/* 来店減少AI分析 */}
            <Card sx={{ ...glassStyle }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1.5}>
                  <InsightsIcon sx={{ color: orange, mr: 1 }} />
                  <Typography fontWeight={700} fontSize={18} color={orange}>来店減少・原因AI分析</Typography>
                  <IconButton onClick={() => setDropReason(getRandom(dropReasons))} size="small" sx={{ ml: 1 }}>
                    <RefreshIcon />
                  </IconButton>
                </Box>
                <Typography fontSize={16.5} fontWeight="bold">{dropReason}</Typography>
              </CardContent>
            </Card>
          </Box>
          {/* 右：チャットAI */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 650 }}>
            <Box display="flex" alignItems="center" mb={1.2}>
              <ForumIcon sx={{ color: accent, mr: 1 }} />
              <Typography fontWeight={700} fontSize={18}>AIチャット（現場なんでも相談）</Typography>
            </Box>
            <Box sx={{
              minHeight: 150,
              maxHeight: 340,
              overflowY: "auto",
              bgcolor: "#e0e7ef",
              p: 2,
              borderRadius: 2.5,
              mb: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.7,
            }}>
              {chat.map((m, i) =>
                <Box key={i} display="flex" justifyContent={m.type === "ai" ? "flex-start" : "flex-end"}>
                  <Box
                    sx={{
                      bgcolor: m.type === "ai" ? "#fff" : accent,
                      px: 2.7,
                      py: 1.7,
                      borderRadius: 2.8,
                      color: m.type === "ai" ? "#222" : "#fff",
                      maxWidth: 480,
                      fontSize: 17,
                      wordBreak: "break-word",
                      boxShadow: m.type === "ai" ? "0 2px 8px #f3f3f355" : "0 2px 12px #818cf855"
                    }}
                  >
                    {m.text}
                  </Box>
                </Box>
              )}
            </Box>
            <Box display="flex" gap={1.5}>
              <TextField
                size="medium"
                placeholder="現場・売上・SNS…なんでも相談OK"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                fullWidth
                sx={{ bgcolor: "#fff", borderRadius: 2, fontSize: 17 }}
                onKeyDown={e => { if (e.key === "Enter") handleChatSend(); }}
              />
              <Button variant="contained" sx={{
                background: accent, color: "#fff", fontWeight: 700,
                fontSize: 17,
                minWidth: 88,
                height: 46,
                ":hover": { background: "#818cf8" }
              }} onClick={handleChatSend}>送信</Button>
            </Box>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
