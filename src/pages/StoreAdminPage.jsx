import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, TextField, Button, Table, TableHead, TableRow, TableCell,
  TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Paper, Stack, Chip, Tooltip, CircularProgress
} from "@mui/material";
import { Edit, Delete, LocationOn, CloudDownload, Add } from "@mui/icons-material";
import { supabase } from "../lib/supabase";

// 都道府県リスト
const PREFECTURES = [
  "", "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県"
];
const RANKS = [ "C", "B", "A", "S" ];

export default function StoreAdminPage({ onLogout }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStore, setNewStore] = useState({
    store_id: "", password: "", name: "", series: "",
    prefecture: "", city: "", type: "", manager: "", tel: "", status: "公開",
    rank: "C", memo: ""  // ←ここにmemo追加
  });
  const [editIdx, setEditIdx] = useState(-1);
  const [editStore, setEditStore] = useState({ ...newStore });
  const [keyword, setKeyword] = useState("");
  const [filterPref, setFilterPref] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRank, setFilterRank] = useState("");
  const [detail, setDetail] = useState(null);

  // --- データ取得 ---
  useEffect(() => {
    async function fetchStores() {
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("registered_at", { ascending: false });
      if (!error) setStores(data || []);
      setLoading(false);
    }
    fetchStores();
  }, []);

  // 追加
  const addStore = async () => {
    if (!newStore.store_id || !newStore.password || !newStore.name) return;
    // 重複チェック
    if (stores.some(s => s.store_id === newStore.store_id)) {
      alert("その店舗IDは既に登録済みです");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("stores").insert([newStore]);
    if (error) {
      alert("登録失敗: " + error.message);
    } else {
      // 再取得
      const { data } = await supabase.from("stores").select("*").order("registered_at", { ascending: false });
      setStores(data || []);
      setNewStore({
        store_id: "", password: "", name: "", series: "",
        prefecture: "", city: "", type: "", manager: "", tel: "", status: "公開",
        rank: "C", memo: ""
      });
    }
    setLoading(false);
  };

  // 編集保存
  const saveEdit = async () => {
    if (!editStore.store_id || !editStore.password || !editStore.name) return;
    if (stores.some((s, i) => i !== editIdx && s.store_id === editStore.store_id)) {
      alert("その店舗IDは既に登録済みです");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("stores")
      .update(editStore)
      .eq("store_id", editStore.store_id);
    if (error) {
      alert("保存失敗: " + error.message);
    } else {
      const { data } = await supabase.from("stores").select("*").order("registered_at", { ascending: false });
      setStores(data || []);
      setEditIdx(-1);
      setEditStore({ ...newStore });
    }
    setLoading(false);
  };

  // 削除
  const delStore = async (store_id) => {
    if (!window.confirm("本当に削除しますか？")) return;
    setLoading(true);
    await supabase.from("stores").delete().eq("store_id", store_id);
    const { data } = await supabase.from("stores").select("*").order("registered_at", { ascending: false });
    setStores(data || []);
    setLoading(false);
  };

  // CSV出力
  const handleExportCSV = () => {
    const header = [
      "店舗ID","パスワード","店舗名","系列","都道府県","市区町村","種別","担当者","電話","ステータス","ランク","登録日","備考・メモ"
    ];
    const rows = stores.map(s => [
      s.store_id, s.password, s.name, s.series, s.prefecture, s.city, s.type, s.manager, s.tel, s.status, s.rank, (s.registered_at || "").slice(0,10), s.memo || ""
    ]);
    const csv = [header, ...rows].map(a => a.join(",")).join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stores.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // 検索・フィルタ
  const filteredStores = useMemo(() => stores.filter(s =>
    (!filterPref || s.prefecture === filterPref) &&
    (!filterStatus || s.status === filterStatus) &&
    (!filterRank || s.rank === filterRank) &&
    (!keyword || (s.name && s.name.includes(keyword)) || (s.city && s.city.includes(keyword)))
  ), [stores, filterPref, filterStatus, filterRank, keyword]);

  // カラー
  const statusColor = status =>
    status === "公開" ? "success" : status === "停止" ? "warning" : "default";
  const rankColor = rank =>
    rank === "C" ? "default" : rank === "B" ? "info" : rank === "A" ? "secondary" : "success";

  return (
    <Box p={3} sx={{ maxWidth: 1300, mx: "auto" }}>
      <Typography variant="h4" fontWeight={900} mb={3}>全国 店舗管理</Typography>
      <Button
        variant="outlined"
        sx={{ position: "absolute", right: 40, top: 32 }}
        onClick={onLogout}
      >ログアウト</Button>
      {/* 検索・絞り込み */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Select value={filterPref || ""} onChange={e => setFilterPref(e.target.value)} size="small" sx={{ minWidth: 120 }}>
          {PREFECTURES.map(p => <MenuItem key={p} value={p}>{p || "都道府県"}</MenuItem>)}
        </Select>
        <Select value={filterStatus || ""} onChange={e => setFilterStatus(e.target.value)} size="small" sx={{ minWidth: 110 }}>
          <MenuItem value="">全ステータス</MenuItem>
          <MenuItem value="公開">公開</MenuItem>
          <MenuItem value="停止">停止</MenuItem>
        </Select>
        <Select value={filterRank || ""} onChange={e => setFilterRank(e.target.value)} size="small" sx={{ minWidth: 110 }}>
          <MenuItem value="">全ランク</MenuItem>
          {RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Select>
        <TextField
          placeholder="店舗名・市区町村"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <Button
          startIcon={<CloudDownload />}
          color="info"
          variant="outlined"
          sx={{ ml: "auto" }}
          onClick={handleExportCSV}
          disabled={false}
        >
          CSV出力
        </Button>
      </Paper>
      {/* 新規追加 */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        <TextField label="店舗ID" value={newStore.store_id} onChange={e => setNewStore(s => ({ ...s, store_id: e.target.value }))} size="small" />
        <TextField label="パスワード" value={newStore.password} onChange={e => setNewStore(s => ({ ...s, password: e.target.value }))} size="small" />
        <TextField label="店舗名" value={newStore.name} onChange={e => setNewStore(s => ({ ...s, name: e.target.value }))} size="small" />
        <TextField label="系列" value={newStore.series} onChange={e => setNewStore(s => ({ ...s, series: e.target.value }))} size="small" />
        <Select label="都道府県" value={newStore.prefecture || ""} onChange={e => setNewStore(s => ({ ...s, prefecture: e.target.value }))} size="small" sx={{ minWidth: 110 }}>
          {PREFECTURES.map(p => <MenuItem key={p} value={p}>{p || "都道府県"}</MenuItem>)}
        </Select>
        <TextField label="市区町村" value={newStore.city} onChange={e => setNewStore(s => ({ ...s, city: e.target.value }))} size="small" />
        <TextField label="種別" value={newStore.type} onChange={e => setNewStore(s => ({ ...s, type: e.target.value }))} size="small" placeholder="例: ソープ/手コキ" />
        <TextField label="担当者" value={newStore.manager} onChange={e => setNewStore(s => ({ ...s, manager: e.target.value }))} size="small" />
        <TextField label="電話" value={newStore.tel} onChange={e => setNewStore(s => ({ ...s, tel: e.target.value }))} size="small" />
        <Select label="ステータス" value={newStore.status || "公開"} onChange={e => setNewStore(s => ({ ...s, status: e.target.value }))} size="small" sx={{ minWidth: 90 }}>
          <MenuItem value="公開">公開</MenuItem>
          <MenuItem value="停止">停止</MenuItem>
        </Select>
        <Select label="ランク" value={newStore.rank || "C"} onChange={e => setNewStore(s => ({ ...s, rank: e.target.value }))} size="small" sx={{ minWidth: 110 }}>
          {RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Select>
        <TextField
          label="備考・メモ"
          value={newStore.memo}
          onChange={e => setNewStore(s => ({ ...s, memo: e.target.value }))}
          size="small"
          sx={{ minWidth: 180, width: 240 }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={addStore}>追加</Button>
      </Box>
      {/* 一覧 */}
      {loading ? (
        <Box py={7} textAlign="center"><CircularProgress /></Box>
      ) : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>店舗ID</TableCell>
            <TableCell>パスワード</TableCell>
            <TableCell>店舗名</TableCell>
            <TableCell>都道府県</TableCell>
            <TableCell>市区町村</TableCell>
            <TableCell>系列</TableCell>
            <TableCell>種別</TableCell>
            <TableCell>担当</TableCell>
            <TableCell>電話</TableCell>
            <TableCell>ランク</TableCell>
            <TableCell>登録日</TableCell>
            <TableCell>ステータス</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredStores.map((row, idx) => (
            <TableRow key={row.store_id} hover>
              <TableCell>{row.store_id}</TableCell>
              <TableCell>{row.password}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocationOn sx={{ color: "#00bcd4" }} fontSize="small" />
                  <span style={{ fontWeight: 700, cursor: "pointer" }}
                    onClick={() => setDetail(row)}
                  >{row.name}</span>
                </Stack>
              </TableCell>
              <TableCell>{row.prefecture}</TableCell>
              <TableCell>{row.city}</TableCell>
              <TableCell>{row.series}</TableCell>
              <TableCell>{row.type}</TableCell>
              <TableCell>{row.manager}</TableCell>
              <TableCell>{row.tel}</TableCell>
              <TableCell>
                <Chip label={row.rank || "C"} color={rankColor(row.rank)} size="small" onClick={() => {}}/>
              </TableCell>
              <TableCell>{row.registered_at?.slice(0,10) || ""}</TableCell>
              <TableCell>
                <Chip label={row.status || "—"} color={statusColor(row.status)} size="small" onClick={() => {}}/>
              </TableCell>
              <TableCell>
                <Tooltip title="編集">
                  <IconButton onClick={() => { setEditIdx(idx); setEditStore(row); }}>
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="削除">
                  <IconButton onClick={() => delStore(row.store_id)} color="error">
                    <Delete />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
      {/* 編集ダイアログ */}
      <Dialog open={editIdx >= 0} onClose={() => setEditIdx(-1)}>
        <DialogTitle>店舗編集</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ minWidth: 350 }}>
            <TextField label="店舗ID" value={editStore.store_id} onChange={e => setEditStore(s => ({ ...s, store_id: e.target.value }))} fullWidth />
            <TextField label="パスワード" value={editStore.password} onChange={e => setEditStore(s => ({ ...s, password: e.target.value }))} fullWidth />
            <TextField label="店舗名" value={editStore.name} onChange={e => setEditStore(s => ({ ...s, name: e.target.value }))} fullWidth />
            <TextField label="系列" value={editStore.series} onChange={e => setEditStore(s => ({ ...s, series: e.target.value }))} fullWidth />
            <Select label="都道府県" value={editStore.prefecture || ""} onChange={e => setEditStore(s => ({ ...s, prefecture: e.target.value }))} fullWidth size="small">
              {PREFECTURES.map(p => <MenuItem key={p} value={p}>{p || "都道府県"}</MenuItem>)}
            </Select>
            <TextField label="市区町村" value={editStore.city} onChange={e => setEditStore(s => ({ ...s, city: e.target.value }))} fullWidth />
            <TextField label="種別" value={editStore.type} onChange={e => setEditStore(s => ({ ...s, type: e.target.value }))} fullWidth />
            <TextField label="担当者" value={editStore.manager} onChange={e => setEditStore(s => ({ ...s, manager: e.target.value }))} fullWidth />
            <TextField label="電話" value={editStore.tel} onChange={e => setEditStore(s => ({ ...s, tel: e.target.value }))} fullWidth />
            <Select label="ステータス" value={editStore.status || "公開"} onChange={e => setEditStore(s => ({ ...s, status: e.target.value }))} fullWidth size="small">
              <MenuItem value="公開">公開</MenuItem>
              <MenuItem value="停止">停止</MenuItem>
            </Select>
            <Select label="ランク" value={editStore.rank || "C"} onChange={e => setEditStore(s => ({ ...s, rank: e.target.value }))} fullWidth size="small">
              {RANKS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
            <TextField
              label="備考・メモ"
              value={editStore.memo || ""}
              onChange={e => setEditStore(s => ({ ...s, memo: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditIdx(-1)}>キャンセル</Button>
          <Button onClick={saveEdit} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
      {/* 詳細ダイアログ */}
      <Dialog open={!!detail} onClose={() => setDetail(null)}>
        <DialogTitle>店舗詳細</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2}>
            <Typography>店舗名: {detail?.name}</Typography>
            <Typography>店舗ID: {detail?.store_id}</Typography>
            <Typography>パスワード: {detail?.password}</Typography>
            <Typography>都道府県: {detail?.prefecture}</Typography>
            <Typography>市区町村: {detail?.city}</Typography>
            <Typography>系列: {detail?.series}</Typography>
            <Typography>種別: {detail?.type}</Typography>
            <Typography>担当者: {detail?.manager}</Typography>
            <Typography>電話: {detail?.tel}</Typography>
            <Typography>登録日: {detail?.registered_at?.slice(0,10)}</Typography>
            <Typography>ステータス: {detail?.status}</Typography>
            <Typography>ランク: {detail?.rank}</Typography>
            <Typography>備考・メモ: {detail?.memo || ""}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
