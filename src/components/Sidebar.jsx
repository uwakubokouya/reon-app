import React, { useState, useEffect } from "react";
import {
  Dashboard, TableChart, Restaurant, Analytics, Chat, Settings, Delete,
} from "@mui/icons-material";
import { Button, Box, Typography, Select, MenuItem, IconButton } from "@mui/material";
import { useSettings } from "../SettingsContext";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { supabase } from "../lib/supabase"; // ← supabase読み込み必須

const menuList = [
  { key: "dashboard", label: "ダッシュボード", icon: <Dashboard /> },
  { key: "sales", label: "月間売上データ", icon: <TableChart /> },
  { key: "daily", label: "日報・締め", icon: <TableChart /> },
  { key: "tabelog", label: "スケジュール", icon: <Restaurant /> },
  { key: "customers", label: "顧客管理", icon: <PersonAddAltIcon /> },
  //{ key: "sns", label: "SNS分析", icon: <Analytics /> },
  //{ key: "advice", label: "AIアドバイス", icon: <Chat /> },
  { key: "settings", label: "設定", icon: <Settings /> },
];

export default function Sidebar({ page, setPage }) {
  const {
    currentStoreId,
    setCurrentStoreId,
    removeStore,
  } = useSettings();

  const [storeList, setStoreList] = useState([]); // 表示する店舗リスト（系列で絞る）
  const [currentStore, setCurrentStore] = useState(null);

  // 1. 現在の店舗情報をDBから取得
  useEffect(() => {
    if (!currentStoreId) return;
    (async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("store_id", currentStoreId)
        .single();
      if (data) setCurrentStore(data);
    })();
  }, [currentStoreId]);

  // 2. 系列店舗のみstoreListにセット（系列未設定なら自分だけ）
  useEffect(() => {
    if (!currentStore) return;
    const series = currentStore.series || currentStore.group || "";
    (async () => {
      let stores = [];
      if (series && series !== "null" && series !== "") {
        // 系列で絞る
        const { data } = await supabase
          .from("stores")
          .select("*")
          .eq("series", series);
        stores = data || [];
      } else {
        // 系列未設定なら自分だけ
        stores = [currentStore];
      }
      setStoreList(stores);
    })();
  }, [currentStore]);

  // 3. 店舗切替時
  const handleChangeStore = (id) => {
    setCurrentStoreId(id);
    localStorage.setItem("reon_current_shopdir", id);
  };

  // 4. 初期化時にlocalStorageから選択
  useEffect(() => {
    if (!currentStoreId) {
      const stored = localStorage.getItem("reon_current_shopdir");
      if (stored) setCurrentStoreId(stored);
    }
  }, [currentStoreId, setCurrentStoreId]);

  // 5. 削除ボタン
  const handleDeleteStore = () => {
    if (!currentStore) return;
    if (window.confirm(`本当に「${currentStore.label || currentStore.store_id}」を削除しますか？`)) {
      removeStore(currentStore.store_id);
      const remaining = storeList.filter(s => s.store_id !== currentStore.store_id);
      if (remaining.length) {
        handleChangeStore(remaining[0].store_id);
      } else {
        setCurrentStoreId("");
        localStorage.removeItem("reon_current_shopdir");
      }
    }
  };

  // 店舗名表示
  const currentName = currentStore?.name || currentStore?.store_id || "REON";

  return (
    <Box sx={{
      width: 230,
      bgcolor: "#1e293b",
      color: "#fff",
      minHeight: "100vh",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 1100,
      boxShadow: "2px 0 8px #0001",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* --- 店舗セレクタ --- */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography fontWeight={800} fontSize={15} color="#38bdf8" sx={{ mb: 0.5 }}>
          店舗選択
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Select
            value={currentStoreId || ""}
            onChange={e => handleChangeStore(e.target.value)}
            size="small"
            fullWidth
            sx={{
              bgcolor: "#fff",
              color: "#222",
              borderRadius: 1,
              fontWeight: 700,
              fontSize: 15,
              mb: 0.5,
              '& .MuiSelect-select': { py: 1, px: 1.5 }
            }}
          >
            {storeList.map(store => (
              <MenuItem value={store.store_id} key={store.store_id}>
                {store.name || store.store_id}
              </MenuItem>
            ))}
          </Select>
          {storeList.length > 1 && currentStoreId &&
            <IconButton
              color="error"
              size="small"
              sx={{ ml: 0.5 }}
              onClick={handleDeleteStore}>
              <Delete fontSize="small" />
            </IconButton>
          }
        </Box>
      </Box>

      {/* --- メニュー --- */}
      <Box>
        {menuList.map((item) => (
          <Button
            key={item.key}
            variant={page === item.key ? "contained" : "text"}
            onClick={() => setPage(item.key)}
            startIcon={item.icon}
            sx={{
              color: "#fff",
              justifyContent: "flex-start",
              mb: 1,
              background: page === item.key ? "#334155" : "transparent",
              fontWeight: page === item.key ? "bold" : "normal",
              fontSize: "1.05rem",
              textTransform: "none",
              borderRadius: "0 20px 20px 0"
            }}
            fullWidth
          >
            {item.label}
          </Button>
        ))}
      </Box>
      <Box flex={1} />
      <Box sx={{ mb: 2, textAlign: "center", color: "#fff6" }}>
        <Typography fontSize={11}>© REON.AI</Typography>
      </Box>
    </Box>
  );
}