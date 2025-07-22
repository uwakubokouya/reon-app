import React, { useState } from "react";
import {
  Box, Paper, Typography, Divider, Card, LinearProgress, Avatar, Tabs, Tab, List, ListItem, ListItemAvatar, ListItemText
} from "@mui/material";
import {
  Twitter, Instagram, ChatBubble, Timeline, AccessTime, Whatshot
} from "@mui/icons-material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as ReBarChart, Bar, Cell
} from "recharts";

// --- カラー・アイコン・グラデ背景 ---
const cyan = "#06b6d4";
const magenta = "#e879f9";
const green = "#16db65";
const accent = "#6366f1";
const gradBG =
  "radial-gradient(circle at 70% 20%, #dbeafe 0%, #f3e8ff 70%, #f1f5f9 100%)";

// --- データ ---
const snsSummary = [
  { sns: "X", icon: <Twitter sx={{ color: cyan }} />, count: 75, title: "再来予約率が高い", trend: "+15%", desc: "トレンド投稿の即効波及に強み" },
  { sns: "Instagram", icon: <Instagram sx={{ color: magenta }} />, count: 53, title: "新規女性流入増", trend: "+9%", desc: "写真映え・ビジュアル訴求が高評価" },
  { sns: "LINE", icon: <ChatBubble sx={{ color: green }} />, count: 92, title: "常連・前日リマインド", trend: "+4%", desc: "一斉配信＋個別フォローで安定動員" }
];

const trendData = [
  { day: "5/1", X: 21, Instagram: 12, LINE: 29 },
  { day: "5/2", X: 17, Instagram: 14, LINE: 30 },
  { day: "5/3", X: 18, Instagram: 12, LINE: 32 },
  { day: "5/4", X: 22, Instagram: 15, LINE: 34 },
  { day: "5/5", X: 27, Instagram: 16, LINE: 32 },
  { day: "5/6", X: 23, Instagram: 14, LINE: 28 },
  { day: "5/7", X: 24, Instagram: 17, LINE: 31 }
];

const reservationSummary = [
  { sns: "X", value: 75 },
  { sns: "Instagram", value: 53 },
  { sns: "LINE", value: 92 }
];

const buzzTimeData = {
  X: [
    { time: "10時", value: 2 },
    { time: "12時", value: 6 },
    { time: "14時", value: 18 },
    { time: "16時", value: 21 },
    { time: "18時", value: 17 },
    { time: "20時", value: 8 }
  ],
  Instagram: [
    { time: "10時", value: 3 },
    { time: "12時", value: 12 },
    { time: "14時", value: 16 },
    { time: "16時", value: 13 },
    { time: "18時", value: 9 },
    { time: "20時", value: 2 }
  ],
  LINE: [
    { time: "10時", value: 1 },
    { time: "12時", value: 9 },
    { time: "14時", value: 10 },
    { time: "16時", value: 14 },
    { time: "18時", value: 12 },
    { time: "20時", value: 5 }
  ]
};

const buzzRankingData = {
  X: [
    { id: 1, title: "【明日も元気に営業！】お得情報はプロフから", score: 18120, sub: "インプレッション数", icon: <Twitter sx={{ color: cyan }} /> },
    { id: 2, title: "新サービス告知✨見逃し注意", score: 14400, sub: "インプレッション数", icon: <Twitter sx={{ color: cyan }} /> },
    { id: 3, title: "スタッフ紹介＆裏話", score: 11980, sub: "インプレッション数", icon: <Twitter sx={{ color: cyan }} /> }
  ],
  Instagram: [
    { id: 1, title: "新衣装コーデ投稿が1位！", score: 9200, sub: "リーチ数", icon: <Instagram sx={{ color: magenta }} /> },
    { id: 2, title: "今日のオフショット", score: 7810, sub: "リーチ数", icon: <Instagram sx={{ color: magenta }} /> },
    { id: 3, title: "お客様アンケート回答でプレゼント", score: 6980, sub: "リーチ数", icon: <Instagram sx={{ color: magenta }} /> }
  ],
  LINE: [
    { id: 1, title: "土曜限定クーポン配信", score: 2010, sub: "クリック数", icon: <ChatBubble sx={{ color: green }} /> },
    { id: 2, title: "リピート感謝メッセージ", score: 1510, sub: "クリック数", icon: <ChatBubble sx={{ color: green }} /> },
    { id: 3, title: "当日空き枠速報", score: 1330, sub: "クリック数", icon: <ChatBubble sx={{ color: green }} /> }
  ]
};

const adviceData = [
  {
    sns: "X",
    icon: <Twitter sx={{ color: cyan, fontSize: 26 }} />,
    color: cyan,
    label: "X（旧Twitter）",
    text: (
      <>
        <strong>■拡散の波を狙え</strong><br />
        14〜16時のリアルタイム投稿が拡散性UP。<br />
        トレンド・速報ネタで波及を狙おう！<br />
        <span style={{ color: "#7dd3fc" }}>#リポスト狙い、日替わり企画も効果的</span>
      </>
    )
  },
  {
    sns: "Instagram",
    icon: <Instagram sx={{ color: magenta, fontSize: 26 }} />,
    color: magenta,
    label: "Instagram",
    text: (
      <>
        <strong>■新規層の獲得がカギ</strong><br />
        写真映え＋ストーリー強化で新規女性層へ。<br />
        投稿は平日12〜16時が特に効果的！<br />
        <span style={{ color: "#f0abfc" }}>#ストーリーズやハッシュタグの最適化推奨</span>
      </>
    )
  },
  {
    sns: "LINE",
    icon: <ChatBubble sx={{ color: green, fontSize: 26 }} />,
    color: green,
    label: "LINE",
    text: (
      <>
        <strong>■安定集客の王道</strong><br />
        一斉配信は木・土曜18時がベスト。<br />
        常連リマインド・個別クーポンも活用しよう。<br />
        <span style={{ color: "#4ade80" }}>#再来店促進・クーポン併用</span>
      </>
    )
  }
];

// --- SNSごとバズタイムグラフ ---
function BuzzTimeChart({ snsKey, color }) {
  const data = buzzTimeData[snsKey];
  return (
    <Box mt={3}>
      <Typography fontWeight={800} mb={1.2} color={color} sx={{ display: 'flex', alignItems: 'center' }}>
        <AccessTime sx={{ mr: 1, color: color }} />
        {adviceData.find(a => a.sns === snsKey).label} バズタイム分析
      </Typography>
      <ResponsiveContainer width="100%" height={185}>
        <ReBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[10, 10, 0, 0]} />
        </ReBarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// --- バズ投稿ランキング ---
function BuzzRanking({ snsKey }) {
  const data = buzzRankingData[snsKey];
  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        boxShadow: "0 1.5px 12px #818cf826",
        border: "1.5px solid #e5e7eb",
        minWidth: 250,
        maxWidth: 340,
        mx: "auto",
        bgcolor: "#fff"
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Whatshot sx={{ color: accent }} />
        <Typography fontWeight={900} fontSize={18} color={accent}>
          バズ投稿ランキング
        </Typography>
      </Box>
      <Divider sx={{ mb: 1.4 }} />
      <List>
        {data.map((item, idx) => (
          <ListItem key={item.id} disableGutters alignItems="flex-start">
            <ListItemAvatar>
              <Avatar sx={{
                bgcolor: "#f3f6fd",
                color: "#222",
                width: 40,
                height: 40,
                border: idx === 0
                  ? `2.5px solid ${accent}`
                  : idx === 1
                    ? `2.5px solid #a5b4fc`
                    : `2.5px solid #d1d5db`
              }}>
                {item.icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography fontWeight={700} fontSize={15.5} component="span">
                  {item.title}
                </Typography>
              }
              secondary={
                <Box display="flex" gap={1} alignItems="center" mt={0.5} component="span">
                  <Typography fontWeight={900} color={accent} fontSize={16} component="span">
                    {item.score.toLocaleString()}
                  </Typography>
                  <Typography fontWeight={600} color="#888" fontSize={13} component="span">
                    {item.sub}
                  </Typography>
                </Box>
              }
              sx={{ ml: 0.5 }}
            />
          </ListItem>
        ))}
      </List>
    </Card>
  );
}

export default function SnsAnalysisPage() {
  const [tab, setTab] = useState(0);
  const unitRate = "58%";
  const totalAccess = 75 + 53 + 92;

  return (
    <Box sx={{
      p: { xs: 1, md: 3 },
      minHeight: "100vh",
      bgcolor: gradBG,
      borderRadius: "0 0 32px 32px",
      overflow: "hidden"
    }}>

      {/* --- 上部グラフ＆サマリー --- */}
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
          minHeight: { xs: 0, md: 370 }
        }}
      >
        {/* 左: 上下グラフ */}
        <Box sx={{ flex: 1.2, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* アクセス数推移グラフ */}
          <Box
            sx={{
              borderRadius: 2.2,
              p: 2.2,
              mb: 1,
              minHeight: 140,
              flex: 1
            }}
          >
            <Typography fontWeight={900} fontSize={16.5} color={cyan} mb={1}>
              SNS別アクセス数推移
            </Typography>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area dataKey="X" stroke={cyan} fill={cyan} fillOpacity={0.4} />
                <Area dataKey="Instagram" stroke={magenta} fill={magenta} fillOpacity={0.25} />
                <Area dataKey="LINE" stroke={green} fill={green} fillOpacity={0.17} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
          {/* 予約数グラフ（当月トータル） */}
          <Box
            sx={{
              borderRadius: 2.2,
              p: 2.2,
              minHeight: 110,
              flex: 1
            }}
          >
            <Typography fontWeight={900} fontSize={16.5} color={magenta} mb={1}>
              SNS別予約数グラフ
            </Typography>
            <ResponsiveContainer width="100%" height={180}>
              <ReBarChart data={reservationSummary}>
                <XAxis dataKey="sns" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {reservationSummary.map((entry, idx) => (
                    <Cell key={entry.sns}
                      fill={
                        entry.sns === "X" ? cyan :
                          entry.sns === "Instagram" ? magenta : green
                      }
                    />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
        {/* 右: サマリーカード4枚 */}
        <Box sx={{
          width: 500,
          minWidth: 150,
          display: "flex",
          flexDirection: "column",
          gap: 1.7,
          alignItems: "stretch",
          justifyContent: "space-between"
        }}>
          {snsSummary.map((s) => (
            <Card
              key={s.sns}
              sx={{
                p: 2,
                borderRadius: 2.1,
                display: "flex",
                alignItems: "center",
                gap: 2,
                minHeight: 61,
                boxShadow: "0 1.5px 12px #06b6d428"
              }}
            >
              <Box sx={{ fontSize: 28 }}>{s.icon}</Box>
              <Box>
                <Typography fontWeight={700}>{s.sns}</Typography>
                <Typography fontSize={13} color="#888">{s.title}</Typography>
                <Typography fontSize={20} fontWeight={800} color={accent}>{s.count}件</Typography>
              </Box>
            </Card>
          ))}
          <Card sx={{ p: 2, borderRadius: 2.1, boxShadow: "0 1.5px 12px #e879f928" }}>
            <Typography fontWeight={700} color={magenta}>SNS全体アクセス</Typography>
            <Typography fontSize={24} fontWeight={900}>{totalAccess} 件</Typography>
            <Typography fontSize={14} color="#666">予約率 {unitRate}</Typography>
            <LinearProgress variant="determinate" value={58} sx={{ mt: 1, height: 8, borderRadius: 6 }} />
          </Card>
        </Box>
      </Paper>

      {/* --- SNSごとに切替タブ --- */}
      <Paper
        sx={{
          borderRadius: 4,
          boxShadow: 8,
          p: 0,
          bgcolor: "#f6f7fa",
          mb: 3,
          width: "100%",
          maxWidth: 1650,
          mx: "auto"
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: "#e0e7ff",
            "& .MuiTabs-indicator": {
              background: "linear-gradient(90deg,#4339f2 60%,#5ad2f6 100%)"
            }
          }}
        >
          {adviceData.map((sns, i) => (
            <Tab
              key={sns.sns}
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  {sns.icon}
                  <span style={{
                    fontWeight: 700,
                    color: tab === i ? sns.color : "#222"
                  }}>{sns.sns}</span>
                </Box>
              }
              sx={{ fontSize: 16, fontWeight: 700 }}
            />
          ))}
        </Tabs>
        {/* --- 2カラム構成 --- */}
        <Box sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          p: { xs: 2, md: 4 },
          alignItems: "flex-start",
          minHeight: 420
        }}>
          {/* 左カラム：AIアドバイス＋バズタイム */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 550 }}>
            <Card
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: "0 1.5px 12px #06b6d428",
                border: "1.5px solid #e5e7eb",
                bgcolor: "#fff"
              }}
            >
              <Box display="flex" alignItems="center" gap={1.3} mb={1.2}>
                {adviceData[tab].icon}
                <Typography fontWeight={700} fontSize={19} color={adviceData[tab].color}>
                  {adviceData[tab].label}
                </Typography>
              </Box>
              <Typography fontSize={15.5} sx={{ lineHeight: 2, mb: 2 }}>
                {adviceData[tab].text}
              </Typography>
              <BuzzTimeChart snsKey={adviceData[tab].sns} color={adviceData[tab].color} />
            </Card>
          </Box>
          {/* 右カラム：バズ投稿ランキング */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 380, width: "100%" }}>
            <BuzzRanking snsKey={adviceData[tab].sns} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
