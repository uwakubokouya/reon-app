import React, { useState } from "react";
import { Dashboard, TableChart, Restaurant, Analytics, Chat, Settings } from "@mui/icons-material";
import { Button, Box, Typography } from "@mui/material";

const menuList = [
  { key: "dashboard", label: "ダッシュボード", icon: <Dashboard /> },
  { key: "sales", label: "月間売上データ", icon: <TableChart /> },
  { key: "tabelog", label: "食べログデータ", icon: <Restaurant /> },
  { key: "sns", label: "SNS分析", icon: <Analytics /> },
  { key: "ai", label: "AIアドバイス", icon: <Chat /> },
  { key: "settings", label: "設定", icon: <Settings /> },
];

export default function Sidebar({ page, setPage }) {
  return (
    <Box sx={{
      width: 230, bgcolor: "#1e293b", color: "#fff", minHeight: "100vh",
      position: "fixed", left: 0, top: 0, zIndex: 1100, boxShadow: "2px 0 8px #0001", display: "flex", flexDirection: "column"
    }}>
      <Typography variant="h4" sx={{
        textAlign: "center", my: 3, fontWeight: 700, letterSpacing: 2
      }}>REON</Typography>
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
