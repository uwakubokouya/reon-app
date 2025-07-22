import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Divider, Button, List, ListItem, ListItemText,
  Modal, TextField, Grid, MenuItem, Select, FormControl, InputLabel, ListItemButton
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EventIcon from "@mui/icons-material/Event";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EditNoteIcon from "@mui/icons-material/EditNote";
import AddIcon from "@mui/icons-material/Add";
import { supabase } from "../lib/supabase";

const accent = "#6366f1";
const cyan = "#06b6d4";
const magenta = "#e879f9";
const green = "#10b981";

// 月リスト
function getMonthOptions() {
  const arr = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    arr.push({
      value: d.getFullYear() + '-' + String(month).padStart(2, '0'),
      label: `${d.getFullYear()}年${month}月`
    });
  }
  return arr;
}

function displayDiscount(discount) {
  // 配列
  if (Array.isArray(discount)) return discount.join(", ");
  // 文字列（JSON配列の可能性も）
  if (typeof discount === "string") {
    try {
      const arr = JSON.parse(discount);
      if (Array.isArray(arr)) return arr.join(", ");
      return discount;
    } catch {
      return discount;
    }
  }
  // それ以外
  return "";
}

export default function CastMyPage({ cast, onLogout }) {
  // ステート
  const [notices, setNotices] = useState([]);
  const [nextShift, setNextShift] = useState(null);
  const [salaryTarget, setSalaryTarget] = useState(0);
  const [editSalaryTarget, setEditSalaryTarget] = useState(0);
  const [targetLoading, setTargetLoading] = useState(false);
  const [diaryLoading, setDiaryLoading] = useState(false);

  const monthOpts = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOpts[0].value);

  const [salaryDetails, setSalaryDetails] = useState([]); // salariesの日リスト
  const [salarySum, setSalarySum] = useState(0);

  const [selectedDate, setSelectedDate] = useState(null); // yyyy-mm-dd
  const [reservations, setReservations] = useState([]); // 当日予約

  // 顧客関連
  const [customers, setCustomers] = useState([]);
  const [customerMemoOpen, setCustomerMemoOpen] = useState(false);
  const [customerMemoTarget, setCustomerMemoTarget] = useState(null); // { id, name }
  const [myCustomerMemos, setMyCustomerMemos] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [customerMemoText, setCustomerMemoText] = useState("");

  const [selectedZappi, setSelectedZappi] = useState(0);

  const [searchName, setSearchName] = useState("");
  const [searchDate, setSearchDate] = useState(""); // 形式: yyyy-mm-dd
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const [isSStore, setIsSStore] = useState(false);
  useEffect(() => {
    if (!cast?.store_id) return;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("rank")
        .eq("store_id", cast.store_id)
        .maybeSingle();
      setIsSStore(data?.rank === "S");
    })();
  }, [cast]);

  // --- お知らせ取得と既読取得 ---
  useEffect(() => {
    if (!cast) return;

    // ① 全員向け(notices.cast_id is null)
    supabase
      .from("notices")
      .select("*")
      .is("cast_id", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotices(data || []));
  }, [cast]);

  // 顧客マスタ全件取得
  useEffect(() => {
    supabase
      .from("customers")
      .select("id, name")
      .then(({ data }) => setCustomers(data || []));
  }, []);

  const getCustomerName = (customer_id) => {
    const cust = customers.find(c => c.id === customer_id);
    return cust ? cust.name : "-";
  };

  // 初期データ取得
  useEffect(() => {
    if (!cast) return;
    supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setNotices(data || []));
    supabase
      .from("shifts")
      .select("*")
      .eq("cast_id", cast.id)
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date", { ascending: true })
      .limit(1)
      .then(({ data }) => setNextShift(data?.[0] || null));
    supabase
      .from("salary_targets")
      .select("*")
      .eq("cast_id", cast.id)
      .maybeSingle()
      .then(({ data }) => setSalaryTarget(data?.target || 0));
  }, [cast]);

  // --- 日付リスト取得 ---
  useEffect(() => {
    if (!cast || !selectedMonth) return;
    setSalaryDetails([]);
    setSalarySum(0);

    const year = Number(selectedMonth.slice(0, 4));
    const month = Number(selectedMonth.slice(5, 7));
    const startDate = `${selectedMonth}-01`;
    const endDateObj = new Date(year, month, 0);
    const endDate = `${selectedMonth}-${String(endDateObj.getDate()).padStart(2, "0")}`;

    (async () => {
      const { data, error } = await supabase
        .from("salaries")
        .select("date, final_salary, zappi")
        .eq("cast_id", cast.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });
      if (error || !data) return setSalaryDetails([]);
      const filtered = (data || []).filter(row => row.final_salary !== null);
      setSalaryDetails(filtered);
      setSalarySum(filtered.reduce((a, c) => a + Number(c.final_salary || 0), 0));
    })();
  }, [cast, selectedMonth]);

  // 日付選択時、その日の雑費を取得
  useEffect(() => {
    if (!cast || !selectedDate) {
      setSelectedZappi(0);
      return;
    }
    const detail = salaryDetails.find(s => s.date === selectedDate);
    setSelectedZappi(detail?.zappi || 0);
  }, [selectedDate, salaryDetails]);

  // 予約リストから当日分だけ抽出
  useEffect(() => {
    if (!cast || !selectedDate) {
      setReservations([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("cast_id", cast.id)
        .gte("datetime", `${selectedDate}T00:00:00`)
        .lte("datetime", `${selectedDate}T23:59:59`)
        .order("datetime", { ascending: true });
      setReservations(!error && data ? data : []);
    })();
  }, [cast, selectedDate]);

  // 顧客名クリックでモーダル（顧客個別の自分だけのメモ）
  const handleCustomerClick = async (customer_id) => {
    const cust = customers.find(c => c.id === customer_id);
    setCustomerMemoTarget({ id: customer_id, name: cust?.name || "" });

    // 「自分（cast.id）× この顧客」のメモのみ取得
    const { data: memos } = await supabase
      .from("customer_memos")
      .select("*")
      .eq("customer_id", customer_id)
      .eq("cast_id", cast.id)
      .order("date", { ascending: false });
    setMyCustomerMemos(memos || []);

    // 来店履歴（reservation）も取得
    const { data: history } = await supabase
      .from("reservations")
      .select("*")
      .eq("customer_id", customer_id)
      .eq("cast_id", cast.id)
      .order("datetime", { ascending: false });
    setVisitHistory(history || []);
    setCustomerMemoOpen(true);
  };

  // メモ追加（自分専用テーブルへinsert）
  const handleAddMemo = async () => {
    if (!customerMemoText.trim() || !customerMemoTarget?.id) return;
    await supabase.from("customer_memos").insert([
      { customer_id: customerMemoTarget.id, cast_id: cast.id, text: customerMemoText }
    ]);
    // 再取得
    const { data: memos } = await supabase
      .from("customer_memos")
      .select("*")
      .eq("customer_id", customerMemoTarget.id)
      .eq("cast_id", cast.id)
      .order("date", { ascending: false });
    setMyCustomerMemos(memos || []);
    setCustomerMemoText("");
  };

  const handleCustomerSearch = async () => {
    let customerIds = [];
    // 日付検索（省略可、必要なら残す）
    if (searchDate) {
      const { data: resvs } = await supabase
        .from("reservations")
        .select("customer_id, datetime")
        .eq("cast_id", cast.id)
        .gte("datetime", `${searchDate}T00:00:00`)
        .lte("datetime", `${searchDate}T23:59:59`);
      customerIds = [...new Set(resvs.map(r => r.customer_id))];
    }

    // 顧客名で候補取得
    let query = supabase.from("customers").select("id, name");
    if (searchName) query = query.ilike("name", `%${searchName}%`);
    if (customerIds.length > 0) query = query.in("id", customerIds);
    const { data: customers } = await query;

    // ここで「自分への来店履歴が1件でもある顧客だけ」を抽出
    let filtered = [];
    for (const c of customers || []) {
      const { count } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("cast_id", cast.id)
        .eq("customer_id", c.id);
      if (count > 0) filtered.push(c);
    }

    setSearchResults(filtered);
    setSearched(true);
  };

  // 目標取得・編集
  useEffect(() => {
    if (!cast || !selectedMonth) return;
    const fetchTarget = async () => {
      const { data } = await supabase
        .from("salary_targets")
        .select("*")
        .eq("cast_id", cast.id)
        .eq("month", selectedMonth)
        .maybeSingle()
      setSalaryTarget(data?.target || 0);
      setEditSalaryTarget(data?.target || 0);
    };
    fetchTarget();
  }, [cast, selectedMonth]);

  const handleEditTargetValue = (e) => {
    setEditSalaryTarget(Number(e.target.value));
  };

  const handleSaveTarget = async () => {
    setTargetLoading(true);
    const result = await supabase
      .from("salary_targets")
      .upsert([
        {
          cast_id: cast.id,
          month: selectedMonth,
          target: editSalaryTarget,
          store_id: cast.store_id || "",
          updated_at: new Date().toISOString(),
        }
      ], { onConflict: ['cast_id', 'month'] });

    // result.error でチェック
    if (result.error) {
      alert("保存に失敗しました: " + result.error.message);
      setTargetLoading(false);
      return;
    }
    // 必ずDB値で再セット
    const { data } = await supabase
      .from("salary_targets")
      .select("*")
      .eq("cast_id", cast.id)
      .eq("month", selectedMonth)
      .maybeSingle();
    setSalaryTarget(data?.target || 0);
    setEditSalaryTarget(data?.target || 0);
    setTargetLoading(false);
  };


  // 日記自動生成
  const handleGenerateDiary = async () => {
    setDiaryLoading(true);
    setTimeout(() => setDiaryLoading(false), 1800); // デモ用
  };

  // 当日予約一覧
  const reservationsForSelected = reservations
    ? reservations.filter(r => (r.datetime || "").slice(0, 10) === selectedDate)
    : [];
  // 合計計算
  const totalAmount = reservationsForSelected.reduce(
    (sum, r) => sum + (typeof r.cast_pay === "number" ? r.cast_pay : 0),
    0
  );
  const netAmount = totalAmount - (selectedZappi || 0);

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 3, mb: 5, p: 2 }}>
      <Paper
        elevation={6}
        sx={{
          p: 2,
          mb: 2.5,
          background: "linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 80%)",
          textAlign: "center",
          borderRadius: 4,
          boxShadow: "0 2px 12px #c7d2fe44",
          fontWeight: 900,
          letterSpacing: 1.1,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 900,
            fontSize: 20,
            color: accent,
            letterSpacing: 1.5,
          }}
        >
          {cast?.name || "未取得"} さんのログインページ
        </Typography>
      </Paper>
      {/* お知らせ */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <NotificationsIcon sx={{ color: magenta, mr: 1 }} />
          <Typography fontWeight={700} fontSize={17}>お店からのお知らせ</Typography>
        </Box>
        <List dense>
          {notices.map(n => (
            <ListItem key={n.id}>
              <ListItemText primary={n.title} secondary={n.body} />
            </ListItem>
          ))}
          {notices.length === 0 && <Typography fontSize={15} color="text.secondary">お知らせはありません</Typography>}
        </List>
      </Paper>

      {/* --- 検索UIここから --- */}
      <TextField
        size="small"
        value={searchName}
        onChange={e => setSearchName(e.target.value)}
        label="顧客名"
        sx={{ minWidth: 110 }}
      />
      <TextField
        size="small"
        type="date"
        value={searchDate}
        onChange={e => setSearchDate(e.target.value)}
        sx={{ minWidth: 140 }}
        InputLabelProps={{ shrink: true }}
      />
      <Button
        size="small"
        variant="contained"
        sx={{ bgcolor: cyan, color: "#fff", fontWeight: 700 }}
        onClick={handleCustomerSearch}
      >
        検索
      </Button>
      {searched && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={700} fontSize={16}>顧客検索結果</Typography>
          {searchResults.length === 0 ? (
            <Typography color="text.secondary">データがありません</Typography>
          ) : (
            <List>
              {searchResults.map(c => (
                <ListItemButton key={c.id} onClick={() => handleCustomerClick(c.id)}>
                  <ListItemText primary={c.name} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* 次回出勤予定日 */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", alignItems: "center" }}>
        <EventIcon sx={{ color: cyan, mr: 1 }} />
        <Typography>
          次回出勤予定：
          <span style={{ fontWeight: 700, marginLeft: 8 }}>
            {nextShift ? `${nextShift.date} ${nextShift.start_time}～${nextShift.end_time}` : "未定"}
          </span>
        </Typography>
      </Paper>

      {/* 目標・進捗 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <MonetizationOnIcon sx={{ color: green, fontSize: 29 }} />
          <Typography fontWeight={900} fontSize={19}>給料目標まであと</Typography>
          <TextField
            size="small"
            type="number"
            label="目標額"
            value={editSalaryTarget}
            onChange={handleEditTargetValue}
            sx={{ width: 110, mx: 1 }}
            inputProps={{ min: 0 }}
          />
          <Button
            onClick={handleSaveTarget}
            disabled={targetLoading || editSalaryTarget === salaryTarget}
            variant="contained"
            sx={{ minWidth: 80, bgcolor: cyan, color: "#fff" }}
          >
            {targetLoading ? "保存中..." : "保存"}
          </Button>
          <Typography fontWeight={700} color={cyan}>
            {(salaryTarget - salarySum).toLocaleString()}円
          </Typography>
        </Box>
      </Paper>

      {/* 月選択 */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>月を選択</InputLabel>
          <Select
            value={selectedMonth}
            label="月を選択"
            onChange={e => {
              setSelectedMonth(e.target.value);
              setSelectedDate(null);
            }}
          >
            {monthOpts.map(opt =>
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            )}
          </Select>
        </FormControl>
        <Typography sx={{ fontWeight: 900, fontSize: 17, color: accent }}>
          月間総額給料：<span style={{ fontSize: 22, color: green }}>{salarySum.toLocaleString()}円</span>
        </Typography>
      </Paper>

      {/* 日付リスト */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={900} fontSize={16} mb={1}>日付を選択</Typography>
        <Grid container spacing={1}>
          {salaryDetails.map(row =>
            <Grid item key={row.date}>
              <Button
                variant={selectedDate === row.date ? "contained" : "outlined"}
                color={selectedDate === row.date ? "primary" : "inherit"}
                sx={{ minWidth: 96, mb: 1, fontWeight: 700 }}
                onClick={() => setSelectedDate(row.date)}
              >
                {row.date.slice(8, 10)}日
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* 日別明細（選択時のみ） */}
      {selectedDate && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={900} fontSize={15} mb={1}>
            {selectedDate} の予約一覧
          </Typography>
          {reservationsForSelected.length > 0 ? (
            <>
              {reservationsForSelected.map((r, j) => (
                <Box
                  key={j}
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                    boxShadow: 0,
                    border: "1px solid #e0e7ef"
                  }}
                >
                  <Typography fontWeight={700}>
                    顧客名: <span style={{ color: accent, cursor: "pointer", textDecoration: "underline" }} onClick={() => handleCustomerClick(r.customer_id)}>
                      {getCustomerName(r.customer_id) || "-"}
                    </span>
                  </Typography>
                  <Typography fontSize={14}>コース: {r.course}</Typography>
                  <Typography fontSize={14}>指名: {r.shimei || "-"}</Typography>
                  <Typography fontSize={14}>
                    時間: {r.start_time}～{r.end_time}
                  </Typography>
                  <Typography fontSize={14}>
                    給料: {typeof r.cast_pay === "number" ? r.cast_pay.toLocaleString() : "-"}円
                  </Typography>
                  {r.discount && (
                    <Typography fontSize={14} color="text.secondary">
                      割引: {displayDiscount(r.discount)}
                    </Typography>
                  )}
                </Box>
              ))}
              {/* 合計/雑費/差引 */}
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Typography fontWeight={900} fontSize={17} color={green}>
                  合計：{totalAmount.toLocaleString()}円
                </Typography>
                <Typography fontWeight={700} fontSize={12} >
                  雑費：{(selectedZappi || 0).toLocaleString()}円
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography fontWeight={900} fontSize={18} color={accent}>
                  差引合計：{netAmount.toLocaleString()}円
                </Typography>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary">この日の予約はありません</Typography>
          )}
        </Paper>
      )}

      {/* 写メ日記生成 */}
      {isSStore && (
        <Paper sx={{ p: 2, mb: 2, textAlign: "center" }}>
          <Button
            startIcon={<EditNoteIcon />}
            variant="contained"
            sx={{ bgcolor: accent, fontWeight: 800, fontSize: 17, px: 4 }}
            onClick={handleGenerateDiary}
            disabled={diaryLoading}
          >
            {diaryLoading ? "生成中..." : "写メ日記を自動作成"}
          </Button>
        </Paper>
      )}

      {/* 顧客メモモーダル */}
      <Modal open={customerMemoOpen} onClose={() => setCustomerMemoOpen(false)}>
        <Paper sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", p: 4, minWidth: 380, maxWidth: 520 }}>
          <Typography fontWeight={800} fontSize={18} mb={1}>
            {customerMemoTarget?.name}さんの来店履歴・メモ
          </Typography>

          {/* 来店履歴 */}
          <Typography fontWeight={700} fontSize={16} mt={2}>来店履歴</Typography>
          <List dense sx={{ maxHeight: 160, overflow: "auto", mb: 2 }}>
            {visitHistory.length === 0 && <ListItem><ListItemText primary="来店履歴なし" /></ListItem>}
            {visitHistory.map((v, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={`${v.datetime?.slice(0, 16).replace("T", " ")} コース: ${v.course || ""}`}
                  secondary={`給料: ${v.cast_pay ? v.cast_pay + "円" : "-"} / 指名: ${v.shimei || "-"}${v.discount ? " / 割引:" + displayDiscount(v.discount) : ""}`}
                />
              </ListItem>
            ))}
          </List>

          {/* メモ欄（自分専用） */}
          <Typography fontWeight={700} fontSize={16} mt={2}>メモ</Typography>
          <List dense>
            {myCustomerMemos.length === 0 && <ListItem><ListItemText primary="メモなし" /></ListItem>}
            {myCustomerMemos.map((m, i) => (
              <ListItem key={i}>
                <ListItemText primary={m.text} secondary={m.date} />
              </ListItem>
            ))}
          </List>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={customerMemoText}
            onChange={e => setCustomerMemoText(e.target.value)}
            placeholder="メモを追加"
            sx={{ mb: 2, mt: 1 }}
          />
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ bgcolor: cyan, fontWeight: 800, mb: 1 }}
            onClick={handleAddMemo}
            disabled={!customerMemoText.trim()}
          >
            追加
          </Button>
          <Button fullWidth onClick={() => setCustomerMemoOpen(false)}>閉じる</Button>
        </Paper>
      </Modal>
      <Divider sx={{ my: 4 }} />
      <Button onClick={onLogout} color="error" variant="outlined" fullWidth>ログアウト</Button>
    </Box>
  );
}
