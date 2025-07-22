import React, { useState, useEffect } from "react";
import {
  Box, Paper, Typography, TextField, Button, InputAdornment,
  IconButton, FormControlLabel, Checkbox, Tabs, Tab
} from "@mui/material";
import KeyIcon from "@mui/icons-material/VpnKey";
import StoreIcon from "@mui/icons-material/Store";
import PersonIcon from "@mui/icons-material/Person";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { supabase } from "../lib/supabase";

// 管理者
const ADMIN_ID = "uwakubo";
const ADMIN_SECRET = "0906";
const STORE_LIST_KEY = "reon_admin_stores";

const accent = "#6366f1";
const cyan = "#06b6d4";
const gradBG = "linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 80%)";

// 店舗データ取得
function getStoreList() {
  try { return JSON.parse(localStorage.getItem(STORE_LIST_KEY) || "[]"); } catch { return []; }
}

export default function LoginPage({ onLogin, onAdminLogin, onCastLogin }) {
  const [tab, setTab] = useState(0); // 0:店舗, 1:キャスト
  // 店舗
  const [storeId, setStoreId] = useState("");
  const [password, setPassword] = useState("");
  // キャスト
  const [castId, setCastId] = useState("");
  const [castPass, setCastPass] = useState("");
  // 共通
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [saveLogin, setSaveLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  // 初期値セット
  useEffect(() => {
    const savedFlag = localStorage.getItem("reon_saveLogin") === "true";
    if (savedFlag) {
      setSaveLogin(true);
      setStoreId(localStorage.getItem("reon_storeId") || "");
      setPassword(localStorage.getItem("reon_password") || "");
      setCastId(localStorage.getItem("reon_castId") || "");
      setCastPass(localStorage.getItem("reon_castPass") || "");
    }
  }, []);

  // 店舗ID入力時
  const handleStoreId = (e) => {
    setStoreId(e.target.value);
    if (saveLogin) localStorage.setItem("reon_storeId", e.target.value);
  };
  // 店舗パスワード入力時
  const handlePassword = (e) => {
    setPassword(e.target.value);
    if (saveLogin) localStorage.setItem("reon_password", e.target.value);
  };
  // キャストパスワード入力時
  const handleCastPass = (e) => {
    setCastPass(e.target.value);
    if (saveLogin) localStorage.setItem("reon_castPass", e.target.value);
  };

  const updateAdminPassword = async (newPassword) => {
  const { error } = await supabase
    .from("stores")
    .update({ password: newPassword })
    .eq("store_id", "admin");
  if (error) {
    alert("更新失敗: " + error.message);
  } else {
    alert("パスワード変更完了");
  }
};

  // ログイン共通処理
  const handleLogin = async () => {
    setError(""); setLoading(true);

    // 店舗ログインはSupabaseから毎回確認
    if (tab === 0) {
  const { data: user, error } = await supabase
    .from("stores")
    .select("*")
    .eq("store_id", storeId)
    .eq("password", password)
    .maybeSingle();

  setLoading(false);

  if (user) {
    if (user.is_admin) {
      if (onAdminLogin) onAdminLogin();
      return;
    } else {
      if (user.status === "停止") {
        setError("この店舗は現在停止中です");
        return;
      }
      if (onLogin) onLogin(storeId, password, user);
      return;
    }
  } else {
    setError("店舗IDまたはパスワードが違います");
    return;
  }
}

    // キャストログイン（Supabaseで直接認証）
    if (tab === 1) {
      // パスワードでキャスト取得
      const { data: cast, error: dbError } = await supabase
        .from("casts")
        .select("*")
        .eq("password", castPass)
        .maybeSingle();
      setLoading(false);

      if (cast && cast.id && cast.password === castPass) {
        // 追加：キャストの所属店舗（store_id）で店舗データを取得
        if (!cast.store_id) {
          setError("キャスト情報に店舗IDが登録されていません");
          return;
        }
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .select("status")
          .eq("store_id", cast.store_id)
          .maybeSingle();
        if (!store || store.status === "停止") {
          setError("この店舗は現在停止中です（キャストログイン不可）");
          return;
        }

        // 通常ログイン処理
        if (saveLogin) {
          localStorage.setItem("reon_castId", cast.id);
          localStorage.setItem("reon_castPass", castPass);
          localStorage.setItem("reon_saveLogin", "true");
        } else {
          localStorage.removeItem("reon_castId");
          localStorage.removeItem("reon_castPass");
          localStorage.setItem("reon_saveLogin", "false");
        }
        if (onCastLogin) onCastLogin(cast.id, cast.password, cast);
      } else {
        setError("パスワードが違います");
      }
      return;
    }
  };

  // チェックボックス変更
  const handleCheckbox = (e) => {
    setSaveLogin(e.target.checked);
    if (!e.target.checked) {
      localStorage.removeItem("reon_storeId");
      localStorage.removeItem("reon_password");
      localStorage.removeItem("reon_castId");
      localStorage.removeItem("reon_castPass");
      localStorage.setItem("reon_saveLogin", "false");
    } else {
      // 現時点の値を保存
      localStorage.setItem("reon_storeId", storeId);
      localStorage.setItem("reon_password", password);
      localStorage.setItem("reon_castId", castId);
      localStorage.setItem("reon_castPass", castPass);
      localStorage.setItem("reon_saveLogin", "true");
    }
  };

  useEffect(() => {
    setError("");
    setShowPw(false);
  }, [tab]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: gradBG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        sx={{
          width: 370,
          p: 4,
          borderRadius: 6,
          boxShadow: 7,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#fff",
        }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, width: "100%" }}>
          <Tab icon={<StoreIcon />} label="店舗ログイン" />
          <Tab icon={<PersonIcon />} label="キャストログイン" />
        </Tabs>
        {tab === 0 ? (
          <>
            <Typography
              variant="h5"
              fontWeight={800}
              color={accent}
              mb={1}
              letterSpacing={1.5}
            >
              店舗ID・パスワードログイン
            </Typography>
            <Typography color="text.secondary" fontSize={15} mb={3}>
              店舗IDとパスワードを入力してください
            </Typography>
            <TextField
              label="店舗ID"
              value={storeId}
              onChange={handleStoreId} 
              variant="outlined"
              fullWidth
              autoFocus
              sx={{ mb: 2, bgcolor: "#f8fafc" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <StoreIcon sx={{ color: cyan }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="パスワード"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={handlePassword}
              variant="outlined"
              fullWidth
              sx={{ mb: 2, bgcolor: "#f8fafc" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon sx={{ color: accent }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPw((s) => !s)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        ) : (
          <>
            <Typography
              variant="h5"
              fontWeight={800}
              color={accent}
              mb={1}
              letterSpacing={1.5}
            >
              キャストログイン
            </Typography>
            <Typography color="text.secondary" fontSize={15} mb={3}>
              パスワードを入力してください
            </Typography>
            <TextField
              label="パスワード"
              type={showPw ? "text" : "password"}
              value={castPass}
              onChange={handleCastPass}
              variant="outlined"
              fullWidth
              autoFocus
              sx={{ mb: 2, bgcolor: "#f8fafc" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon sx={{ color: accent }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPw((s) => !s)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={saveLogin}
              onChange={handleCheckbox}
              sx={{ color: cyan, "&.Mui-checked": { color: accent } }}
            />
          }
          label={
            <Typography fontSize={13} color="#64748b">
              次回からID・パスワードを自動入力する
            </Typography>
          }
          sx={{ alignSelf: "flex-start", mb: 1, ml: 0.5 }}
        />

        {error && (
          <Typography color="error" fontSize={14} mb={2} fontWeight={600}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={handleLogin}
          sx={{
            bgcolor: accent,
            color: "#fff",
            fontWeight: 900,
            fontSize: 18,
            mt: 1,
            px: 4,
            borderRadius: 3,
            "&:hover": { bgcolor: "#5856d6" },
            boxShadow: "0 2px 8px #6366f133",
          }}
          fullWidth
          disabled={loading}
        >
          {loading ? "認証中..." : "ログイン"}
        </Button>
      </Paper>
    </Box>
  );
}
