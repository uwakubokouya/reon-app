import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// 各ページ
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
// ※他ページも同様にimport
// import TabelogPage from "./pages/TabelogPage";
// import SNSPage from "./pages/SNSPage";
// import AdvicePage from "./pages/AdvicePage";
// import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const [page, setPage] = useState("dashboard"); // ページ状態

  // サイドバーから選択されたページに応じて表示を切り替える
  function renderPage() {
    switch (page) {
      case "dashboard":
        return <DashboardPage />;
      case "sales":
        return <SalesPage />;
      // 他ページもここに追加
      // case "tabelog":
      //   return <TabelogPage />;
      // case "sns":
      //   return <SNSPage />;
      // case "advice":
      //   return <AdvicePage />;
      // case "settings":
      //   return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  }

  return (
    <Box sx={{ width: "100vw", minHeight: "100vh", display: "flex", bgcolor: "#f1f5f9" }}>
      <Sidebar page={page} setPage={setPage} />
      <Box sx={{
        flex: 1,
        marginLeft: { xs: 0, md: "230px" }, // サイドバー幅と合わせて調整
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f1f5f9",
      }}>
        <Header />
        {/* メインエリア（縦スクロール可・横スクロール禁止） */}
        <Box sx={{
          flex: 1,
          width: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          p: 0,
          paddingTop: "40px",
        }}>
          {renderPage()}
        </Box>
      </Box>
    </Box>
  );
}
