import React from "react";
import { Box, Avatar, Typography, Badge, IconButton } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";

export default function Header() {
  return (
    <Box
      sx={{
        position: "fixed",          // ← これで上部固定
        top: 0,
        left: { xs: 0, md: "230px" }, // サイドバー幅分ずらす
        width: { xs: "100vw", md: "calc(100vw - 230px)" }, // サイドバー分引く
        height: 60,
        zIndex: 100,
        bgcolor: "#fff",
        borderBottom: "1px solid #e0e3ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",   // ← 右寄せ
        pr: 4,
        boxShadow: "0 2px 6px rgba(80,110,130,0.07)",
      }}
    >
      {/* 通知 */}
      <IconButton>
        <Badge badgeContent={3} color="error">
          <NotificationsIcon color="action" />
        </Badge>
      </IconButton>
      {/* ユーザー名 */}
      <Typography sx={{ mx: 1, fontWeight: "bold", color: "#17a2c5" }}>
        demo_user
      </Typography>
      {/* アバター */}
      <Avatar src="" alt="user" sx={{ ml: 1, bgcolor: "#3fd4ff", color: "#fff" }} />
    </Box>
  );
}
