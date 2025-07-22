import React, { useState, useMemo } from "react";
import { Paper, Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Chip } from "@mui/material";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DiaryCountPanel({ dailyReports = [] }) {
  // 1. 全日記データを月でまとめる（全キャスト・時間帯を横断的に）
  const diaryArray = useMemo(
    () => dailyReports.flatMap(report =>
      (Array.isArray(report.diary_logs) ? report.diary_logs.map(d => ({ ...d, date: report.date })) : [])
    ),
    [dailyReports]
  );

  // 2. キャスト名一覧を抽出（重複排除）
  const castList = useMemo(
    () => Array.from(new Set(diaryArray.map(d => d.cast).filter(Boolean))),
    [diaryArray]
  );

  // 3. 集計：キャスト選択
  const [selectedCast, setSelectedCast] = useState(""); // ""=全体

  // 4. 時間帯ごとに本数カウント
  const graphData = useMemo(() => {
    const counts = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}時`,
      count: 0
    }));
    diaryArray.forEach(d => {
      if (selectedCast && d.cast !== selectedCast) return;

      // ★ここ
      let hour = 0;
      if (d.hour !== undefined && d.hour !== null && d.hour !== "") {
        hour = Number(d.hour);
      } else if (d.time) {
        if (typeof d.time === "string") {
          const m = d.time.match(/^(\d{1,2})/);
          if (m) hour = Number(m[1]);
        } else if (typeof d.time === "number") {
          hour = d.time;
        }
      }

      if (hour >= 0 && hour <= 23) {
        counts[hour].count++;
      }
    });
    return counts;
  }, [diaryArray, selectedCast]);


  // 5. 総本数（月集計）
  const totalCount = graphData.reduce((sum, d) => sum + d.count, 0);

  return (
    <Paper sx={{ p: 2, borderRadius: 2, height: "100%", minHeight: 340 }}>
      <Typography fontWeight={900} sx={{ mb: 1 }} component="div">
        写メ日記投稿本数の時間推移
        <Chip label="Supabase集計" color="primary" size="small" sx={{ ml: 1 }} onClick={() => { }} />
      </Typography>
      <FormControl size="small" sx={{ minWidth: 140, mb: 2 }}>
        <InputLabel>キャスト選択</InputLabel>
        <Select
          value={selectedCast}
          label="キャスト選択"
          onChange={e => setSelectedCast(e.target.value)}
        >
          <MenuItem value="">全体（合計）</MenuItem>
          {castList.map(name => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={graphData}>
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
          <XAxis dataKey="hour" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={13} />
          <Tooltip formatter={v => `${v}本`} />
          <Line
            type="monotone"
            dataKey="count"
            name={selectedCast ? `${selectedCast}の投稿数` : "全体の投稿数"}
            stroke="#6366f1"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 7 }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <Box mt={2} textAlign="center">
        <Typography fontWeight={900} fontSize={19} color="#6366f1">
          総本数：{totalCount} 本
        </Typography>
      </Box>
    </Paper>
  );
}
