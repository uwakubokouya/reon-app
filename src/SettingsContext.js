import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./lib/supabase"; // ←src/lib/supabase.js のパスでOK

// --- localStorage utility
const loadFromStorage = (key, defaultValue) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
};
const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// --- 管理画面の全店舗情報から label を取得
function getLabelForStore(storeId) {
  try {
    const all = JSON.parse(localStorage.getItem("reon_admin_stores") || "[]");
    return all.find(s => s.id === storeId)?.label || "";
  } catch {
    return "";
  }
}

// --- Context用：全店舗共通のデータ（最初の雛形）
const defaultSettings = {
  shop: { open: "10:00", close: "00:00", holiday: ["日曜"], table: 12, seat: 40 },
  categories: ["コース", "OP", "指名"],
  menuList: [],
  discounts: [],  // ★ここを追加（初期値は空配列でOK）
  coupons: [
    { code: "新人割", desc: "新人期間2000円割引", amount: 2000, type: "円", is_active: true },
    { code: "メルマガ割", desc: "3000円引き", amount: 3000, type: "円", is_active: true }
  ],
  roles: ["店長", "スタッフ", "キャスト"],
  staff: [
    { name: "山田花子", role: "店長", is_active: true },
    { name: "田中太郎", role: "スタッフ", is_active: true },
    { name: "あい", role: "キャスト", is_active: true }
  ],
  expenseItems: [
    { name: "固定費", is_active: true },
    { name: "消耗品", is_active: true },
    { name: "雑費", is_active: true }
  ],
  goal: "1000000",
  sns: { twitter: "", insta: "", line: "", slack: "", x_enabled: true, insta_enabled: false },
  backupEmail: "",
  printer: "",
  autoClose: false,
  checklistDefault: [
    { label: "レジ現金点検", checked: false },
    { label: "ゴミ出し完了", checked: false },
    { label: "個室・待機場清掃、備品チェック", checked: false },
    { label: "施錠/消灯", checked: false }
  ],
  orderList: [],
  dailyReports: [],
  label: "",
};

// データをdefaultSettingsに準拠させる
const sanitize = (data, def) => {
  if (!data) return def;
  const clean = { ...def, ...data };
  Object.keys(def).forEach(k => {
    if (typeof def[k] === "object" && !Array.isArray(def[k]) && def[k] !== null) {
      clean[k] = { ...def[k], ...(data[k] || {}) };
    }
  });
  return clean;
};

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  // 現在の店舗ID
  const [currentStoreId, setCurrentStoreId] = useState(() => loadFromStorage("currentStoreId", null));
  const [storeDataMap, setStoreDataMap] = useState(() => {
    const loaded = loadFromStorage("reon-storeDataMap", {});
    for (const id in loaded) {
      if (!loaded[id].label) loaded[id].label = getLabelForStore(id);
    }
    return loaded;
  });

  // --- menusをDBから取得して反映 ---
  const [menuList, setMenuList] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    const fetchMenus = async () => {
      if (!currentStoreId) {
        setMenuList([]);
        return;
      }
      setMenuLoading(true);
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", currentStoreId)
        .eq("is_active", true);
      if (!error && data) {
        setMenuList(data);
      } else {
        setMenuList([]);
        if (error) console.error("メニュー取得エラー", error);
      }
      setMenuLoading(false);
    };
    fetchMenus();
  }, [currentStoreId]);

  // === discounts（割引・イベント）をDBから取得して反映 ===
  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);

  useEffect(() => {
    const fetchDiscounts = async () => {
      if (!currentStoreId) {
        setDiscounts([]);
        return;
      }
      setDiscountsLoading(true);
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("store_id", currentStoreId)
        .order("id");
      if (!error && data) {
        setDiscounts(data);
      } else {
        setDiscounts([]);
        if (error) console.error("割引取得エラー", error);
      }
      setDiscountsLoading(false);
    };
    fetchDiscounts();
  }, [currentStoreId]);

  // ヘブン連携セッションID
  const [sessionMap, setSessionMap] = useState(() => loadFromStorage("reon_heaven_sessionMap", {}));
  const sessionId = currentStoreId && sessionMap[currentStoreId] ? sessionMap[currentStoreId] : "";

  // sessionIdのセット
  const setSessionId = (id, storeId = null) => {
    setSessionMap(prev => {
      const sid = storeId || currentStoreId;
      if (!sid) return prev;
      const updated = { ...prev, [sid]: id };
      saveToStorage("reon_heaven_sessionMap", updated);
      return updated;
    });
  };
  // sessionIdのクリア
  const clearSessionId = () => {
    setSessionMap(prev => {
      if (!currentStoreId) return prev;
      const updated = { ...prev };
      delete updated[currentStoreId];
      saveToStorage("reon_heaven_sessionMap", updated);
      return updated;
    });
  };

  // 店舗追加
  const addStore = (newStoreId) => {
    setStoreDataMap(prev => {
      if (prev[newStoreId]) return prev;
      const label = getLabelForStore(newStoreId);
      const updated = {
        ...prev,
        [newStoreId]: { ...sanitize({}, defaultSettings), label }
      };
      saveToStorage("reon-storeDataMap", updated);
      return updated;
    });
  };

  // 店舗削除
  const removeStore = (storeId) => {
    setStoreDataMap(prev => {
      const updated = { ...prev };
      delete updated[storeId];
      saveToStorage("reon-storeDataMap", updated);
      return updated;
    });
  };

  // 店舗ラベル更新
  const updateLabelForStore = (storeId, newLabel) => {
    setStoreDataMap(prev => {
      const updated = {
        ...prev,
        [storeId]: { ...sanitize(prev[storeId], defaultSettings), label: newLabel }
      };
      saveToStorage("reon-storeDataMap", updated);
      return updated;
    });
  };

  // 今の店舗データを返す（menuListだけDBの内容で上書き）
  const getCurrentStoreData = () => {
    if (!currentStoreId) return { ...defaultSettings, menuList, discounts };
    const storeData = sanitize(storeDataMap[currentStoreId], defaultSettings);
    return { ...storeData, menuList, discounts }; // ← menuList/discountsはDB内容
  };
  const currentData = getCurrentStoreData();

  // setterは今の店舗データだけ更新
  const updateCurrentStore = (key, value) => {
    if (!currentStoreId) return;
    setStoreDataMap(prev => {
      const label = getLabelForStore(currentStoreId) || prev[currentStoreId]?.label || "";
      const updated = {
        ...prev,
        [currentStoreId]: { ...sanitize(prev[currentStoreId], defaultSettings), [key]: value, label }
      };
      saveToStorage("reon-storeDataMap", updated);
      return updated;
    });
  };

  // 各データのsetter
  const setShop = (val) => updateCurrentStore("shop", val);
  const setCategories = (val) => updateCurrentStore("categories", val);
  const setCoupons = (val) => updateCurrentStore("coupons", val);
  const setRoles = (val) => updateCurrentStore("roles", val);
  const setStaff = (val) => updateCurrentStore("staff", val);
  const setExpenseItems = (val) => updateCurrentStore("expenseItems", val);
  const setGoal = (val) => updateCurrentStore("goal", val);
  const setSns = (val) => updateCurrentStore("sns", val);
  const setBackupEmail = (val) => updateCurrentStore("backupEmail", val);
  const setPrinter = (val) => updateCurrentStore("printer", val);
  const setAutoClose = (val) => updateCurrentStore("autoClose", val);
  const setChecklistDefault = (val) => updateCurrentStore("checklistDefault", val);
  const setOrderList = (val) => updateCurrentStore("orderList", val);
  const setDailyReports = (val) => updateCurrentStore("dailyReports", val);

  // ストレージ同期
  useEffect(() => { saveToStorage("currentStoreId", currentStoreId); }, [currentStoreId]);
  useEffect(() => { saveToStorage("reon-storeDataMap", storeDataMap); }, [storeDataMap]);
  useEffect(() => { saveToStorage("reon_heaven_sessionMap", sessionMap); }, [sessionMap]);

  // Contextで提供
  const value = {
    currentStoreId,
    setCurrentStoreId,
    storeDataMap,
    shop: currentData.shop,
    setShop,
    categories: currentData.categories,
    setCategories,
    menuList: currentData.menuList,
    menuLoading,
    setMenuList,
    discounts: currentData.discounts, // ← これがDBの内容
    discountsLoading,
    setDiscounts,
    coupons: currentData.coupons,
    setCoupons,
    roles: currentData.roles,
    setRoles,
    staff: currentData.staff,
    setStaff,
    expenseItems: currentData.expenseItems,
    setExpenseItems,
    goal: currentData.goal,
    setGoal,
    sns: currentData.sns,
    setSns,
    backupEmail: currentData.backupEmail,
    setBackupEmail,
    printer: currentData.printer,
    setPrinter,
    autoClose: currentData.autoClose,
    setAutoClose,
    checklistDefault: currentData.checklistDefault,
    setChecklistDefault,
    orderList: currentData.orderList,
    setOrderList,
    dailyReports: currentData.dailyReports,
    setDailyReports,
    label: currentData.label,
    // ヘブンセッションID連携
    sessionId,
    setSessionId,
    clearSessionId,
    // 店舗管理
    addStore,
    removeStore,
    updateLabelForStore,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

// --- store_id変換ヘルパー
export function mapStoreIdForDB(currentStoreId) {
  return currentStoreId;
}
