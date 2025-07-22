import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  IconButton, Paper
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import UsageHistoryDialog from "./UsageHistoryDialog";
import { useSettings } from "../SettingsContext";

// 支払い方法を日本語化
const paymentLabels = {
  cash: "現金",
  card: "カード",
  paypay: "PayPay"
};

export default function ReservationHistoryList({ date, storeId }) {
  const { staff, menuList } = useSettings();

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

  // 🔽 割引はdiscountsテーブルから取得
  const [discounts, setDiscounts] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("discounts")
        .select("*")
        .eq("is_active", true);
      setDiscounts(data || []);
    })();
  }, []);
  const discountOptions = useMemo(() => (discounts || []).filter(d => d.is_active), [discounts]);

  const [rows, setRows] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [castsMap, setCastsMap] = useState({});
  const [loading, setLoading] = useState(false);

  // 利用履歴編集ダイアログ
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    mode: "edit",
    initialData: {},
    castOptions: [],
  });

  // キャスト一覧・マップ取得
  useEffect(() => {
    const fetchCasts = async () => {
      const { data } = await supabase.from("casts").select("id, name");
      if (data) {
        setCastsMap(Object.fromEntries(data.map(c => [String(c.id), c.name])));
      }
    };
    fetchCasts();
  }, []);

  // データ取得＋顧客名マッピング
  useEffect(() => {
    if (!date || !storeId) return;
    setLoading(true);
    (async () => {
      const start = date + "T00:00:00";
      const end = date + "T23:59:59";
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", storeId)
        .gte("datetime", start)
        .lte("datetime", end)
        .order("datetime", { ascending: true });

      // 顧客ID一覧
      const customerIds = [...new Set((reservations || []).map(r => r.customer_id).filter(Boolean))];
      let customersMap = {};
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id, name");
        customersMap = Object.fromEntries((customers || []).map(c => [c.id, c.name]));
      }
      setCustomersMap(customersMap);
      setRows(reservations || []);
      setLoading(false);
    })();
  }, [date, storeId]);

  // 編集ボタン
  const handleEdit = async (row) => {
    const dateStr = (row.datetime || "").slice(0, 10);
    // その日の出勤キャスト
    const { data: shifts } = await supabase
      .from("shifts")
      .select("cast_id")
      .eq("date", dateStr)
      .in("type", ["出勤", "出勤済み", "遅刻", "早退"])
      .eq("is_active", true)
      .eq("store_id", storeId);

    const castIds = (shifts || []).map(row => row.cast_id);

    // その顧客と各キャストの予約
    const { data: allReservations } = await supabase
      .from("reservations")
      .select("cast_id, customer_id")
      .eq("customer_id", row.customer_id);

    // キャスト名取得
    const { data: casts } = await supabase
      .from("casts")
      .select("id, name")
      .in("id", castIds);

    // キャストごとのカウント
    const countMap = {};
    (castIds || []).forEach(cid => {
      countMap[cid] = (allReservations || []).filter(r => String(r.cast_id) === String(cid)).length;
    });

    // キャスト名＋回数
    const castOptions = (casts || []).map(c => ({
      id: c.id,
      name: c.name,
      count: countMap[c.id] ?? 0
    }));

    setHistoryDialog({
      open: true,
      mode: "edit",
      initialData: { ...row }, // ←cast_pay_adjust もここで入る
      castOptions,
    });
  };

  // 保存処理（修正ポイント）
  const handleUsageHistorySave = async (form) => {
    const { id } = form;
    const discountDetail = Array.isArray(form.discount)
      ? form.discount.map(dcode => {
        const d = discountOptions.find(opt => opt.code === dcode);
        return d
          ? {
            code: d.code,
            amount: Number(d.amount || 0),
            cast_pay_delta: Number(d.cast_pay_delta || 0),
            name: d.label || d.code,
          }
          : null;
      }).filter(Boolean)
      : [];

    // 割引合計額
    const discountAmount = discountDetail.reduce((sum, d) => sum + (d.amount || 0), 0);

    // 保存データを作成（ここにdiscount_detailを必ず含める！）
    const updateObj = {
      kubun: form.kubun,
      datetime: form.datetime,
      cast_id: form.cast_id,
      course: form.course,
      shimei: form.shimei,
      shimei_fee: form.shimei_fee || 0,
      op: form.op || [],
      op_detail: form.op_detail || [],
      discount: Array.isArray(form.discount) ? form.discount : [form.discount],
      note: form.note,
      price: form.price,
      payment_method: form.payment_method,
      price_adjust: form.price_adjust ?? 0,
      cast_pay_adjust: form.cast_pay_adjust ?? 0,
      cast_pay: form.cast_pay,
      discount_detail: discountDetail, // ★これを必ず追加！
      discount_amount: discountAmount,
    };

    // 型と中身を確認（デバッグ用）
    console.log("typeof discount_detail", typeof updateObj.discount_detail, Array.isArray(updateObj.discount_detail), updateObj.discount_detail);

    const { error } = await supabase
      .from("reservations")
      .update(updateObj)
      .eq("id", id);
    if (!error) {
      setRows(rows => rows.map(r => r.id === id ? { ...r, ...updateObj } : r));
      setHistoryDialog({ open: false, mode: "edit", initialData: {}, castOptions: [] });
    } else {
      alert("保存失敗: " + error.message);
    }
  };

  // 日付変更時（キャスト回数付きリストを再生成）
  const handleHistoryDialogDateChange = async (newDatetime) => {
    if (!historyDialog.open) return;
    const dateStr = (newDatetime || "").slice(0, 10);

    const { data: shifts } = await supabase
      .from("shifts")
      .select("cast_id")
      .eq("date", dateStr)
      .in("type", ["出勤", "出勤済み", "遅刻", "早退"])
      .eq("is_active", true)
      .eq("store_id", storeId);

    const castIds = (shifts || []).map(row => row.cast_id);

    const { data: allReservations } = await supabase
      .from("reservations")
      .select("cast_id");

    const { data: casts } = await supabase
      .from("casts")
      .select("id, name")
      .in("id", castIds);

    const countMap = {};
    (castIds || []).forEach(cid => {
      countMap[cid] = (allReservations || []).filter(r => String(r.cast_id) === String(cid)).length;
    });

    const castOptions = (casts || []).map(c => ({
      id: c.id,
      name: c.name,
      count: countMap[c.id] ?? 0
    }));

    setHistoryDialog(hd => ({
      ...hd,
      castOptions,
      initialData: { ...hd.initialData, datetime: newDatetime }
    }));
  };

  // --- OP欄整形 ---
  const formatOp = (op, op_detail) => {
    // op_detailがあれば名前だけカンマ区切りで表示
    if (Array.isArray(op_detail) && op_detail.length > 0) {
      return op_detail.map(o => o.name).join(", ");
    }
    // なければ従来通り
    if (!op || (Array.isArray(op) && op.length === 0)) return "";
    if (typeof op === "string") {
      try {
        const arr = JSON.parse(op);
        if (Array.isArray(arr)) return arr.join(", ");
        return op;
      } catch {
        return op;
      }
    }
    if (Array.isArray(op)) return op.join(", ");
    return "";
  };

  // テーブル配色
  const tableHeadSx = { bgcolor: "#f5f8fa", fontWeight: 700, color: "#3db7b4", fontSize: 15 };
  const tableBodySx = idx => ({
    bgcolor: idx % 2 === 0 ? "#fff" : "#f9fafb"
  });

  return (
    <Box sx={{ width: "100%", overflowX: "auto", bgcolor: "#fff", p: 2, borderRadius: 3, boxShadow: 1 }}>
      <Typography variant="h6" fontWeight={800} mb={2} color="#3db7b4">
        履歴一覧（{date}）
      </Typography>
      <Paper sx={{ minWidth: 1200, overflowX: "auto", borderRadius: 2, boxShadow: 0 }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeadSx}>顧客名</TableCell>
              <TableCell sx={tableHeadSx}>区分</TableCell>
              <TableCell sx={tableHeadSx}>日時</TableCell>
              <TableCell sx={tableHeadSx}>キャスト</TableCell>
              <TableCell sx={tableHeadSx}>コース</TableCell>
              <TableCell sx={tableHeadSx}>指名</TableCell>
              <TableCell sx={tableHeadSx}>金額</TableCell>
              <TableCell sx={tableHeadSx}>割引</TableCell>
              <TableCell sx={tableHeadSx}>OP</TableCell>
              <TableCell sx={tableHeadSx}>支払方法</TableCell>
              <TableCell sx={tableHeadSx}>備考</TableCell>
              <TableCell sx={tableHeadSx}>編集</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.id} sx={tableBodySx(idx)}>
                <TableCell>
                  {customersMap[row.customer_id] || ""}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: row.kubun === "成約" ? "#2da36a" : row.kubun === "キャンセル" ? "#f36b92" : "#666" }}>
                  {row.kubun}
                </TableCell>
                <TableCell>{format(new Date(row.datetime), "yyyy-MM-dd HH:mm")}</TableCell>
                {/* 一覧にはキャスト名だけ（回数は表示しない） */}
                <TableCell>
                  {row.cast_id && castsMap[row.cast_id]
                    ? castsMap[row.cast_id]
                    : ""}
                </TableCell>
                <TableCell>{row.course}</TableCell>
                <TableCell>{row.shimei}</TableCell>
                <TableCell>{row.price}</TableCell>
                <TableCell>
                  {Array.isArray(row.discount)
                    ? row.discount.join(", ")
                    : (() => {
                      try {
                        // JSON文字列なら配列化してjoin
                        const arr = JSON.parse(row.discount);
                        return Array.isArray(arr) ? arr.join(", ") : row.discount;
                      } catch {
                        return row.discount || "";
                      }
                    })()
                  }
                </TableCell>
                <TableCell>
                  {formatOp(row.op, row.op_detail)}
                </TableCell>
                <TableCell>
                  {paymentLabels[row.payment_method || row.payment_met] || ""}
                </TableCell>
                <TableCell>{row.note}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(row)}>
                    <EditNoteIcon sx={{ color: "#3db7b4" }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ color: "#aaa" }}>
                  {loading ? "読み込み中..." : "履歴がありません"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* 利用履歴編集ダイアログ */}
      <UsageHistoryDialog
        open={historyDialog.open}
        mode={historyDialog.mode}
        initialData={historyDialog.initialData}
        onSave={handleUsageHistorySave}
        onClose={() => setHistoryDialog({ open: false, mode: "edit", initialData: {}, castOptions: [] })}
        castOptions={historyDialog.castOptions}
        courseOptions={courseOptions}
        shimeiOptions={shimeiOptions}
        opOptions={opOptions}
        discountOptions={discountOptions}
        historyList={rows}
        onDateChange={handleHistoryDialogDateChange}
      />
    </Box>
  );
}
