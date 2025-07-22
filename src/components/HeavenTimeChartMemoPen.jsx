import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, MenuItem, Tooltip, Select, FormControl, InputLabel, Alert
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { useSettings } from "../SettingsContext";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import ja from "date-fns/locale/ja";
import { supabase } from "../lib/supabase";
import UsageHistoryDialog from "./UsageHistoryDialog";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorIcon from "@mui/icons-material/Error";
import BlockIcon from "@mui/icons-material/Block";


const statusProps = {
  出勤済み: {
    color: "linear-gradient(90deg,#2ee59d 0%,#38d9f1 100%)",
    icon: <CheckCircleIcon sx={{ fontSize: 18, color: "#fff" }} />,
    label: "出勤済み",
  },
  遅刻: {
    color: "linear-gradient(90deg,#facc15 0%,#fda085 100%)",
    icon: <AccessTimeIcon sx={{ fontSize: 18, color: "#fff" }} />,
    label: "遅刻",
  },
  早退: {
    color: "linear-gradient(90deg,#38bdf8 0%,#7afcff 100%)",
    icon: <AccessTimeIcon sx={{ fontSize: 18, color: "#fff" }} />,
    label: "早退",
  },
  当日欠勤: {
    color: "linear-gradient(90deg,#f87171 0%,#fda085 100%)",
    icon: <BlockIcon sx={{ fontSize: 18, color: "#fff" }} />,
    label: "欠勤",
  },
  未設定: {
    color: "linear-gradient(90deg,#e0e7ef 0%,#d3d3d3 100%)",
    icon: <ErrorIcon sx={{ fontSize: 18, color: "#999" }} />,
    label: "未設定",
  },
};

// 定数
const GRID_WIDTH = 40;
const ROW_HEIGHT = 76;
const AVATAR_WIDTH = 300;

// クラス選択肢
const CLASS_OPTIONS = [
  { value: "通常", label: "通常", color: "#e0e7ef" },
  { value: "常連", label: "常連", color: "#38bdf8" },
  { value: "注意", label: "注意", color: "#facc15" },
  { value: "出禁", label: "出禁", color: "#f87171" },
];

// 時間変換
function toMinutes(t) {
  if (!t) return 0;
  let [h, m] = (t || "00:00").split(":").map(Number);
  if (t === "00:00") h = 24;
  return h * 60 + (m || 0);
}

// 出勤キャスト
async function getShiftCastsByDate(date, storeId, staff) {
  if (!date || !storeId) return [];
  const { data: shifts } = await supabase
    .from("shifts")
    .select("cast_id")
    .eq("date", date)
    .in("type", ["出勤", "当日欠勤", "出勤済み", "遅刻", "早退"])
    .eq("is_active", true)
    .eq("store_id", storeId);
  const castIds = (shifts || []).map(row => row.cast_id);
  if (!castIds.length) return [];
  return (staff || []).filter(s => castIds.includes(s.id) && s.role === "キャスト" && s.isActive);
}

// ---- 既存顧客ダイアログ（重複時専用） ----
function CustomerDetailDialog({
  open,
  data,
  onClose,
  onCreateHistory,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>既存顧客の詳細</DialogTitle>
      <DialogContent dividers>
        <Typography color="error" sx={{ fontWeight: 700, mb: 2 }}>
          この電話番号は既に登録されています。内容をご確認ください。
        </Typography>
        {data && (
          <Stack gap={2}>
            <Typography>顧客番号：{data.id}</Typography>
            <Typography>名前：{data.name}</Typography>
            <Typography>フリガナ：{data.furigana}</Typography>
            <Typography>ニックネーム：{data.nickname}</Typography>
            <Typography>クラス：{data.class}</Typography>
            <Typography>電話番号：{(data.phones || []).join(", ")}</Typography>
            <Typography>メールアドレス：{data.email}</Typography>
            <Typography>住所：{data.address}</Typography>
            <Typography>共有コメント：{data.comment}</Typography>
            <Typography>メモ：{data.memo}</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-start", px: 3, pb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            onClose();
            onCreateHistory && onCreateHistory(data);
          }}
        >
          利用履歴の作成
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- 顧客ダイアログ（新規・編集共通） ----
function CustomerEditDialog({ open, data, mode, onClose, onSaved, storeId, setExistCustomerDialog }) {
  const [form, setForm] = useState({
    name: "", furigana: "", nickname: "", class: "", phones: "",
    email: "", address: "", comment: "", memo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && data) {
      setForm({
        name: data.name || "",
        furigana: data.furigana || "",
        nickname: data.nickname || "",
        class: data.class || "",
        phones: Array.isArray(data.phones) ? data.phones.join(", ") : (data.phones || ""),
        email: data.email || "",
        address: data.address || "",
        comment: data.comment || "",
        memo: data.memo || "",
      });
      setSaving(false);
    } else if (open && !data) {
      setForm({
        name: "", furigana: "", nickname: "", class: "", phones: "",
        email: "", address: "", comment: "", memo: "",
      });
      setSaving(false);
    }
  }, [open, data]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("名前は必須です");
      return;
    }
    setSaving(true);
    const phonesArray = form.phones
      ? form.phones.split(",").map(v => v.trim()).filter(v => v)
      : [];
    // 重複チェック
    let existList = [];
    for (const phone of phonesArray) {
      const { data: exists } = await supabase
        .from("customers")
        .select("*")
        .eq("store_id", storeId)
        .contains("phones", [phone]);
      if (exists && exists.length > 0) {
        // 編集モードの時は自分自身はスキップ
        if (mode === "edit" && exists.some(e => e.id === data.id)) continue;
        existList = exists;
        break;
      }
    }
    if (existList.length > 0) {
      setExistCustomerDialog({ open: true, data: existList[0] });
      setSaving(false);
      return;
    }

    let result = {};
    if (mode === "edit" && data.id) {
      const { error } = await supabase
        .from("customers")
        .update({
          name: form.name, furigana: form.furigana, nickname: form.nickname,
          class: form.class, phones: phonesArray, email: form.email,
          address: form.address, comment: form.comment, memo: form.memo
        })
        .eq("id", data.id);
      if (error) {
        alert("保存に失敗しました: " + error.message);
        setSaving(false);
        return;
      }
      const { data: refreshed } = await supabase.from("customers").select("*").eq("id", data.id).single();
      result = refreshed;
    } else {
      const { error, data: inserted } = await supabase
        .from("customers")
        .insert([{
          name: form.name, furigana: form.furigana, nickname: form.nickname,
          class: form.class, phones: phonesArray, email: form.email,
          address: form.address, comment: form.comment, memo: form.memo,
          store_id: storeId,
        }])
        .select().single();
      if (error) {
        alert("登録に失敗しました: " + error.message);
        setSaving(false);
        return;
      }
      result = inserted;
    }
    setSaving(false);
    if (onSaved) onSaved(result);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "edit" ? "顧客編集" : "新規顧客登録"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="名前 *" name="name" value={form.name} onChange={handleChange} fullWidth required />
          <TextField label="フリガナ" name="furigana" value={form.furigana} onChange={handleChange} fullWidth />
          <TextField label="ニックネーム" name="nickname" value={form.nickname} onChange={handleChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>クラス</InputLabel>
            <Select
              label="クラス"
              name="class"
              value={form.class || ""}
              onChange={handleChange}
            >
              {CLASS_OPTIONS.map(opt => (
                <MenuItem value={opt.value} key={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="電話番号（カンマ区切り）"
            name="phones"
            value={form.phones}
            onChange={handleChange}
            fullWidth
          />
          <TextField label="メールアドレス" name="email" value={form.email} onChange={handleChange} fullWidth />
          <TextField label="住所" name="address" value={form.address} onChange={handleChange} fullWidth />
          <TextField label="共有コメント" name="comment" value={form.comment} onChange={handleChange} fullWidth multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --------------------- メイン ---------------------
export default function HeavenTimeChartMemoPen() {
  const timetableRef = useRef(null);

  const { staff, menuList, discounts, shop, currentStoreId } = useSettings();

  const courseOptions = (menuList || []).filter(m => m.category === "コース" && m.is_active);
  const shimeiOptions = (menuList || []).filter(m => m.category === "指名" && m.is_active);
  const opOptions = (menuList || []).filter(m => m.category === "OP" && m.is_active);
  const discountOptions = useMemo(() => (discounts || []).filter(d => d.is_active), [discounts]);

  const [allReservationData, setAllReservationData] = useState([]);
  const [usageDialog, setUsageDialog] = useState({
    open: false, mode: "create", initialData: {}, castOptions: [], resvId: null, customer: null,
  });

  const [customerDialog, setCustomerDialog] = useState({ open: false, mode: "create", data: null });
  const [customerData, setCustomerData] = useState({});
  const [existCustomerDialog, setExistCustomerDialog] = useState({ open: false, data: null });

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftData, setShiftData] = useState({});
  const [reservationData, setReservationData] = useState([]);
  const [loading, setLoading] = useState(false);

  const reservationCount = useMemo(() => reservationData.filter(r => r.kubun === "予約").length, [reservationData]);
  const contractCount = useMemo(() => reservationData.filter(r => r.kubun === "成約").length, [reservationData]);
  const [memoDialog, setMemoDialog] = useState({ open: false, castId: null, memo: "" });

  const [salaryDialog, setSalaryDialog] = useState({ open: false, cast: null });
  const [zappi, setZappi] = useState(0); // 雑費
  const [total, setTotal] = useState(0); // 総額

  function SalaryDialog({
    open, onClose, cast, selectedDate, totalSalary, reservationsForCast, storeId, fetchData
  }) {
    const [editMode, setEditMode] = useState(false);
    const [zappi, setZappi] = useState(0);
    const [salaryData, setSalaryData] = useState(null);
    const [message, setMessage] = useState("");

    // 保存済み給与データ取得
    useEffect(() => {
      async function fetchSalary() {
        if (cast && selectedDate && storeId) {
          const { data } = await supabase
            .from("salaries")
            .select("*")
            .eq("cast_id", cast.id)
            .eq("store_id", storeId)
            .eq("date", selectedDate)
            .maybeSingle();
          setSalaryData(data);
          setEditMode(!data); // 未登録は編集、既登録は表示
          setMessage("");
          setZappi(data?.zappi ?? 0);
          if (data) {
            setMessage("確定済みです");
          } else {
            setMessage("");
          }
        }
      }
      if (open) fetchSalary();
    }, [open, cast, selectedDate, storeId]);

    const finalSalary = totalSalary - zappi;

    // 保存
    const handleSave = async () => {
      const row = {
        cast_id: cast.id,
        store_id: storeId,
        date: selectedDate,
        total_salary: totalSalary,
        zappi,
        final_salary: finalSalary,
      };
      const { error } = await supabase.from("salaries").upsert(row, { onConflict: ["cast_id", "store_id", "date"] });
      if (error) {
        alert("保存エラー: " + error.message);
        return;
      }
      setMessage("確定済みです");
      setEditMode(false);
      // 保存後にDBから再取得
      const { data } = await supabase
        .from("salaries")
        .select("*")
        .eq("cast_id", cast.id)
        .eq("store_id", storeId)
        .eq("date", selectedDate)
        .single();
      setSalaryData(data);
      if (fetchData) fetchData(); // 親リロードも
    };

    // 編集ボタン押下
    const onEdit = () => setEditMode(true);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>出勤詳細</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            日付：{selectedDate}<br />
          </Typography>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>この日の予約</Typography>
          <Stack spacing={1}>
            {reservationsForCast.map((r, i) => (
              <Box key={i} sx={{ p: 1.2, bgcolor: "#f6f7fa", borderRadius: 2 }}>
                <Typography fontWeight={700} fontSize={15}>顧客名：{r.customer_name || "未登録"}</Typography>
                <Typography fontSize={14}>コース：{r.course || "-"}</Typography>
                <Typography fontSize={14}>指名：{r.shimei || "-"}</Typography>
                <Typography fontSize={14}>
                  時間：{r.datetime?.slice(11, 16)}～
                  {/* ...省略 */}
                </Typography>
                <Typography fontSize={14}>給料：{r.cast_pay ? Number(r.cast_pay).toLocaleString() + "円" : "-"}</Typography>
                {r.discount && (
                  <Typography fontSize={14}>
                    割引：
                    {(() => {
                      // 配列（JSONオブジェクトやJSON文字列にも対応）
                      if (Array.isArray(r.discount)) return r.discount.join(", ");
                      if (typeof r.discount === "string") {
                        try {
                          const arr = JSON.parse(r.discount);
                          if (Array.isArray(arr)) return arr.join(", ");
                          return r.discount;
                        } catch {
                          return r.discount;
                        }
                      }
                      return r.discount;
                    })()}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
          <Box sx={{ mt: 2 }}>
            {editMode ? (
              <>
                <TextField
                  label="雑費"
                  type="number"
                  value={zappi}
                  onChange={e => setZappi(Number(e.target.value))}
                  fullWidth
                  InputProps={{ endAdornment: <span>円</span> }}
                />
                <Box sx={{ mt: 2, fontWeight: 700, fontSize: 17 }}>
                  最終支給額：{finalSalary.toLocaleString()}円
                </Box>
              </>
            ) : (
              <>
                <Typography sx={{ mt: 2 }}>雑費：{salaryData?.zappi?.toLocaleString() ?? 0}円</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
                  最終支給額：{salaryData?.final_salary?.toLocaleString() ?? finalSalary.toLocaleString()}円
                </Typography>
              </>
            )}
          </Box>
          {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
        </DialogContent>
        <DialogActions>
          {editMode ? (
            <>
              <Button onClick={() => setEditMode(false)}>キャンセル</Button>
              <Button variant="contained" onClick={handleSave}>保存</Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>閉じる</Button>
              <Button variant="outlined" onClick={onEdit}>編集</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    );
  }

  const [shiftTypeDialog, setShiftTypeDialog] = useState({ open: false, cast: null });

  const openTime = shop?.open || "10:00";
  const closeTime = shop?.close || "00:00";
  const openMins = toMinutes(openTime);
  let closeMins = toMinutes(closeTime);
  if (closeMins <= openMins) closeMins += 1440;
  const slotCount = (closeMins - openMins) / 10;
  const times = Array.from({ length: slotCount + 6 }, (_, i) => {
    const mins = openMins + i * 10;
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });
  const hourCount = Math.ceil((closeMins - openMins) / 60);
  const hourLabels = Array.from({ length: hourCount + 2 }, (_, i) => {
    const mins = openMins + i * 60;
    const h = Math.floor(mins / 60) % 24;
    return `${String(h).padStart(2, "0")}:00`;
  });

  // --- DBからシフト・予約を取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*")
      .eq("date", selectedDate)
      .in("type", ["出勤", "当日欠勤", "出勤済み", "遅刻", "早退"])
      .eq("store_id", currentStoreId);
    const startOfDay = selectedDate + "T00:00:00";
    const endOfDay = selectedDate + "T23:59:59";
    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .gte("datetime", startOfDay)
      .lte("datetime", endOfDay)
      .not("kubun", "ilike", "%キャンセル%")
      .eq("store_id", currentStoreId);
    const customerIds = [...new Set((reservations || []).map(r => r.customer_id).filter(Boolean))];
    let customersMap = {};
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, furigana, nickname, class, phones, email, address, comment, memo");
      customersMap = Object.fromEntries((customers || []).map(c => [c.id, c]));
    }
    const reservationsWithName = (reservations || []).map(r => ({
      ...r,
      customer_name: customersMap[r.customer_id]?.name || "",
      customer_id: r.customer_id,
    }));

    const shiftsByCast = {};
    for (const shift of shifts || []) {
      if (!shiftsByCast[shift.cast_id]) shiftsByCast[shift.cast_id] = {};
      shiftsByCast[shift.cast_id][shift.date] = {
        start: shift.start_time,
        end: shift.end_time,
        memo: shift.memo,
        type: shift.type,
      };
    }
    setShiftData(shiftsByCast);
    setReservationData(reservationsWithName);
    setLoading(false);
  }, [selectedDate, currentStoreId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const fetchAllReservations = async () => {
      const { data: allRes } = await supabase
        .from("reservations")
        .select("*")
        .eq("store_id", currentStoreId)
        .not("kubun", "ilike", "%キャンセル%");
      setAllReservationData(allRes || []);
    };
    if (currentStoreId) fetchAllReservations();
  }, [currentStoreId]);

  useEffect(() => {
    if (!timetableRef.current) return;
    const now = new Date();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
    if (isToday) {
      const startMins = toMinutes(openTime);
      const nowMins = nowHours * 60 + nowMinutes;
      let diff = nowMins - startMins;
      if (diff < 0) diff = 0;
      const scrollLeft = (diff / 10) * GRID_WIDTH - 600;
      timetableRef.current.scrollTo({
        left: scrollLeft > 0 ? scrollLeft : 0,
        behavior: "smooth"
      });
    }
  }, [selectedDate, openTime]);

  useEffect(() => {
    if (salaryDialog.open && salaryDialog.cast) {
      const sum = reservationData
        .filter(r => String(r.cast_id) === String(salaryDialog.cast.id))
        .reduce((acc, cur) => acc + (cur.price || 0), 0);
      setTotal(sum);
      setZappi(0); // 雑費は初期値0
    }
  }, [salaryDialog, reservationData]);

  useEffect(() => {
    if (salaryDialog.open) setZappi(0); // ダイアログ開いたらリセット
  }, [salaryDialog.open]);

  const reservationsForCast = useMemo(() =>
    reservationData.filter(r => String(r.cast_id) === String(salaryDialog.cast?.id)),
    [reservationData, salaryDialog.cast]
  );

  const totalSalary = useMemo(() =>
    reservationsForCast.reduce((acc, cur) => acc + (Number(cur.cast_pay) || 0), 0),
    [reservationsForCast]
  );

  const castList = useMemo(() => {
    return (staff || []).filter(
      s => s.role === "キャスト" && s.isActive && shiftData[s.id]?.[selectedDate]
    );
  }, [staff, shiftData, selectedDate]);

  const getReservationsForCast = castId =>
    reservationData.filter(
      r => String(r.cast_id) === String(castId) && isSameDay(parseISO(r.datetime), parseISO(selectedDate + "T00:00:00"))
    );
  const getDurationMins = (res) => {
    if (res.course && /(\d+)分/.test(res.course)) {
      return Number(res.course.match(/(\d+)分/)[1]);
    }
    return 60;
  };

  // 新規顧客作成
  const handleNewCustomerAndWork = () => setCustomerDialog({ open: true, mode: "create", data: null });

  // 利用履歴の作成
  const handleCreateHistory = (customer) => {
    setUsageDialog({
      open: true,
      mode: "create",
      initialData: { customer_id: customer.id },
      castOptions: [],
      resvId: null,
      customer,
    });
    setExistCustomerDialog({ open: false, data: null });
  };

  // 顧客ダイアログ保存時
  const handleCustomerSaved = async (savedCustomer) => {
    setCustomerData(savedCustomer);
    const castArr = await getShiftCastsByDate(selectedDate, currentStoreId, staff);
    const castOptions = castArr.map(opt => ({
      id: opt.id,
      name: opt.name,
      count: (allReservationData || []).filter(
        r => r.cast_id === opt.id && r.customer_id === savedCustomer.id
      ).length
    }));
    setUsageDialog({
      open: true,
      mode: "create",
      initialData: {
        customer_id: savedCustomer.id,
      },
      castOptions,
      resvId: null,
      customer: savedCustomer,
    });
    fetchData();
  };

  // 予約編集（予約バークリック時用：もし残したい場合。消してもOK）
  const handleReservationEdit = async (reservation) => {
    const dateStr = (reservation.datetime || "").slice(0, 10) || selectedDate;
    const castArr = await getShiftCastsByDate(dateStr, currentStoreId, staff);
    let customer = null;
    if (reservation.customer_id) {
      const { data } = await supabase.from("customers").select("*").eq("id", reservation.customer_id).single();
      customer = data;
    }
    const castOptions = castArr.map(opt => ({
      id: opt.id,
      name: opt.name,
      count: (allReservationData || []).filter(r => r.cast_id === opt.id && r.customer_id === customer?.id).length
    }));
    setUsageDialog({
      open: true,
      mode: "edit",
      initialData: { ...reservation },
      castOptions,
      resvId: reservation.id,
      customer,
    });
  };

  const handleUsageHistorySave = async (form) => {
    try {
      const { customer_name, ...saveData } = form;
      if (usageDialog.mode === "create") {
        const { error } = await supabase.from("reservations").insert([
          {
            ...saveData,
            store_id: currentStoreId,
            customer_id: usageDialog.customer?.id || saveData.customer_id || null,
          }
        ]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reservations").update({
          ...saveData,
          store_id: currentStoreId,
        }).eq("id", usageDialog.resvId);
        if (error) throw error;
        fetchData();
      }
      setUsageDialog({ open: false, mode: "create", initialData: {}, customer: null, resvId: null });
      fetchData();
    } catch (e) {
      alert("保存に失敗しました\n" + e.message);
    }
  };

  // 給料保存
  const handleSalarySave = async () => {
    if (!salaryDialog.cast) return;
    const store_id = currentStoreId;
    const cast_id = salaryDialog.cast.id;
    const date = selectedDate;
    const total_salary = totalSalary;
    const final_salary = totalSalary - zappi;
    try {
      const { error } = await supabase.from("salaries").upsert([
        {
          store_id,
          cast_id,
          date,
          total_salary,
          zappi,
          final_salary,
        }
      ], { onConflict: ['store_id', 'cast_id', 'date'] }); // 既存あれば更新
      if (error) throw error;
      setSalaryDialog({ open: false, cast: null });
      alert("保存しました");
    } catch (e) {
      alert("保存エラー: " + e.message);
    }
  };

  const handleUsageDialogClose = () => setUsageDialog({ open: false, mode: "create", initialData: {}, castOptions: [], resvId: null, customer: null });

  const handleDialogDateChange = async (dateStr) => {
    const castArr = await getShiftCastsByDate(dateStr, currentStoreId, staff);
    const castOptions = castArr.map(opt => ({
      id: opt.id,
      name: opt.name,
      count: (allReservationData || []).filter(r => r.cast_id === opt.id && r.customer_id === usageDialog.customer?.id).length
    }));
    setUsageDialog(prev => ({
      ...prev,
      castOptions,
      initialData: { ...prev.initialData, datetime: dateStr },
    }));
  };

  // メモ編集
  const handleMemoOpen = (cast) => {
    setMemoDialog({ open: true, castId: cast.id, memo: shiftData[cast.id]?.[selectedDate]?.memo ?? "" });
  };
  const handleMemoSave = async () => {
    if (!memoDialog.castId) return;
    const shiftRow = shiftData[memoDialog.castId]?.[selectedDate];
    if (!shiftRow) {
      alert("シフト情報がありません");
      setMemoDialog({ open: false, castId: null, memo: "" });
      return;
    }
    const { error } = await supabase
      .from("shifts")
      .update({ memo: memoDialog.memo })
      .eq("cast_id", memoDialog.castId)
      .eq("date", selectedDate)
    if (error) {
      alert("保存失敗: " + error.message);
      return;
    }
    setMemoDialog({ open: false, castId: null, memo: "" });
    fetchData();
  };

  const handleDateChange = e => setSelectedDate(e.target.value);
  const handlePrev = () => setSelectedDate(d => format(addDays(new Date(d), -1), "yyyy-MM-dd"));
  const handleNext = () => setSelectedDate(d => format(addDays(new Date(d), 1), "yyyy-MM-dd"));

  // ステータス優先度マップ
  const shiftPriority = {
    "出勤済み": 1,
    "遅刻": 2,
    "早退": 3,
    "当日欠勤": 4,
    "未設定": 5
  };

  const sortedCastList = [...castList].sort((a, b) => {
    const aType = shiftData[a.id]?.[selectedDate]?.type || "未設定";
    const bType = shiftData[b.id]?.[selectedDate]?.type || "未設定";
    const aPri = shiftPriority[aType] || 99;
    const bPri = shiftPriority[bType] || 99;
    if (aPri !== bPri) {
      return aPri - bPri;
    }
    // 出勤済み同士は開始時間の昇順
    if (aType === "出勤済み" && bType === "出勤済み") {
      const aStart = toMinutes(shiftData[a.id]?.[selectedDate]?.start || openTime);
      const bStart = toMinutes(shiftData[b.id]?.[selectedDate]?.start || openTime);
      return aStart - bStart;
    }
    return 0;
  });

  return (
    <Box sx={{ bgcolor: "#f8fafb", px: 2, py: 2, minHeight: "100vh" }}>
      {/* カレンダー・コントロール */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<PersonAddAltIcon />}
          sx={{
            bgcolor: "#32c2c2", fontWeight: 900, boxShadow: 2, px: 2.5, py: 1.2, fontSize: 18,
            borderRadius: 2, '&:hover': { bgcolor: "#26b0b0" }
          }}
          onClick={handleNewCustomerAndWork}
        >
          新規顧客の作成
        </Button>
        <Typography sx={{ fontWeight: 700, fontSize: 20, ml: 1, color: "#00ced1" }}>
          予約：{reservationCount}件 / 成約：{contractCount}件
        </Typography>
        <Button variant="outlined" sx={{ ml: 2, minWidth: 60 }} onClick={handlePrev}>前日</Button>
        <TextField
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          sx={{ width: 160, mx: 1, bgcolor: "#fff", borderRadius: 2 }}
          inputProps={{ style: { fontWeight: 700, fontSize: 16 } }}
        />
        <Button variant="outlined" sx={{ minWidth: 60 }} onClick={handleNext}>翌日</Button>
        <Typography sx={{ ml: 2, fontWeight: 700, color: "#2196f3" }}>
          {format(new Date(selectedDate), "yyyy/MM/dd (E)", { locale: ja })}
        </Typography>
        {loading && <Typography color="primary" sx={{ ml: 2 }}>Loading…</Typography>}
      </Box>

      {/* タイムテーブル */}
      <Box sx={{
        borderRadius: 3, boxShadow: 1, border: "1.5px solid #e0e7ef",
        bgcolor: "#fff", overflow: "hidden", display: "flex"
      }}>
        {/* キャスト名ラベル部分 */}
        <Box sx={{
          width: AVATAR_WIDTH,
          minWidth: AVATAR_WIDTH,
          bgcolor: "#fcfcfc",
          borderRight: "1.2px solid #e4e8ef",
          zIndex: 5,
          position: "sticky",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column"
        }}>
          <Box sx={{ height: ROW_HEIGHT, borderBottom: "1.2px solid #e4e8ef" }} />
          {sortedCastList.map(cast => {
            const shiftInfo = shiftData[cast.id]?.[selectedDate];
            const status = shiftInfo?.type || "未設定";
            const btnProps = statusProps[status] || statusProps["未設定"];
            const isAbsentOrEarly = status === "当日欠勤" || status === "早退";
            return (
              <Box
                key={cast.id}
                sx={{
                  px: 2,
                  height: ROW_HEIGHT,
                  borderBottom: "1.2px solid #f2f4fa",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  opacity: isAbsentOrEarly ? 0.4 : 1,
                  background: isAbsentOrEarly ? "#eee" : "inherit"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.3 }}>
                  <Tooltip title="メモ編集">
                    <Typography fontWeight={900} color="#ea6699" fontSize={18}>{cast.name}</Typography>
                  </Tooltip>
                  <IconButton
                    size="small"
                    sx={{ ml: 0.5 }}
                    onClick={() => handleMemoOpen(cast)}
                  >
                    <EditNoteIcon sx={{ color: "#4aa6e4" }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{ ml: 0.5 }}
                    onClick={() => setSalaryDialog({ open: true, cast })}
                  >
                    <AttachMoneyIcon sx={{ fontSize: 25 }} />
                  </IconButton>
                  <Button
                    size="small"
                    startIcon={btnProps.icon}
                    sx={{
                      ml: 0.6,
                      px: 0.6,
                      py: 0.6,
                      fontSize: 14,
                      borderRadius: 2,
                      minWidth: 18,
                      height: 32,
                      lineHeight: 1.1,
                      fontWeight: 800,
                      background: btnProps.color,
                      color: "#fff",
                      boxShadow: status === "出勤済み" ? "0 1.5px 6px #38d9f148" : "none",
                      letterSpacing: 0.5,
                      '&:hover': {
                        opacity: 0.92,
                        background: btnProps.color,
                      },
                      transition: "all 0.12s"
                    }}
                    variant="contained"
                    onClick={() => setShiftTypeDialog({ open: true, cast })}
                  >
                    {status === "出勤済み" ? "出勤済" : btnProps.label}
                  </Button>
                </Box>
                <Typography fontSize={13} color="#768">
                  {shiftInfo?.start || openTime} 〜 {shiftInfo?.end || closeTime}
                </Typography>
                {shiftInfo?.memo && (
                  <Typography fontSize={13} color="#b36" sx={{ whiteSpace: "pre-line" }}>
                    {shiftInfo.memo}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
        {/* 時間グリッド */}
        <Box
          ref={timetableRef}
          sx={{ flex: 1, overflowX: "auto", position: "relative" }}>
          {selectedDate === format(new Date(), "yyyy-MM-dd") && (() => {
            const now = new Date();
            const nowMins = now.getHours() * 60 + now.getMinutes();
            const startMins = toMinutes(openTime);
            const closeMins_ = toMinutes(closeTime) <= startMins ? toMinutes(closeTime) + 1440 : toMinutes(closeTime);
            if (nowMins < startMins || nowMins > closeMins_) return null;
            const left = ((nowMins - startMins) / 10) * GRID_WIDTH;
            return (
              <Box
                sx={{
                  position: "absolute",
                  top: ROW_HEIGHT,
                  left: left,
                  width: 3,
                  height: `calc(100% - ${ROW_HEIGHT}px)`,
                  bgcolor: "#f43f5e55",
                  zIndex: 40,
                  pointerEvents: "none",
                  borderRadius: 2,
                  boxShadow: "0 0 10px #f43f5e55"
                }}
              />
            );
          })()}
          <Box sx={{ display: "flex", height: ROW_HEIGHT, minWidth: GRID_WIDTH * times.length, borderBottom: "1.2px solid #e4e8ef", bgcolor: "#fff" }}>
            {hourLabels.map((label, i) => (
              <Box
                key={i}
                sx={{
                  width: GRID_WIDTH * 6,
                  minWidth: GRID_WIDTH * 6,
                  textAlign: "center",
                  color: "#222",
                  fontWeight: 900,
                  fontSize: 18,
                  borderRight: "1.2px solid #e1e5ee",
                  py: 1.7,
                  background: "#f8fbf8",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
          {sortedCastList.map((cast, idx) => {
            const shiftStart = (toMinutes(shiftData[cast.id]?.[selectedDate]?.start || openTime) - openMins) / 10;
            const shiftEnd = (toMinutes(shiftData[cast.id]?.[selectedDate]?.end === "00:00" ? "24:00" : shiftData[cast.id]?.[selectedDate]?.end || closeTime) - openMins) / 10;
            const reservations = getReservationsForCast(cast.id);
            const shiftInfo = shiftData[cast.id]?.[selectedDate];
            const isAbsentOrEarly = shiftInfo?.type === "当日欠勤" || shiftInfo?.type === "早退";
            return (
              <Box key={cast.id} sx={{
                position: "relative",
                display: "flex", height: ROW_HEIGHT, minWidth: GRID_WIDTH * times.length,
                borderBottom: idx < sortedCastList.length - 1 ? "1.2px solid #f2f4fa" : "none",
                bgcolor: isAbsentOrEarly ? "#eee" : "#fcfcfd",
                opacity: isAbsentOrEarly ? 0.4 : 1,
              }}>
                {reservations.map(res => {
                  const startTime = res.datetime.split("T")[1]?.slice(0, 5) || openTime;
                  const gridIdx = (toMinutes(startTime) - openMins) / 10;
                  const duration = getDurationMins(res);
                  const widthGrids = duration / 10;
                  const barColor = res.kubun === "成約" ? "#67d57f" : "#f5b731";
                  return (
                    <Tooltip
                      key={res.id}
                      title={
                        <span>
                          {res.kubun} / {res.course}<br />
                          ¥{res.price} / {res.shimei}
                        </span>
                      }
                      placement="top"
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          left: GRID_WIDTH * gridIdx,
                          top: 7,
                          height: ROW_HEIGHT - 14,
                          width: GRID_WIDTH * widthGrids,
                          bgcolor: barColor,
                          border: `2px solid ${barColor}`,
                          borderRadius: 2,
                          boxShadow: "0 2px 6px #aaa3",
                          cursor: "pointer",
                          zIndex: 10,
                          overflow: "hidden",
                          p: 0.6,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center"
                        }}
                        onClick={() => handleReservationEdit(res)}
                      >
                        <Typography fontWeight={800} color="#fff" fontSize={14} noWrap>
                          {res.kubun} / {res.course} / ¥{res.price}
                        </Typography>
                        <Typography fontSize={13} color="#fff" noWrap>
                          {res.shimei}{res.customer_name ? ` / ${res.customer_name}` : ""}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
                {times.map((t, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: GRID_WIDTH, height: "100%",
                      borderLeft: i > 0 && i % 6 === 0 ? "2px solid #d3d8e3" : "1px solid #e9eef4",
                      bgcolor: (i >= shiftStart && i < shiftEnd) ? "#fff" : "#f4f5f7"
                    }}
                  />
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* 顧客新規・編集ダイアログ */}
      <CustomerEditDialog
        open={customerDialog.open}
        mode={customerDialog.mode}
        data={customerDialog.data}
        onClose={() => setCustomerDialog({ open: false, mode: "create", data: null })}
        onSaved={handleCustomerSaved}
        storeId={currentStoreId}
        setExistCustomerDialog={setExistCustomerDialog}
      />

      {/* 既存顧客ダイアログ（重複時） */}
      <CustomerDetailDialog
        open={existCustomerDialog.open}
        data={existCustomerDialog.data}
        onClose={() => setExistCustomerDialog({ open: false, data: null })}
        onCreateHistory={handleCreateHistory}
      />

      {/* 利用履歴ダイアログ */}
      <UsageHistoryDialog
        open={usageDialog.open}
        mode={usageDialog.mode}
        initialData={usageDialog.initialData}
        castOptions={usageDialog.castOptions}
        courseOptions={courseOptions}
        shimeiOptions={shimeiOptions}
        opOptions={opOptions}
        discountOptions={discountOptions}
        onSave={handleUsageHistorySave}
        onClose={handleUsageDialogClose}
        historyList={usageDialog.mode === "history"
          ? allReservationData.filter(r => r.customer_id === usageDialog.customer?.id)
          : reservationData}
        onDateChange={handleDialogDateChange}
      />

      {/* メモ編集ダイアログ */}
      <Dialog open={memoDialog.open} onClose={() => setMemoDialog({ open: false, castId: null, memo: "" })} maxWidth="xs" fullWidth>
        <DialogTitle>キャストのメモ編集</DialogTitle>
        <DialogContent>
          <TextField
            label="メモ"
            value={memoDialog.memo}
            onChange={e => setMemoDialog({ ...memoDialog, memo: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemoDialog({ open: false, castId: null, memo: "" })}>キャンセル</Button>
          <Button variant="contained" onClick={handleMemoSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 勤怠区分ダイアログ */}
      <Dialog
        open={shiftTypeDialog.open}
        onClose={() => setShiftTypeDialog({ open: false, cast: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>勤怠区分の変更</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {["出勤済み", "遅刻", "早退", "当日欠勤"].map(type => (
              <Button
                key={type}
                variant={
                  shiftTypeDialog.cast &&
                    shiftData[shiftTypeDialog.cast.id]?.[selectedDate]?.type === type
                    ? "contained"
                    : "outlined"
                }
                color={
                  type === "当日欠勤"
                    ? "error"
                    : type === "遅刻" || type === "早退"
                      ? "warning"
                      : "primary"
                }
                onClick={async () => {
                  await supabase
                    .from("shifts")
                    .update({ type })
                    .eq("cast_id", shiftTypeDialog.cast.id)
                    .eq("date", selectedDate)
                    .eq("store_id", currentStoreId);
                  setShiftTypeDialog({ open: false, cast: null });
                  fetchData();
                }}
                fullWidth
                sx={{ fontWeight: 700, fontSize: 17, py: 2 }}
              >
                {type}
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShiftTypeDialog({ open: false, cast: null })}>キャンセル</Button>
        </DialogActions>
      </Dialog>

      {/* 給料確定ダイアログ */}
      <SalaryDialog
        open={salaryDialog.open}
        onClose={() => setSalaryDialog({ open: false, cast: null })}
        cast={salaryDialog.cast}
        selectedDate={selectedDate}
        totalSalary={totalSalary}
        reservationsForCast={reservationsForCast}
        storeId={currentStoreId}
        fetchData={fetchData}
      />

    </Box>
  );
}
