import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Stack, Pagination, Dialog,
  DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, FormHelperText
} from "@mui/material";
import { supabase } from "../lib/supabase";
import { useSettings } from "../SettingsContext";
import UsageHistoryDialog from "../components/UsageHistoryDialog";

// クラス選択肢＆色
const CLASS_OPTIONS = [
  { value: "通常", label: "通常", color: "#e0e7ef" },
  { value: "常連", label: "常連", color: "#38bdf8" },
  { value: "注意", label: "注意", color: "#facc15" },
  { value: "出禁", label: "出禁", color: "#f87171" },
];

// 出勤キャスト取得
async function getShiftCastsByDate(date, storeId, customerId) {
  if (!date || !storeId) return [];
  const { data: shifts } = await supabase
    .from("shifts")
    .select("cast_id")
    .eq("date", date)
    .in("type", ["出勤", "出勤済み", "遅刻", "早退"])
    .eq("is_active", true)
    .eq("store_id", storeId);
  const castIds = (shifts || []).map(row => row.cast_id);
  if (!castIds.length) return [];
  const { data: casts } = await supabase
    .from("casts")
    .select("id, name")
    .in("id", castIds);
  let countMap = {};
  if (customerId) {
    const { data: reservations } = await supabase
      .from("reservations")
      .select("cast_id")
      .eq("customer_id", customerId)
      .in("cast_id", castIds);
    (castIds || []).forEach(id => {
      countMap[id] = (reservations || []).filter(r => r.cast_id === id).length;
    });
  }
  return (casts || []).map(c => ({ ...c, count: countMap[c.id] ?? 0 }));
}

export default function CustomerListPage() {
  const { currentStoreId, staff, menuList, discounts } = useSettings();

  if (!currentStoreId || !staff || !menuList || !discounts) {
    return <Box sx={{ p: 3 }}><Typography>読込中...</Typography></Box>;
  }

  // 各種選択肢
  const courseOptions = useMemo(
    () => (menuList || []).filter(m => m.category === "コース" && m.is_active),
    [menuList]
  );
  const shimeiOptions = useMemo(
    () => (menuList || []).filter(m => m.category === "指名" && m.is_active),
    [menuList]
  );
  const opOptions = useMemo(
    () => (menuList || []).filter(m => m.category === "OP" && m.is_active),
    [menuList]
  );
  const discountOptions = useMemo(
    () => (discounts || []).filter(d => d.is_active),
    [discounts]
  );

  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // 顧客詳細＆編集
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [editDialog, setEditDialog] = useState({
    open: false,
    data: {
      name: "", furigana: "", nickname: "", class: "", phones: [],
      email: "", address: "", comment: "", memo: "", store_id: "", id: "",
    },
    saving: false
  });

  // 利用履歴一覧
  const [historyListDialog, setHistoryListDialog] = useState({ open: false, list: [], loading: false, stats: null });

  // 共通利用履歴ダイアログ
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    mode: "create",
    initialData: {},
    customer: null,
    castOptions: [],
  });

  // 顧客取得
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentStoreId) return;
      let { data } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", currentStoreId)
        .order("id", { ascending: false });
      setCustomers(data || []);
      setFiltered(data || []);
    };
    fetchCustomers();
  }, [currentStoreId]);

  // 検索など
  const handleSearch = () => {
    let list = customers;
    if (keyword) {
      list = list.filter(c =>
        [c.name, c.furigana, c.nickname, c.class, c.email, c.address, c.comment, ...(c.phones || [])]
          .join(",").toLowerCase().includes(keyword.toLowerCase())
      );
    }
    setFiltered(list);
    setPage(1);
  };
  const handleIdSearch = () => {
    if (!customerId) return;
    const list = customers.filter(c => String(c.id) === customerId);
    setFiltered(list);
    setPage(1);
  };
  const handleClear = () => {
    setKeyword("");
    setFiltered(customers);
    setPage(1);
  };

  // 顧客編集の保存
  const handleEditSave = async () => {
    setEditDialog(ed => ({ ...ed, saving: true }));
    const data = editDialog.data;
    const phonesArray = Array.isArray(data.phones)
      ? data.phones.filter((v) => !!v && v !== "")
      : (typeof data.phones === "string" ? data.phones.split(",").map(v => v.trim()).filter(v => v) : []);
    const { error } = await supabase
      .from("customers")
      .update({
        name: data.name,
        furigana: data.furigana,
        nickname: data.nickname,
        class: data.class,
        phones: phonesArray,
        email: data.email,
        address: data.address,
        comment: data.comment,
      })
      .eq("id", data.id);
    if (!error) {
      setEditDialog({ open: false, data: null, saving: false });
      setDetailDialog({ open: false, data: null });
      let { data: refreshed } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", currentStoreId)
        .order("id", { ascending: false });
      setCustomers(refreshed || []);
      setFiltered(refreshed || []);
    } else {
      alert("保存失敗：" + error.message);
      setEditDialog(ed => ({ ...ed, saving: false }));
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!customerId) return;
    if (!window.confirm("本当にこの顧客を削除しますか？")) return;
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);
    if (error) {
      alert("削除に失敗しました: " + error.message);
      return;
    }
    // ダイアログ閉じて再取得
    setDetailDialog({ open: false, data: null });
    let { data: refreshed } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", currentStoreId)
      .order("id", { ascending: false });
    setCustomers(refreshed || []);
    setFiltered(refreshed || []);
  };

  // 利用履歴取得
  const [castMap, setCastMap] = useState({});
  useEffect(() => {
    const fetchCasts = async () => {
      const { data } = await supabase.from("casts").select("id, name");
      if (data) {
        setCastMap(Object.fromEntries(data.map(c => [String(c.id), c.name])));
      }
    };
    fetchCasts();
  }, []);

  const handleOpenHistoryList = async (customerId) => {
    setHistoryListDialog({ open: true, list: [], loading: true, stats: null });
    let { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("customer_id", customerId)
      .order("datetime", { ascending: false });

    const total = (data || []).length;
    const totalAmount = (data || [])
      .filter(r => (r.price || 0) > 0 && (!r.kubun || !r.kubun.includes("キャンセル")))
      .reduce((sum, r) => sum + (r.price || 0), 0);
    const cancelCount = (data || []).filter(r => r.kubun && r.kubun.includes("キャンセル")).length;

    setHistoryListDialog({
      open: true,
      list: data || [],
      loading: false,
      stats: { total, totalAmount, cancelCount }
    });
    if (error) alert("履歴の取得に失敗しました");
  };

  // 履歴新規作成
  const handleOpenCreateHistory = async (customer) => {
    const today = (new Date()).toISOString().slice(0, 10);
    const castOptions = await getShiftCastsByDate(today, currentStoreId, customer.id);
    setHistoryDialog({
      open: true,
      mode: "create",
      initialData: { datetime: today + "T12:00" },
      customer,
      castOptions,
    });
  };

  // 履歴編集時
  const handleOpenEditHistory = async (historyRow) => {
    const dateStr = (historyRow.datetime || "").slice(0, 10);
    const castOptions = await getShiftCastsByDate(dateStr, currentStoreId, historyRow.customer_id);
    setHistoryDialog({
      open: true,
      mode: "edit",
      initialData: { ...historyRow },
      customer: null,
      castOptions,
    });
  };

  // ページ分割
  const pagedList = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // 利用履歴保存時
  const handleUsageHistorySave = async (form) => {
    if (historyDialog.mode === "create") {
      if (!historyDialog.customer) return;
      const { error } = await supabase
        .from("reservations")
        .insert([{
          customer_id: historyDialog.customer.id,
          datetime: form.datetime || null,
          kubun: form.kubun,
          course: form.course,
          shimei: form.shimei,
          shimei_fee: form.shimei_fee || 0,
          op: form.op || [],
          cast_id: form.cast_id || null,
          price: form.price || 0,
          discount: form.discount,
          note: form.note,
          store_id: currentStoreId,
          payment_method: form.payment_method,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          duration: form.duration || 0,
          op_price: form.op_price || 0,
          cast_pay: form.cast_pay || 0,
          op_detail: form.op_detail || [],
          discount_amount: form.discount_amount || 0,
          discount_detail: form.discount_detail || null,
          course_price: form.course_price || 0,
          price_adjust: form.price_adjust ?? 0,
          cast_pay_adjust: form.cast_pay_adjust ?? 0,
        }]);
      if (!error) {
        setHistoryDialog({ open: false, mode: "create", initialData: {}, customer: null, castOptions: [] });
        if (historyListDialog.open && historyDialog.customer)
          handleOpenHistoryList(historyDialog.customer.id);
      } else {
        alert("保存失敗: " + error.message);
      }
    } else {
      // 編集
      const { id } = form;
      const { error } = await supabase
        .from("reservations")
        .update({
          customer_id: form.customer_id, 
          kubun: form.kubun,
          datetime: form.datetime,
          cast_id: form.cast_id,
          course: form.course,
          shimei: form.shimei,
          shimei_fee: form.shimei_fee || 0,
          op: form.op || [],
          discount: form.discount,
          note: form.note,
          price: form.price,
          payment_method: form.payment_method,
          price_adjust: form.price_adjust ?? 0,
          cast_pay_adjust: form.cast_pay_adjust ?? 0,
          cast_pay: form.cast_pay ?? 0,
          op_price: form.op_price ?? 0,
          op_detail: form.op_detail ?? [],
          discount_amount: form.discount_amount ?? 0,
          discount_detail: form.discount_detail ?? null,
          course_price: form.course_price ?? 0,
          duration: form.duration ?? 0,
          start_time: form.start_time ?? null,
          end_time: form.end_time ?? null,
          store_id: form.store_id ?? currentStoreId,
        })
        .eq("id", id);
      if (!error) {
        setHistoryDialog({ open: false, mode: "edit", initialData: {}, customer: null, castOptions: [] });
        if (historyListDialog.open && form.customer_id)
          handleOpenHistoryList(form.customer_id);
      } else {
        alert("保存失敗: " + error.message);
      }
    }
  };

  // ダイアログの日時変更時にもキャスト再取得
  const handleHistoryDialogDateChange = async (newDatetime) => {
    if (!historyDialog.open) return;
    const dateStr = (newDatetime || "").slice(0, 10);
    const customerId = historyDialog.mode === "create"
      ? historyDialog.customer?.id
      : historyDialog.initialData.customer_id;
    const castOptions = await getShiftCastsByDate(dateStr, currentStoreId, customerId);
    setHistoryDialog(hd => ({
      ...hd,
      initialData: { ...hd.initialData, datetime: newDatetime },
      castOptions,
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 検索フィールド */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3} mb={2}>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              placeholder="名前、電話番号、コメント等"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              size="small"
              sx={{ width: 260 }}
            />
            <Button onClick={handleSearch} variant="contained">検索</Button>
            <Button onClick={handleClear} variant="outlined">クリア</Button>
          </Stack>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              placeholder="顧客番号"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              size="small"
              sx={{ width: 120 }}
            />
            <Button onClick={handleIdSearch} variant="contained">読込</Button>
          </Stack>
        </Box>
      </Stack>

      {/* 顧客リスト */}
      <Typography mb={1}>{filtered.length}件が該当しました。</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead sx={{ bgcolor: "#246" }}>
            <TableRow>
              <TableCell sx={{ color: "#fff" }}>顧客番号</TableCell>
              <TableCell sx={{ color: "#fff" }}>名前</TableCell>
              <TableCell sx={{ color: "#fff" }}>フリガナ</TableCell>
              <TableCell sx={{ color: "#fff" }}>ニックネーム</TableCell>
              <TableCell sx={{ color: "#fff" }}>クラス</TableCell>
              <TableCell sx={{ color: "#fff" }}>電話番号</TableCell>
              <TableCell sx={{ color: "#fff" }}>メールアドレス</TableCell>
              <TableCell sx={{ color: "#fff" }}>住所</TableCell>
              <TableCell sx={{ color: "#fff" }}>共有コメント</TableCell>
              <TableCell sx={{ color: "#fff" }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedList.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.furigana || ""}</TableCell>
                <TableCell>{row.nickname || ""}</TableCell>
                <TableCell>
                  {(() => {
                    const option = CLASS_OPTIONS.find(opt => opt.value === row.class);
                    if (!option) return row.class || "";
                    return (
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block",
                          px: 1.4, py: 0.3,
                          borderRadius: 2,
                          bgcolor: option.color,
                          color: "#222",
                          fontWeight: 600,
                          fontSize: 13,
                          minWidth: 48,
                          textAlign: "center"
                        }}
                      >
                        {option.label}
                      </Box>
                    );
                  })()}
                </TableCell>
                <TableCell>{(row.phones || []).join(", ")}</TableCell>
                <TableCell>{row.email || ""}</TableCell>
                <TableCell>{row.address || ""}</TableCell>
                <TableCell>{row.comment || ""}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => setDetailDialog({ open: true, data: row })}>詳細</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Pagination
          count={Math.ceil(filtered.length / rowsPerPage)}
          page={page}
          onChange={(_, v) => setPage(v)}
        />
      </Stack>

      {/* 顧客詳細ダイアログ */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="sm" fullWidth>
        <DialogTitle>顧客詳細</DialogTitle>
        <DialogContent dividers>
          {detailDialog.data && (
            <Stack gap={2}>
              <Typography>顧客番号：{detailDialog.data.id}</Typography>
              <Typography>名前：{detailDialog.data.name}</Typography>
              <Typography>フリガナ：{detailDialog.data.furigana}</Typography>
              <Typography>ニックネーム：{detailDialog.data.nickname}</Typography>
              <Typography>
                クラス：
                {(() => {
                  const option = CLASS_OPTIONS.find(opt => opt.value === detailDialog.data.class);
                  if (!option) return detailDialog.data.class || "";
                  return (
                    <Box component="span" sx={{
                      display: "inline-block", px: 1.2, py: 0.2,
                      borderRadius: 2, bgcolor: option.color, color: "#222", fontWeight: 600, ml: 1
                    }}>
                      {option.label}
                    </Box>
                  );
                })()}
              </Typography>
              <Typography>電話番号：{(detailDialog.data.phones || []).join(", ")}</Typography>
              <Typography>メールアドレス：{detailDialog.data.email}</Typography>
              <Typography>住所：{detailDialog.data.address}</Typography>
              <Typography>共有コメント：{detailDialog.data.comment}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            <Button
              onClick={() => handleOpenCreateHistory(detailDialog.data)}
              variant="outlined"
              color="primary"
              sx={{ mr: 1 }}
            >
              利用履歴の作成
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() =>
                setEditDialog({
                  open: true,
                  data: { ...detailDialog.data },
                  saving: false,
                })
              }
            >
              編集
            </Button>
          </Box>
          <Box>
            <Button onClick={() => setDetailDialog({ open: false, data: null })}>閉じる</Button>
            {detailDialog.data && (
              <Button
                onClick={() => handleOpenHistoryList(detailDialog.data.id)}
                variant="outlined"
                sx={{ ml: 1 }}
              >
                利用履歴
              </Button>
            )}
            {detailDialog.data && (
              <Button
                onClick={() => handleDeleteCustomer(detailDialog.data.id)}
                color="error"
                variant="contained"
                sx={{ ml: 1 }}
              >
                削除
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* 顧客編集ダイアログ */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, data: null, saving: false })} maxWidth="sm" fullWidth>
        <DialogTitle>顧客編集</DialogTitle>
        <DialogContent dividers>
          {editDialog.data && (
            <Stack gap={2}>
              <TextField label="名前" value={editDialog.data.name || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, name: e.target.value } }))} fullWidth />
              <TextField label="フリガナ" value={editDialog.data.furigana || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, furigana: e.target.value } }))} fullWidth />
              <TextField label="ニックネーム" value={editDialog.data.nickname || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, nickname: e.target.value } }))} fullWidth />
              <FormControl fullWidth>
                <InputLabel>クラス</InputLabel>
                <Select
                  label="クラス"
                  value={editDialog.data.class || ""}
                  onChange={e =>
                    setEditDialog(ed => ({
                      ...ed,
                      data: { ...ed.data, class: e.target.value }
                    }))
                  }
                >
                  {CLASS_OPTIONS.map(opt => (
                    <MenuItem value={opt.value} key={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="電話番号（カンマ区切り）"
                value={Array.isArray(editDialog.data.phones) ? editDialog.data.phones.join(", ") : ""}
                onChange={e => setEditDialog(ed => ({
                  ...ed,
                  data: { ...ed.data, phones: e.target.value.split(",").map(v => v.trim()).filter(v => v) }
                }))}
                fullWidth
              />
              <TextField label="メールアドレス" value={editDialog.data.email || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, email: e.target.value } }))} fullWidth />
              <TextField label="住所" value={editDialog.data.address || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, address: e.target.value } }))} fullWidth />
              <TextField label="共有コメント" value={editDialog.data.comment || ""} onChange={e => setEditDialog(ed => ({ ...ed, data: { ...ed.data, comment: e.target.value } }))} fullWidth multiline minRows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null, saving: false })}>キャンセル</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={editDialog.saving}>
            {editDialog.saving ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 利用履歴一覧ダイアログ */}
      <Dialog open={historyListDialog.open} onClose={() => setHistoryListDialog({ open: false, list: [], loading: false, stats: null })} maxWidth="md" fullWidth>
        <DialogTitle>利用履歴</DialogTitle>
        <DialogContent dividers>
          {historyListDialog.loading ? (
            <Typography>読み込み中...</Typography>
          ) : (
            <>
              <Stack direction="row" spacing={4} mb={2}>
                <Typography>
                  <b>総利用回数：</b>{historyListDialog.stats?.total || 0}回
                </Typography>
                <Typography>
                  <b>総利用額：</b>¥{(historyListDialog.stats?.totalAmount || 0).toLocaleString()}
                </Typography>
                <Typography>
                  <b>キャンセル：</b>{historyListDialog.stats?.cancelCount || 0}回
                </Typography>
              </Stack>
              {historyListDialog.list.length === 0 ? (
                <Typography color="text.secondary">利用履歴がありません</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>利用日</TableCell>
                      <TableCell>区分</TableCell>
                      <TableCell>コース</TableCell>
                      <TableCell>指名</TableCell>
                      <TableCell>キャスト</TableCell>
                      <TableCell>金額</TableCell>
                      <TableCell>メモ</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyListDialog.list.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.datetime?.replace("T", " ").slice(0, 16)}</TableCell>
                        <TableCell>{row.kubun}</TableCell>
                        <TableCell>{row.course}</TableCell>
                        <TableCell>{row.shimei}</TableCell>
                        <TableCell>
                          {row.cast || castMap[row.cast_id] || ""}
                        </TableCell>
                        <TableCell>¥{row.price?.toLocaleString?.() || ""}</TableCell>
                        <TableCell>{row.note}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleOpenEditHistory(row)}
                          >
                            編集
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryListDialog({ open: false, list: [], loading: false, stats: null })}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* 利用履歴作成・編集 */}
      <UsageHistoryDialog
        open={historyDialog.open}
        mode={historyDialog.mode}
        initialData={historyDialog.initialData}
        onSave={handleUsageHistorySave}
        onClose={() => setHistoryDialog({ open: false, mode: "create", initialData: {}, customer: null, castOptions: [] })}
        castOptions={historyDialog.castOptions}
        courseOptions={courseOptions}
        shimeiOptions={shimeiOptions}
        opOptions={opOptions}
        discountOptions={discountOptions} 
        historyList={historyListDialog.list}
        onDateChange={handleHistoryDialogDateChange}
      />
    </Box>
  );
}
