import React from "react";
import { Card, Box, Typography, Button } from "@mui/material";

export function AdminLteBox({ color, value, label, icon, infoLabel = "詳細情報", onClick }) {
  return (
    <Card
      sx={{
        bgcolor: color.bg,
        color: color.text,
        borderRadius: 2,
        px: 2.5, py: 2.2,
        minWidth: 280, minHeight: 128,
        position: "relative",
        overflow: "hidden",
        boxShadow: "none", // 影消し
        border: "1.5px solid #ededed"
      }}
      elevation={0}
    >
      {/* KPI数字＋ラベル */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography sx={{ fontSize: 34, fontWeight: 900, mb: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: 17.5, fontWeight: 700, opacity: 0.92, mt: 0.6 }}>
            {label}
          </Typography>
        </Box>
        <Box sx={{
          fontSize: 54,
          color: color.icon,
          opacity: 0.24,
          position: "absolute",
          right: 22, top: 16,
          pointerEvents: "none"
        }}>{icon}</Box>
      </Box>
      {/* 下部 詳細ボタン */}
      <Button
        onClick={onClick}
        size="small"
        variant="text"
        sx={{
          mt: 2.1,
          pl: 0, color: color.text,
          fontWeight: 800, fontSize: 14.3,
          opacity: 0.93,
          textTransform: "none"
        }}
        endIcon={
          <span style={{ fontWeight: "bold", fontSize: 17, marginLeft: 4 }}>⟶</span>
        }
      >{infoLabel}</Button>
    </Card>
  );
}

// サンプルのカラーパレット（AdminLTE基本4色）
export const lteColors = {
  info:    { bg: "#3c8dbc", text: "#fff", icon: "#fff" },
  success: { bg: "#00a65a", text: "#fff", icon: "#fff" },
  warning: { bg: "#f39c12", text: "#fff", icon: "#fff" },
  danger:  { bg: "#dd4b39", text: "#fff", icon: "#fff" },
};
