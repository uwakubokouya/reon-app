import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box, Tabs, Tab, Paper, Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableBody, TableRow, TableCell, Select, MenuItem, TextField, Stack
} from "@mui/material";
import HeavenTimeChartMemoPen from "../components/HeavenTimeChartMemoPen";
import ReservationHistoryList from "../components/ReservationHistoryList";
import { format, addDays, isSunday, isSaturday } from "date-fns";
import ja from "date-fns/locale/ja";
import { useSettings } from "../SettingsContext";
import { supabase } from "../lib/supabase";

// 2週間分の日付生成
const generateDates = (baseDate = new Date()) => {
  return [...Array(14)].map((_, i) => addDays(baseDate, i));
};

// 30分刻みの時間リスト
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
// 初期シフトデータ
const initShiftData = (casts, dates) =>
  (Array.isArray(casts) ? casts : []).reduce((acc, cast) => {
    if (!cast.id) return acc;
    acc[cast.id] = {};
    dates.forEach(date => {
      acc[cast.id][format(date, "yyyy-MM-dd")] = {
        type: "未設定",
        memo: "",
        start: "10:00",
        end: "22:00"
      };
    });
    return acc;
  }, {});

function ShiftTable() {
  // store_idをここで取得
  const { staff, currentStoreId } = useSettings();
  // 実際のキャスト
  const castList = useMemo(
    () => (staff || []).filter(s => s.role === "キャスト" && s.isActive && s.id),
    [staff]
  );

  const baseDate = new Date();
  const dates = generateDates(baseDate);

  // シフト情報（ローカル保持）
  const [shift, setShift] = useState(() => initShiftData(castList, dates));
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({
    open: false,
    castId: null,
    date: null,
    value: { type: "", memo: "", start: "10:00", end: "22:00" }
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const sortedCastList = useMemo(() => {
    return [...castList].map(cast => {
      // 今日のシフト
      const todayCell = shift[cast.id]?.[todayStr] || {};
      // 出勤済み判定
      const isCheckedIn = todayCell.type === "出勤済み";
      const isTodayWork = todayCell.type === "出勤";
      const todayStart = isTodayWork ? todayCell.start : null;
  
      // 次回出勤予定（日付・時刻）
      let nextDate = null, nextStart = null;
      for (let date of dates) {
        const dateStr = format(date, "yyyy-MM-dd");
        const s = shift[cast.id]?.[dateStr];
        if (dateStr >= todayStr && s?.type === "出勤") {
          nextDate = dateStr;
          nextStart = s.start;
          break;
        }
      }
      // シフト無し
      const hasNoShift = !dates.some(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        return shift[cast.id]?.[dateStr]?.type === "出勤";
      });
  
      return {
        ...cast,
        _sort: {
          isCheckedIn,
          isTodayWork,
          todayStart,
          nextDate,
          nextStart,
          hasNoShift,
        }
      };
    }).sort((a, b) => {
      // 1. 出勤済み→最優先
      if (a._sort.isCheckedIn && !b._sort.isCheckedIn) return -1;
      if (!a._sort.isCheckedIn && b._sort.isCheckedIn) return 1;
      // 2. 今日出勤→開始時刻昇順
      if (a._sort.isTodayWork && !b._sort.isTodayWork) return -1;
      if (!a._sort.isTodayWork && b._sort.isTodayWork) return 1;
      if (a._sort.isTodayWork && b._sort.isTodayWork) {
        return (a._sort.todayStart || "99:99").localeCompare(b._sort.todayStart || "99:99");
      }
      // 3. 次回出勤（次回日付・時間順）
      if (a._sort.nextDate && b._sort.nextDate) {
        if (a._sort.nextDate !== b._sort.nextDate) return a._sort.nextDate.localeCompare(b._sort.nextDate);
        return (a._sort.nextStart || "99:99").localeCompare(b._sort.nextStart || "99:99");
      }
      if (a._sort.nextDate && !b._sort.nextDate) return -1;
      if (!a._sort.nextDate && b._sort.nextDate) return 1;
      // 4. シフト無し
      if (a._sort.hasNoShift && !b._sort.hasNoShift) return 1;
      if (!a._sort.hasNoShift && b._sort.hasNoShift) return -1;
      return 0;
    });
  }, [castList, shift, dates]);

  // --- DBから初期ロード ---
  useEffect(() => {
    async function fetchShifts() {
      setLoading(true);
      const fromDate = format(dates[0], "yyyy-MM-dd");
      const toDate = format(dates[dates.length - 1], "yyyy-MM-dd");
      // store_idで絞り込み（必須！）
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("store_id", currentStoreId)
        .gte("date", fromDate)
        .lte("date", toDate);
      let tmp = initShiftData(castList, dates);
      if (data) {
        data.forEach(row => {
          if (row.cast_id && tmp[row.cast_id] && tmp[row.cast_id][row.date]) {
            tmp[row.cast_id][row.date] = {
              type: row.type || "未設定",
              memo: row.memo || "",
              start: row.start_time || "10:00",
              end: row.end_time || "22:00"
            };
          }
        });
      }
      setShift(tmp);
      setLoading(false);
    }
    if (castList.length > 0 && currentStoreId) fetchShifts();
    // eslint-disable-next-line
  }, [castList.length, currentStoreId]);

  // 土日色分け
  const getCellStyle = (date) => {
    if (isSunday(date)) return { bgcolor: "#ffe0e0" };
    if (isSaturday(date)) return { bgcolor: "#e0e9ff" };
    return {};
  };
  // 日ごとの合計人数
  const getTotal = (date) =>
    castList.filter(c => shift[c.id] && shift[c.id][format(date, "yyyy-MM-dd")]?.type === "出勤").length;

   // --- ここに関数を置く！ ---
  function getLatestShiftTime(castId, targetDate) {
    const dateList = Object.keys(shift[castId] || {})
      .filter(dateStr => dateStr < targetDate)
      .sort((a, b) => b.localeCompare(a));
    for (const dateStr of dateList) {
      const s = shift[castId][dateStr];
      if (s && s.type === "出勤") {
        return { start: s.start || "10:00", end: s.end || "22:00" };
      }
    }
    return { start: "10:00", end: "22:00" };
  }

  // セルクリックでダイアログ
  const handleCellClick = (castId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const cell = shift[castId][dateStr] || { type: "未設定" };
    let value = { ...cell };
    // 出勤の場合・未設定の場合は過去から取得
    if (!cell.start || !cell.end || cell.type === "未設定") {
      const latest = getLatestShiftTime(castId, dateStr);
      value.start = latest.start;
      value.end = latest.end;
    }
    setDialog({
      open: true,
      castId,
      date,
      value,
    });
  };

  // --- シフト登録（更新） ---
  const handleSave = useCallback(async () => {
    const { castId, date, value } = dialog;
    const dateStr = format(date, "yyyy-MM-dd");
    // store_idを必ず保存
    const row = {
      cast_id: castId,
      date: dateStr,
      type: value.type,
      memo: value.memo,
      start_time: value.start || "10:00",
      end_time: value.end || "22:00",
      is_active: value.type === "出勤",
      store_id: currentStoreId // ←ここ必須！
    };
    // DBへupsert（同一 cast_id + date + store_id なら更新）
    const { error } = await supabase
      .from("shifts")
      .upsert([row], { onConflict: ["cast_id", "date", "store_id"] }); // ←複合ユニークキーならここも

    if (error) {
      alert("追加失敗: " + (error.message || "不明なエラー"));
    } else {
      setShift(prev => ({
        ...prev,
        [castId]: {
          ...prev[castId],
          [dateStr]: {
            type: value.type,
            memo: value.memo,
            start: value.start || "10:00",
            end: value.end || "22:00"
          }
        }
      }));
      setDialog({ open: false, castId: null, date: null, value: { type: "", memo: "", start: "10:00", end: "22:00" } });
    }
  }, [dialog, currentStoreId]);

  return (
    <>
      <Box sx={{ width: "100%", overflowX: "auto", bgcolor: "#fff", p: 2, borderRadius: 3, boxShadow: 1 }}>
        <Typography variant="h6" fontWeight={800} mb={2}>出勤管理</Typography>
        <Paper sx={{ minWidth: 1250, overflowX: "auto", borderRadius: 2 }}>
          <Table sx={{ minWidth: 1250 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 110, fontWeight: 700, bgcolor: "#f5f8fa" }}>キャスト名</TableCell>
                {dates.map(date => (
                  <TableCell
                    key={format(date, "yyyy-MM-dd")}
                    sx={{
                      textAlign: "center",
                      fontWeight: 700,
                      ...getCellStyle(date),
                      px: 1.5,
                    }}
                  >
                    <div style={{ fontSize: 15 }}>
                      {format(date, "d", { locale: ja })}
                    </div>
                    <div style={{ fontSize: 13, color: "#999" }}>
                      {format(date, "E", { locale: ja })}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedCastList.map(cast => (
                <TableRow key={cast.id}>
                  <TableCell sx={{ fontWeight: 600, minWidth: 110, borderRight: "1px solid #e5e7eb" }}>
                    <span style={{ color: "#f36b92" }}>{cast.name}</span>
                  </TableCell>
                  {dates.map(date => {
                    const cell = shift[cast.id]?.[format(date, "yyyy-MM-dd")] ?? { type: "未設定" };
                    return (
                      <TableCell
                        key={format(date, "yyyy-MM-dd")}
                        sx={{
                          ...getCellStyle(date),
                          cursor: "pointer",
                          borderLeft: "1px solid #e9eef4",
                          px: 1,
                          py: 1.1,
                          position: "relative"
                        }}
                        onClick={() => handleCellClick(cast.id, date)}
                      >
                        <Typography
                          fontWeight={cell.type === "出勤" ? 700 : 400}
                          color={cell.type === "出勤" ? "#2da36a" : "#a5a5a5"}
                          sx={{ fontSize: 13 }}
                          noWrap
                        >
                          {cell.type === "未設定" ? "—" : cell.type}
                        </Typography>
                        {cell.type === "出勤" && (
                          <Typography fontSize={11} color="#0077c2">
                            {(cell.start || "10:00")}〜{(cell.end || "22:00")}
                          </Typography>
                        )}
                        {cell.memo && (
                          <Typography fontSize={11} color="#b8b8b8">
                            {cell.memo}
                          </Typography>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {/* 合計行 */}
              <TableRow>
                <TableCell sx={{ bgcolor: "#f9fafb", fontWeight: 700, color: "#3db7b4", textAlign: "right" }}>
                  合計
                </TableCell>
                {dates.map(date => (
                  <TableCell key={format(date, "yyyy-MM-dd")} sx={{ bgcolor: "#f9fafb", textAlign: "center", fontWeight: 800, color: "#3db7b4" }}>
                    {getTotal(date) > 0 ? getTotal(date) : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
        {loading && <Typography color="text.secondary" mt={2}>シフト情報を取得中...</Typography>}
      </Box>
      {/* --- 編集ダイアログ --- */}
      <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })}>
        <DialogTitle>
          シフト登録（{castList.find(c => c.id === dialog.castId)?.name} / {dialog.date && format(dialog.date, "M/d(E)", { locale: ja })}）
        </DialogTitle>
        <DialogContent>
          <Select
            value={dialog.value.type}
            onChange={e => setDialog({ ...dialog, value: { ...dialog.value, type: e.target.value } })}
            sx={{ mb: 2, minWidth: 180 }}
          >
            <MenuItem value="出勤">出勤</MenuItem>
            <MenuItem value="休み">休み</MenuItem>
            <MenuItem value="未設定">—</MenuItem>
          </Select>
          {dialog.value.type === "出勤" && (
            <Box display="flex" gap={1} mb={2}>
              <Select
                value={dialog.value.start}
                onChange={e => setDialog({ ...dialog, value: { ...dialog.value, start: e.target.value } })}
                sx={{ width: "100%" }}
              >
                {timeOptions.map(time => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
              <Select
                value={dialog.value.end}
                onChange={e => setDialog({ ...dialog, value: { ...dialog.value, end: e.target.value } })}
                sx={{ width: "100%" }}
              >
                {timeOptions.map(time => (
                  <MenuItem key={time} value={time}>{time}</MenuItem>
                ))}
              </Select>
            </Box>
          )}
          <TextField
            label="メモ"
            value={dialog.value.memo}
            onChange={e => setDialog({ ...dialog, value: { ...dialog.value, memo: e.target.value } })}
            size="small"
            fullWidth
            sx={{ mb: 1 }}
            placeholder="例: 中抜け予定/予約のみ接客 など"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ ...dialog, open: false })}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: "#3db7b4" }}>登録する</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function TimetablePage() {
  const [tab, setTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { currentStoreId } = useSettings();

  return (
    <Box sx={{ borderBottom: "1.5px solid #e0e7ef", bgcolor: "#f8fbfc" }}>
      {/* タブ部分 */}
      <Paper elevation={0} sx={{ borderRadius: "16px 16px 0 0", mb: 0 }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          // ...省略
        >
          <Tab label="出勤管理" value={0} />
          <Tab label="タイムテーブル" value={1} />
          <Tab label="履歴一覧" value={3} />
        </Tabs>
      </Paper>

      {/* --- タブ内容 --- */}
      <Box sx={{ pt: 2 }}>
        {tab === 0 && <ShiftTable />}
        {tab === 1 && <HeavenTimeChartMemoPen />}
        {tab === 3 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <TextField
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                sx={{ width: 180 }}
                inputProps={{ style: { fontWeight: 700, fontSize: 16 } }}
              />
            </Box>
            <ReservationHistoryList date={selectedDate} storeId={currentStoreId} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
