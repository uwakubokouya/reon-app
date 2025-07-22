import React, { useState, useEffect } from "react";
import {
  Box, Tabs, Tab, Typography, Stack, Card, Button, TextField, Divider,
  Chip, IconButton, MenuItem, Switch, FormControlLabel, Checkbox, FormGroup, Alert, Tooltip
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HotelIcon from "@mui/icons-material/Hotel";
import DiscountIcon from "@mui/icons-material/Discount";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { useSettings } from "../SettingsContext";
import { loginHeaven } from "../api/heaven";
import { supabase } from "../lib/supabase";

// --- 共通デザイン・定数 ---
const accent = "#6366f1";
const cyan = "#06b6d4";
const gradBG = "linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 80%)";
const glassStyle = {
  background: "rgba(255,255,255,0.93)",
  boxShadow: "0 8px 32px 0 rgba(34,197,246,0.11), 0 1.5px 8px 0 #6366f117",
  border: "1.5px solid rgba(220,230,255,0.11)",
  borderRadius: 14,
  overflow: "hidden"
};

const TAB_CONFIG = [
  { label: "店舗情報", icon: <AccessTimeIcon sx={{ color: accent }} /> },
  { label: "コース/オプション/指名", icon: <HotelIcon sx={{ color: cyan }} /> },
  { label: "割引・イベント", icon: <DiscountIcon sx={{ color: "#fbbf24" }} /> },
  { label: "キャスト/スタッフ", icon: <PeopleAltIcon sx={{ color: accent }} /> },
  { label: "経費/売上目標", icon: <ReceiptIcon sx={{ color: cyan }} /> },
  { label: "SNS/口コミ", icon: <AnalyticsIcon sx={{ color: "#f472b6" }} /> },
  { label: "システム設定", icon: <SettingsIcon sx={{ color: "#64748b" }} /> }
];

const WEEK_DAYS = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜", "祝日"];
const FIXED_CATEGORIES = ["コース", "OP", "指名"];
const safeArray = arr => Array.isArray(arr) ? arr : [];

// --- DB同期 ---
async function fetchMenus(store_id, setMenuList) {
  if (!store_id) return;
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .eq("store_id", store_id)
    .order("id");
  if (!error && data) {
    setMenuList(
      data.map(item => ({
        ...item,
        name: item.name || "",
        category: item.category || "コース",
        price: typeof item.price === "number" ? item.price : (item.price ? Number(item.price) : 0),
        duration: item.duration ?? "",
        cast_pay: item.cast_pay ?? "",
        discount: item.discount ?? "",
        isActive: item.is_active !== false
      }))
    );
  }
}

// --- 割引/イベントDB同期 ---
async function fetchDiscounts(store_id, setDiscountList) {
  if (!store_id) return;
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .eq("store_id", store_id)
    .order("id");
  if (!error && data) setDiscountList(data);
}

// --- キャストDB保存 ---
async function saveCastToDB(cast, store_id) {
  if (!store_id) return;
  const { id, isActive, ...newCast } = cast;
  if (id) {
    await supabase.from("casts").update({ ...newCast, is_active: isActive }).eq("id", id);
  } else {
    await supabase.from("casts").insert([{ ...newCast, is_active: isActive, store_id }]);
  }
}
async function deleteCastFromDB(cast, store_id) {
  if (!store_id || !cast.id) return;
  await supabase.from("casts").delete().eq("id", cast.id);
}

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const [categoryTab, setCategoryTab] = useState(FIXED_CATEGORIES[0]);

  // 割引・イベント
  const [discountList, setDiscountList] = useState([]);

  const {
    shop, setShop,
    roles, setRoles,
    staff, setStaff,
    expenseItems, setExpenseItems,
    sns, setSns,
    backupEmail, setBackupEmail,
    printer, setPrinter,
    autoClose, setAutoClose,
    setSessionId: setSessionIdContext,
    currentStoreId,
    sessionId: sessionIdContext,
  } = useSettings();

  const store_id = currentStoreId;
  const safeShop = shop || { open: "11:00", close: "2:00", holiday: [], table: 0, seat: 0 };
  const safeRoles = safeArray(roles);
  const safeStaff = safeArray(staff);
  const safeExpenseItems = safeArray(expenseItems);
  const safeGoal = goal || "";
  const safeSns = sns || { twitter: "", insta: "", line: "", slack: "", x_enabled: false, insta_enabled: false };

  // コース/オプション/指名
  const [localMenuList, setLocalMenuList] = useState([]);
  const filteredMenuList = localMenuList.filter(m => m.category === categoryTab);

  // 初期ロード
  useEffect(() => {
    if (store_id) {
      fetchMenus(store_id, setLocalMenuList);
      fetchDiscounts(store_id, setDiscountList);
      fetchExpenseItems(store_id, setExpenseItems);
    }
  }, [store_id]);

  // --- コース/OP/指名カテゴリ編集 ---
  const handleMenuChangeById = (id, key, val) => {
    setLocalMenuList(list => list.map(m => m.id === id ? {
      ...m,
      [key]: ["price", "duration", "cast_pay", "discount"].includes(key)
        ? val.replace(/[^0-9]/g, "")
        : val
    } : m));
  };
  const handleMenuSaveById = async (id) => {
    const m = localMenuList.find(item => item.id === id);
    if (!store_id || !m?.id) return;
    const menuData = {
      name: m.name,
      category: m.category,
      price: Number(m.price) || 0,
      duration: Number(m.duration) || 0,
      cast_pay: Number(m.cast_pay) || 0,
      discount: Number(m.discount) || 0,
      is_active: !!m.isActive,
      store_id
    };
    const { error } = await supabase.from("menus").update(menuData).eq("id", m.id);
    if (error) alert("保存失敗: " + error.message);
    await fetchMenus(store_id, setLocalMenuList);
  };
  const toggleMenuActiveById = async (id) => {
    const m = localMenuList.find(item => item.id === id);
    if (!m?.id) return;
    await supabase.from("menus").update({ is_active: !m.isActive }).eq("id", m.id);
    await fetchMenus(store_id, setLocalMenuList);
  };
  const handleMenuDelById = async (id) => {
    const m = localMenuList.find(item => item.id === id);
    if (!m?.id) return;
    await supabase.from("menus").delete().eq("id", m.id);
    await fetchMenus(store_id, setLocalMenuList);
  };
  const handleMenuAddCategory = async () => {
    if (!store_id) return alert("店舗IDが未設定です（store_id）");
    const newMenu = {
      store_id,
      name: "",
      category: categoryTab,
      price: 0,
      duration: 0,
      cast_pay: 0,
      discount: 0,
      is_active: true
    };
    const { error } = await supabase.from("menus").insert([newMenu]);
    if (error) alert("追加失敗: " + error.message);
    await fetchMenus(store_id, setLocalMenuList);
  };

  // --- 割引/イベント（DB操作） ---
  const handleDiscountChange = (id, key, value) => {
    setDiscountList(list => list.map(d =>
      d.id === id
        ? {
          ...d,
          [key]:
            key === "amount" || key === "cast_pay_delta"
              ? value.replace(/[^0-9\-]/g, "") // 数字とマイナスのみ
              : value
        }
        : d
    ));
  };

  const handleDiscountSave = async (id) => {
    const d = discountList.find(item => item.id === id);
    if (!store_id || !d) return;

    // idだけ除外する（他の値のみ送る）
    const { id: _, ...dataWithoutId } = d;
    const discountData = {
      ...dataWithoutId,
      amount: d.amount === "" || isNaN(Number(d.amount)) ? 0 : Number(d.amount),
      cast_pay_delta: d.cast_pay_delta === "" || isNaN(Number(d.cast_pay_delta)) ? 0 : Number(d.cast_pay_delta)
    };

    const { error } = await supabase.from("discounts").update(discountData).eq("id", id);
    if (error) alert("保存失敗: " + error.message);
    await fetchDiscounts(store_id, setDiscountList);
  };

  const handleDiscountAdd = async () => {
    if (!store_id) return alert("店舗IDが未設定です（store_id）");
    const newDiscount = {
      store_id,
      code: "",
      description: "",
      amount: 0,
      type: "％",
      cast_pay_delta: -1000,
      is_active: true,
    };
    const { error } = await supabase.from("discounts").insert([newDiscount]);
    if (error) alert("追加失敗: " + error.message);
    await fetchDiscounts(store_id, setDiscountList);
  };

  const handleDiscountDelete = async (id) => {
    const { error } = await supabase.from("discounts").delete().eq("id", id);
    if (error) alert("削除失敗: " + error.message);
    await fetchDiscounts(store_id, setDiscountList);
  };

  const toggleDiscountActive = async (id) => {
    const d = discountList.find(item => item.id === id);
    if (!d) return;
    await supabase.from("discounts").update({ is_active: !d.is_active }).eq("id", id);
    await fetchDiscounts(store_id, setDiscountList);
  };
  // --- 役職管理 ---
  const [newRole, setNewRole] = useState("");
  const handleAddRole = () => {
    if (newRole && !safeRoles.includes(newRole)) {
      setRoles([...safeRoles, newRole]);
      setNewRole("");
    }
  };
  const handleDelRole = idx => setRoles(safeRoles.filter((_, i) => i !== idx));

  // --- キャスト/スタッフDB同期 ---
  const [staffEditList, setStaffEditList] = useState([]);
  useEffect(() => {
    setStaffEditList(safeStaff.map(item => ({ ...item })));
  }, [safeStaff]);

  const handleStaffEditChange = (i, key, val) => {
    setStaffEditList(list =>
      list.map((item, idx) => idx === i ? { ...item, [key]: val } : item)
    );
  };

  const handleStaffSave = async (i) => {
    const item = staffEditList[i];
    if (!item?.id) return;
    await saveCastToDB(item, store_id); // 既存のDB保存関数でOK
    // 保存後、再取得して一覧を最新化
    const { data } = await supabase.from("casts").select("*").eq("store_id", store_id).order("id");
    if (data) setStaff(data.map(d => ({ ...d, isActive: d.is_active !== false })));
  };


  useEffect(() => {
    if (!store_id) return;
    (async () => {
      const { data, error } = await supabase
        .from("casts")
        .select("*")
        .eq("store_id", store_id)
        .order("id");
      if (!error && data) setStaff(data.map(d => ({
        ...d,
        isActive: d.is_active !== false
      })));
    })();
  }, [store_id]);
  const handleStaffChange = async (i, key, val) => {
    const arr = [...safeStaff];
    arr[i][key] = val;
    setStaff(arr);
    await saveCastToDB(arr[i], store_id);
  };
  const handleStaffAdd = async () => {
    if (!store_id) {
      alert("店舗IDが未設定です（store_id）");
      return;
    }
    const newCast = { name: "", role: safeRoles[0] || "", isActive: true };
    await saveCastToDB(newCast, store_id);
    const { data } = await supabase.from("casts").select("*").eq("store_id", store_id).order("id");
    if (data) setStaff(data.map(d => ({ ...d, isActive: d.is_active !== false })));
  };
  const handleStaffDel = async idx => {
    const delCast = safeStaff[idx];
    setStaff(safeStaff.filter((_, i) => i !== idx));
    await deleteCastFromDB(delCast, store_id);
    const { data } = await supabase.from("casts").select("*").eq("store_id", store_id).order("id");
    if (data) setStaff(data.map(d => ({ ...d, isActive: d.is_active !== false })));
  };
  const toggleStaffActive = async idx => {
    const arr = [...safeStaff];
    arr[idx].isActive = !arr[idx].isActive;
    setStaff(arr);
    await saveCastToDB(arr[idx], store_id);
  };

  // --- パスワード認証 ---
  async function fetchStaffTabPass(store_id) {
    if (!store_id) return null;
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("store_id", store_id)
      .eq("key", "staff_tab_pass")
      .maybeSingle();
    return data?.value || null;
  }

  // --- パスワード保存 ---
  async function saveStaffTabPass(store_id, newPass) {
    if (!store_id) return;
    const { error } = await supabase
      .from("settings")
      .upsert([
        { store_id, key: "staff_tab_pass", value: newPass, updated_at: new Date().toISOString() }
      ], { onConflict: ['store_id', 'key'] });
    return error;
  }

  const [staffAuth, setStaffAuth] = useState(false);
  const [staffPass, setStaffPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [passChangeMsg, setPassChangeMsg] = useState("");
  const [staffError, setStaffError] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  // --- 初回ロードでDBからパスワード取得
  useEffect(() => {
    if (!store_id) return;
    fetchStaffTabPass(store_id).then(setCurrentPass);
  }, [store_id]);

  const handleStaffLogin = async () => {
    const dbPass = await fetchStaffTabPass(store_id);
    if (staffPass === dbPass) {
      setStaffAuth(true);
      setStaffPass("");
      setStaffError("");
    } else {
      setStaffError("パスワードが違います");
    }
  };

  const handlePasswordChange = async () => {
    if (!pass1 || !pass2) return setPassChangeMsg("※新しいパスワードを2回入力してください");
    if (pass1 !== pass2) return setPassChangeMsg("※パスワードが一致しません");
    const err = await saveStaffTabPass(store_id, pass1);
    if (!err) {
      setCurrentPass(pass1);
      setPassChangeMsg("パスワードを変更しました。再度認証してください。");
      setStaffAuth(false);
      setPass1(""); setPass2("");
      setTimeout(() => setPassChangeMsg(""), 4000);
    } else {
      setPassChangeMsg("保存エラー: " + err.message);
    }
  };

  // 経費リスト取得
  async function fetchExpenseItems(store_id, setExpenseItems) {
    if (!store_id) return;
    const { data, error } = await supabase
      .from("expense_items")
      .select("*")
      .eq("store_id", store_id)
      .order("id");
    if (!error && data) setExpenseItems(data);
  }

  const [expenseEditList, setExpenseEditList] = useState([]);

  useEffect(() => {
    setExpenseEditList(safeExpenseItems.map(item => ({ ...item })));
  }, [safeExpenseItems]);

  const handleExpenseEditChange = (i, val) => {
    setExpenseEditList(list => list.map((item, idx) =>
      idx === i ? { ...item, name: val } : item
    ));
  };


  // 経費追加
  async function addExpenseItem(store_id, name) {
    await supabase.from("expense_items").insert([{ store_id, name }]);
  }
  // 経費名変更
  async function updateExpenseItem(id, name) {
    await supabase.from("expense_items").update({ name, updated_at: new Date().toISOString() }).eq("id", id);
  }
  // 経費削除
  async function deleteExpenseItem(id) {
    await supabase.from("expense_items").delete().eq("id", id);
  }
  // 表示/非表示
  async function toggleExpenseActiveDB(id, current) {
    await supabase.from("expense_items").update({ is_active: !current }).eq("id", id);
  }
  // 保存ボタン用（index渡すパターン）
  const handleExpenseSave = async (i) => {
    const item = expenseEditList[i];
    if (!item?.id) return;
    await updateExpenseItem(item.id, item.name);
    fetchExpenseItems(store_id, setExpenseItems); // ← ここで全体再取得して表示も更新
  };

  // --- 経費 ---
  // 追加
  const handleExpenseAdd = async () => {
    if (!store_id) return;
    await addExpenseItem(store_id, ""); // 空欄で追加
    fetchExpenseItems(store_id, setExpenseItems);
  };

  // 削除
  const handleExpenseDel = async idx => {
    const item = safeExpenseItems[idx];
    if (!item?.id) return;
    await deleteExpenseItem(item.id);
    fetchExpenseItems(store_id, setExpenseItems);
  };

  // 表示/非表示
  const toggleExpenseActive = async idx => {
    const item = safeExpenseItems[idx];
    if (!item?.id) return;
    await toggleExpenseActiveDB(item.id, item.is_active);
    fetchExpenseItems(store_id, setExpenseItems);
  };


  // --- ヘブン認証/SNS ---
  const [heavenId, setHeavenId] = useState("");
  const [heavenPass, setHeavenPass] = useState("");
  const [heavenAuth, setHeavenAuth] = useState(null);
  const [heavenMsg, setHeavenMsg] = useState("");
  const [heavenErrorDetail, setHeavenErrorDetail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [heavenLoading, setHeavenLoading] = useState(false);

  const handleHeavenAuth = async () => {
    setHeavenMsg("");
    setHeavenErrorDetail("");
    setHeavenAuth(null);
    setHeavenLoading(true);
    setSessionId("");
    try {
      const res = await loginHeaven(heavenId, heavenPass);
      const ok = res.ok || (res.data && res.data.ok);
      if (ok) {
        setHeavenAuth(true);
        setSessionId(res.data?.session_id || res.session_id);
        setSessionIdContext(res.data?.session_id || res.session_id, currentStoreId);
        setHeavenMsg("認証OK！自動連携を開始します…");
        setHeavenErrorDetail("");
      } else {
        setHeavenAuth(false);
        setSessionId("");
        setHeavenMsg((res.data && res.data.detail) || res.detail || "認証に失敗しました");
        setHeavenErrorDetail(
          (res.html ? "HTML: " + res.html + "\n" : "") +
          (res.url ? "URL: " + res.url + "\n" : "") +
          "RAW: " + JSON.stringify(res, null, 2)
        );
      }
    } catch (err) {
      setHeavenAuth(false);
      let detail =
        (err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          JSON.stringify(err));
      if (err?.response) {
        detail += "\nStatus: " + err.response.status;
        detail += "\nBody: " + JSON.stringify(err.response.data);
      }
      setHeavenMsg("認証に失敗：" + (detail || "エラー内容不明"));
      setHeavenErrorDetail("EXCEPTION: " + JSON.stringify(err, null, 2));
    } finally {
      setHeavenLoading(false);
    }
  };

  // --- goal取得
  async function fetchSalesGoal(store_id, setGoal) {
    if (!store_id) return;
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("store_id", store_id)
      .eq("key", "sales_goal")
      .maybeSingle();
    setGoal(data?.value || "");
  }

  // --- goal保存
  async function saveSalesGoal(store_id, value) {
    if (!store_id) return;
    await supabase
      .from("settings")
      .upsert([
        {
          store_id,
          key: "sales_goal",
          value: value,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: ['store_id', 'key'] });
  }

  const [goal, setGoal] = useState("");

  useEffect(() => {
    if (store_id) {
      fetchSalesGoal(store_id, setGoal);
    }
  }, [store_id]);


  // --- UI本体 ---
  return (
    <Box sx={{
      width: "100%",
      minHeight: "100vh",
      bgcolor: gradBG,
      p: 3,
      pb: 6
    }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, ".MuiTabs-flexContainer": { gap: 2 } }}
      >
        {TAB_CONFIG.map((t, i) => (
          <Tab key={t.label} label={
            <span style={{ fontWeight: 700, fontSize: 17, display: "flex", alignItems: "center", gap: 4 }}>
              {t.icon}{t.label}
            </span>
          } />
        ))}
      </Tabs>
      <Divider sx={{ mb: 2 }} />
      {/* --- 店舗情報 --- */}
      {tab === 0 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 620 }}>
          <Typography fontWeight={800} color={accent} mb={2}>■ 店舗情報（風俗店用）</Typography>
          <Stack spacing={2}>
            <TextField label="開店時間" type="time" value={safeShop.open} onChange={e => setShop({ ...safeShop, open: e.target.value })} />
            <TextField label="閉店時間" type="time" value={safeShop.close} onChange={e => setShop({ ...safeShop, close: e.target.value })} />
            <Box>
              <Typography fontWeight={600} color="#64748b" mb={0.8}>定休日（複数選択可）</Typography>
              <FormGroup row>
                {WEEK_DAYS.map(day => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={Array.isArray(safeShop.holiday) ? safeShop.holiday.includes(day) : false}
                        onChange={() => setShop(prev => ({
                          ...prev,
                          holiday: prev.holiday && prev.holiday.includes(day)
                            ? prev.holiday.filter(d => d !== day)
                            : [...(prev.holiday || []), day]
                        }))}
                        sx={{ color: accent, "&.Mui-checked": { color: cyan } }}
                      />
                    }
                    label={day}
                  />
                ))}
              </FormGroup>
            </Box>
            <TextField label="個室数" type="number" value={safeShop.table} onChange={e => setShop({ ...safeShop, table: e.target.value })} />
            <TextField label="総在籍数" type="number" value={safeShop.seat} onChange={e => setShop({ ...safeShop, seat: e.target.value })} />
          </Stack>
        </Card>
      )}
      {/* --- コース/オプション/指名 --- */}
      {tab === 1 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 1300 }}>
          <Typography fontWeight={800} color={cyan} mb={2}>■ コース・オプション/指名 管理</Typography>
          <Tabs
            value={FIXED_CATEGORIES.indexOf(categoryTab)}
            onChange={(_, v) => setCategoryTab(FIXED_CATEGORIES[v])}
            sx={{ mb: 3, ".MuiTabs-flexContainer": { gap: 2 } }}
            indicatorColor="primary"
            textColor="primary"
          >
            {FIXED_CATEGORIES.map(c => (
              <Tab key={c} label={c} />
            ))}
          </Tabs>
          <Stack spacing={2}>
            {filteredMenuList.length === 0 && (
              <Typography color="#888" sx={{ my: 4, textAlign: "center" }}>
                このカテゴリのデータはまだありません
              </Typography>
            )}
            {filteredMenuList.map((m, i) => (
              <Stack key={m.id ?? i} direction="row" gap={2} alignItems="center">
                <TextField
                  label="名称"
                  value={m.name}
                  onChange={e => handleMenuChangeById(m.id, "name", e.target.value)}
                  sx={{ width: 150 }}
                />
                <TextField
                  label="料金"
                  type="number"
                  value={m.price}
                  onChange={e => handleMenuChangeById(m.id, "price", e.target.value)}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="分数"
                  type="number"
                  value={m.duration}
                  onChange={e => handleMenuChangeById(m.id, "duration", e.target.value)}
                  sx={{ width: 80 }}
                />
                <TextField
                  label="女子給"
                  type="number"
                  value={m.cast_pay}
                  onChange={e => handleMenuChangeById(m.id, "cast_pay", e.target.value)}
                  sx={{ width: 100 }}
                />
                <Button variant="outlined" onClick={() => handleMenuSaveById(m.id)} sx={{ color: cyan, minWidth: 64, fontWeight: 700 }}>保存</Button>
                <Tooltip title={m.isActive === false ? "非表示中" : "表示中"}>
                  <IconButton onClick={() => toggleMenuActiveById(m.id)}>
                    {m.isActive === false ? <VisibilityOffOutlinedIcon color="disabled" /> : <VisibilityOutlinedIcon sx={{ color: cyan }} />}
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => handleMenuDelById(m.id)}><DeleteIcon sx={{ color: "#f43f5e" }} /></IconButton>
              </Stack>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleMenuAddCategory} sx={{ color: cyan, fontWeight: 700 }}>
              {categoryTab}追加
            </Button>
          </Stack>
        </Card>
      )}

      {/* --- 割引・イベント --- */}
      {tab === 2 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 1000 }}>
          <Typography fontWeight={800} color="#fbbf24" mb={2}>■ 割引・イベント設定</Typography>
          <Stack spacing={2}>
            {discountList.map((d, i) => (
              <Stack key={d.id ?? i} direction="row" gap={2} alignItems="center">
                <TextField label="割引コード" value={d.code} onChange={e => handleDiscountChange(d.id, "code", e.target.value)} sx={{ minWidth: 140 }} />
                <TextField label="内容/説明" value={d.description} onChange={e => handleDiscountChange(d.id, "description", e.target.value)} sx={{ minWidth: 180 }} />
                <TextField label="値" type="number" value={d.amount} onChange={e => handleDiscountChange(d.id, "amount", e.target.value)} sx={{ minWidth: 90 }} />
                <TextField
                  select label="タイプ" value={d.type}
                  onChange={e => handleDiscountChange(d.id, "type", e.target.value)} sx={{ minWidth: 70 }}>
                  <MenuItem value="％">％</MenuItem>
                  <MenuItem value="円">円</MenuItem>
                </TextField>
                <TextField
                  label="女子給減額"
                  type="number"
                  value={d.cast_pay_delta === undefined ? "" : d.cast_pay_delta}
                  onChange={e => handleDiscountChange(d.id, "cast_pay_delta", e.target.value)}
                  sx={{ minWidth: 100 }}
                  InputProps={{ inputProps: { min: -99999, step: 100 } }}
                />
                <Typography sx={{ color: "#aaa", fontSize: 13, minWidth: 52 }}>
                  円
                </Typography>
                <Tooltip title={d.is_active === false ? "非表示中" : "表示中"}>
                  <IconButton onClick={() => toggleDiscountActive(d.id)}>
                    {d.is_active === false ? <VisibilityOffOutlinedIcon color="disabled" /> : <VisibilityOutlinedIcon sx={{ color: "#fbbf24" }} />}
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => handleDiscountDelete(d.id)}><DeleteIcon sx={{ color: "#f43f5e" }} /></IconButton>
                <Button variant="outlined" onClick={() => handleDiscountSave(d.id)} sx={{ color: "#fbbf24", fontWeight: 700 }}>保存</Button>
              </Stack>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleDiscountAdd} sx={{ color: "#fbbf24", fontWeight: 700 }}>割引/イベント追加</Button>
          </Stack>
        </Card>
      )}


      {/* --- キャスト/スタッフ --- */}
      {tab === 3 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 720 }}>
          <Typography fontWeight={800} color={accent} mb={2}>■ キャスト・スタッフ管理</Typography>
          {passChangeMsg && (
            <Alert severity="success" sx={{ mb: 3 }}>{passChangeMsg}</Alert>
          )}
          {!staffAuth ? (
            <Box sx={{ maxWidth: 340, m: "32px auto 0 auto", p: 3, bgcolor: "#fff", borderRadius: 3, boxShadow: "0 2px 16px #e0e7ef" }}>
              <Typography mb={1.3} fontWeight={700} color={cyan}>編集には認証が必要です</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="パスワード"
                  type={showPass ? "text" : "password"}
                  value={staffPass}
                  onChange={e => {
                    setStaffPass(e.target.value);
                    setStaffError("");
                  }}
                  size="small"
                  sx={{ flex: 1 }}
                  onKeyDown={e => e.key === "Enter" && handleStaffLogin()}
                  error={!!staffError}
                  helperText={staffError}
                  autoFocus
                />
                <IconButton onClick={() => setShowPass(v => !v)}>
                  {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
                <Button variant="contained" sx={{ bgcolor: accent }} onClick={handleStaffLogin} disabled={false}>認証</Button>
              </Stack>
            </Box>
          ) : (
            <>
              <Box mb={2}>
                <Typography fontWeight={700} color={cyan} fontSize={15} mb={1}>役職管理（キャスト/内勤/ドライバー等）</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  {safeRoles.map((role, i) => (
                    <Chip
                      key={role}
                      label={role}
                      onDelete={() => handleDelRole(i)}
                      sx={{ fontWeight: 700, bgcolor: "#e0f7fa", color: cyan, mr: 0.5 }}
                      onClick={() => { }}
                    />
                  ))}
                  <TextField size="small" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="新役職" sx={{ minWidth: 120 }} />
                  <Button startIcon={<AddIcon />} onClick={handleAddRole} sx={{ color: accent, fontWeight: 700 }}>追加</Button>
                </Stack>
              </Box>
              <Stack spacing={2}>
                {staffEditList.map((s, i) => (
                  <Stack key={s.id ?? s.name + '-' + s.role + '-' + i} direction="row" gap={2} alignItems="center">
                    <TextField
                      label="キャスト/スタッフ名"
                      value={s.name}
                      onChange={e => handleStaffEditChange(i, "name", e.target.value)}
                      sx={{ minWidth: 140 }}
                    />
                    <TextField
                      select label="役割"
                      value={s.role}
                      onChange={e => handleStaffEditChange(i, "role", e.target.value)}
                      sx={{ minWidth: 120 }}
                    >
                      {safeRoles.map(r => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="パスワード"
                      value={s.password || ""}
                      onChange={e => handleStaffEditChange(i, "password", e.target.value)}
                      sx={{ minWidth: 120 }}
                      autoComplete="new-password"
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      sx={{ minWidth: 64, fontWeight: 700 }}
                      onClick={() => handleStaffSave(i)}
                    >
                      保存
                    </Button>
                    <Tooltip title={s.isActive === false ? "非表示中" : "表示中"}>
                      <IconButton onClick={() => toggleStaffActive(i)}>
                        {s.isActive === false
                          ? <VisibilityOffOutlinedIcon color="disabled" />
                          : <VisibilityOutlinedIcon sx={{ color: accent }} />}
                      </IconButton>
                    </Tooltip>
                    <IconButton onClick={() => handleStaffDel(i)}><DeleteIcon sx={{ color: "#f43f5e" }} /></IconButton>
                  </Stack>
                ))}
                <Button startIcon={<AddIcon />} onClick={handleStaffAdd} sx={{ color: accent, fontWeight: 700 }}>キャスト/スタッフ追加</Button>
              </Stack>
              <Card sx={{ bgcolor: "#f4f6fb", borderRadius: 3, mt: 4, p: 3, boxShadow: "0 2px 12px #e0e7ef" }}>
                <Typography fontWeight={700} mb={2} color={accent}>パスワード変更</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="新しいパスワード"
                    type="password"
                    value={pass1}
                    onChange={e => setPass1(e.target.value)}
                    sx={{ maxWidth: 260 }}
                  />
                  <TextField
                    label="もう一度入力"
                    type="password"
                    value={pass2}
                    onChange={e => setPass2(e.target.value)}
                    sx={{ maxWidth: 260 }}
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{ fontWeight: 700, width: 160, mt: 2 }}
                    onClick={handlePasswordChange}
                  >
                    パスワード変更
                  </Button>
                </Stack>
              </Card>
            </>
          )}
        </Card>
      )}

      {/* --- 経費・売上目標 --- */}
      {tab === 4 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 600 }}>
          <Typography fontWeight={800} color={cyan} mb={2}>■ 経費・月間売上目標</Typography>
          <Stack spacing={2}>
            <Typography fontWeight={600} color="#64748b">経費項目（例：家賃/人件費/送迎/広告/消耗品など）</Typography>
            {expenseEditList.map((item, i) => (
              <Stack key={item.id ?? i} direction="row" gap={2} alignItems="center">
                <TextField
                  value={item.name}
                  label="経費名"
                  onChange={e => handleExpenseEditChange(i, e.target.value)}
                  sx={{ flex: 1, minWidth: 220 }}
                />
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ minWidth: 64, fontWeight: 700 }}
                  onClick={() => handleExpenseSave(i)}
                >
                  保存
                </Button>
                <Tooltip title={item.is_active === false ? "非表示中" : "表示中"}>
                  <IconButton onClick={() => toggleExpenseActive(i)}>
                    {item.is_active === false
                      ? <VisibilityOffOutlinedIcon color="disabled" />
                      : <VisibilityOutlinedIcon sx={{ color: cyan }} />}
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => handleExpenseDel(i)}>
                  <DeleteIcon sx={{ color: "#f43f5e" }} />
                </IconButton>
              </Stack>
            ))}

            <Button startIcon={<AddIcon />} onClick={handleExpenseAdd} sx={{ color: cyan, fontWeight: 700 }}>経費追加</Button>

            <Divider sx={{ my: 2 }} />
            <TextField
              label="当月売上目標（円）"
              type="number"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              variant="outlined"
              sx={{ minWidth: 220 }}
            />
            <Button
              onClick={async () => {
                await saveSalesGoal(store_id, goal);
                alert("保存しました");
              }}
              sx={{ ml: 2, color: cyan, fontWeight: 700 }}
              variant="outlined"
            >
              保存
            </Button>
          </Stack>
        </Card>
      )}

      {/* --- SNS/口コミ --- */}
      {tab === 5 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 700 }}>
          <Typography fontWeight={800} color="#f472b6" mb={2}>■ SNS連携・口コミ対策</Typography>
          <Stack spacing={2}>
            <TextField label="X(Twitter) アカウント" value={safeSns.twitter} onChange={e => setSns({ ...safeSns, twitter: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={safeSns.x_enabled} onChange={e => setSns({ ...safeSns, x_enabled: e.target.checked })} />}
              label="X連携ON/OFF"
            />
            <TextField label="Instagramアカウント" value={safeSns.insta} onChange={e => setSns({ ...safeSns, insta: e.target.value })} />
            <FormControlLabel
              control={<Switch checked={safeSns.insta_enabled} onChange={e => setSns({ ...safeSns, insta_enabled: e.target.checked })} />}
              label="Instagram連携ON/OFF"
            />
            <TextField label="LINE公式 or 通知用ID" value={safeSns.line} onChange={e => setSns({ ...safeSns, line: e.target.value })} />
            <TextField label="ヘブン口コミURL" value={safeSns.slack} onChange={e => setSns({ ...safeSns, slack: e.target.value })} />
          </Stack>
          <Divider textAlign="left" sx={{ my: 3, fontWeight: 900, color: accent }}>
            シティヘブン連携
          </Divider>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <TextField
              label="ヘブンID"
              value={heavenId}
              onChange={e => setHeavenId(e.target.value)}
              sx={{ width: 170 }}
              autoComplete="username"
              disabled={heavenLoading}
            />
            <TextField
              label="パスワード"
              type="password"
              value={heavenPass}
              onChange={e => setHeavenPass(e.target.value)}
              sx={{ width: 170 }}
              autoComplete="current-password"
              disabled={heavenLoading}
            />
            <Button
              variant="outlined"
              onClick={handleHeavenAuth}
              sx={{
                fontWeight: 700,
                bgcolor:
                  heavenAuth === true
                    ? "#a7f3d0"
                    : heavenAuth === false
                      ? "#fee2e2"
                      : "#f3f4f6"
              }}
              disabled={heavenLoading}
            >
              {heavenLoading ? "認証中…" : "認証"}
            </Button>
            {(heavenAuth === true || !!sessionIdContext) && (
              <Chip label="連携中" color="success" size="small" sx={{ ml: 1 }} onClick={() => { }} />
            )}
            {heavenAuth === false && (
              <Chip label="連携失敗" color="error" size="small" sx={{ ml: 1 }} onClick={() => { }} />
            )}
          </Stack>
          {heavenMsg && (
            <Box sx={{ mt: 2 }}>
              <Typography fontSize={15} color={heavenAuth ? "#22c55e" : "#f43f5e"}>
                {heavenMsg}
              </Typography>
              {heavenErrorDetail && (
                <Box
                  component="pre"
                  sx={{
                    color: "#f43f5e",
                    fontSize: 13,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    background: "rgba(255,0,0,0.03)",
                    borderRadius: 2,
                    mt: 1.5,
                    p: 1,
                    maxWidth: 600,
                    overflowX: "auto"
                  }}
                >
                  {heavenErrorDetail}
                </Box>
              )}
            </Box>
          )}
          <Typography variant="body2" color="#64748b" sx={{ mt: 2 }}>
            ※ID/PASS情報は暗号化保存されます。<br />
            認証後、自動で写メ日記などのデータ取得が可能になります。
          </Typography>
        </Card>
      )}

      {/* --- システム/オプション --- */}
      {tab === 6 && (
        <Card sx={{ ...glassStyle, p: 4, mb: 3, maxWidth: 600 }}>
          <Typography fontWeight={800} color="#64748b" mb={2}>■ その他システム設定</Typography>
          <Stack spacing={2}>
            <TextField label="レシートプリンター型番" value={printer || ""} onChange={e => setPrinter(e.target.value)} />
            <TextField label="バックアップ先メール" value={backupEmail || ""} onChange={e => setBackupEmail(e.target.value)} />
            <FormControlLabel
              control={<Switch checked={!!autoClose} onChange={e => setAutoClose(e.target.checked)} />}
              label="自動締め（深夜自動クローズON/OFF）"
            />
          </Stack>
        </Card>
      )}
    </Box>
  );
}
