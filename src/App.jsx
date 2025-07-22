import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NotificationBell from "./components/NotificationBell";
import DashboardPage from "./pages/DashboardPage";
import DailyReportPage from "./pages/DailyReportPage";
import SalesPage from "./pages/SalesPage";
import SnsAnalysisPage from "./pages/SnsAnalysisPage";
import AiAdvicePage from "./pages/AiAdvicePage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import StoreAdminPage from "./pages/StoreAdminPage";
import TimetablePage from "./pages/TimetablePage";
import CustomerListPage from "./pages/CustomerListPage";
import CastMyPage from "./pages/CastMyPage"; // ← 必ずimport
import { SettingsProvider, useSettings } from "./SettingsContext";

function MainApp() {
  const [page, setPage] = useState("dashboard");
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [castUser, setCastUser] = useState(null); // ← キャストユーザー
  const { setCurrentStoreId, currentStoreId } = useSettings();

  // 店舗ログイン
  const handleLogin = (id, pass) => {
    setLoggedIn(true);
    setCastUser(null);      // ← キャスト情報をクリア
    setCurrentStoreId(id);
  };
  // 管理画面ログイン
  const handleAdminLogin = () => {
    setAdminMode(true);
    setCastUser(null);      // ← キャスト情報をクリア
  };
  // キャストログイン
  const handleCastLogin = (castId, castPass, castObj) => {
    setLoggedIn(false);
    setAdminMode(false);
    setCurrentStoreId(null);
    setCastUser(castObj);   // ← キャスト情報をセット
    setPage("castmypage");
  };
  // ログアウト（全ユーザー共通）
  const handleLogout = () => {
    setLoggedIn(false);
    setAdminMode(false);
    setCurrentStoreId(null);
    setCastUser(null);
    setNotifications([]);
    localStorage.removeItem("reon_loggedIn");
    localStorage.removeItem("currentStoreId");
  };

  // 通知追加
  const addNotification = memoText => {
    if (!memoText) return;
    setNotifications(prev => [
      {
        text: memoText,
        timestamp: new Date().toLocaleString(),
        read: false
      },
      ...prev
    ]);
  };

  // 通知既読化
  const handleNotificationRead = idx => {
    setNotifications(prev =>
      prev.map((n, i) =>
        idx === "all" ? { ...n, read: true } : i === idx ? { ...n, read: true } : n
      )
    );
  };

  // 管理画面
  if (adminMode) {
    return <StoreAdminPage onLogout={handleLogout} />;
  }

  // ★★ キャストマイページ
  if (page === "castmypage" && castUser) {
    return <CastMyPage cast={castUser} onLogout={handleLogout} />;
  }

  // 店舗ログインユーザー
  if (loggedIn) {
    return (
      <div style={{ display: "flex" }}>
        <Sidebar page={page} setPage={setPage} />
        <div
          style={{
            marginLeft: 230,
            width: "100%",
            minHeight: "100vh",
            background: "linear-gradient(90deg, #e0e7ff 0%, #f1f5f9 80%)",
            position: "relative"
          }}
        >
          <Header
            onLogout={handleLogout}
            notifications={notifications}
            onReadNotification={handleNotificationRead}
          />
          <div style={{ marginTop: 75, padding: 0 }}></div>
          {page === "dashboard" && <DashboardPage />}
          {page === "daily" && <DailyReportPage addNotification={addNotification} />}
          {page === "sales" && <SalesPage />}
          {page === "sns" && <SnsAnalysisPage />}
          {page === "advice" && <AiAdvicePage />}
          {page === "settings" && <SettingsPage />}
          {page === "tabelog" && <TimetablePage />}
          {page === "customers" && <CustomerListPage />}
        </div>
      </div>
    );
  }

  // ログイン画面（onCastLogin追加！）
  return (
    <LoginPage
      onLogin={handleLogin}
      onAdminLogin={handleAdminLogin}
      onCastLogin={handleCastLogin}
    />
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <MainApp />
    </SettingsProvider>
  );
}
