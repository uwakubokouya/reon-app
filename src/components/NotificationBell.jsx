import React, { useState } from "react";
import { Badge, IconButton, Popover, Box, Typography, Button } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DoneAllIcon from "@mui/icons-material/DoneAll";

const accent = "#6366f1";
const cyan = "#06b6d4";

export default function NotificationBell({ notifications = [], onRead }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const unread = notifications.filter(n => !n.read);
  const unreadCount = unread.length;

  const handleOpen = e => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton onClick={handleOpen} size="large" sx={{ color: accent }}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon sx={{ fontSize: 29 }} />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            mt: 1,
            p: 2,
            minWidth: 340,
            maxWidth: 400,
            background: "rgba(255,255,255,0.97)",
            borderRadius: 3,
            boxShadow: "0 8px 36px #818cf855,0 2px 8px #06b6d414"
          }
        }}
      >
        <Typography sx={{
          fontWeight: 900,
          color: accent,
          fontSize: 18,
          letterSpacing: 1.5,
          mb: 2,
          ml: 0.5
        }}>お知らせ</Typography>

        {notifications.length === 0 && (
          <Typography color="#888" fontWeight={600} fontSize={15}>通知はありません。</Typography>
        )}

        {notifications.length > 0 && (
          <Box sx={{ mb: 1, textAlign: "right" }}>
            {unreadCount > 0 &&
              <Button
                size="small"
                variant="text"
                color="primary"
                startIcon={<DoneAllIcon />}
                onClick={() => onRead && onRead("all")}
                sx={{
                  fontWeight: 700,
                  borderRadius: 8,
                  px: 1.5,
                  color: cyan,
                  minHeight: 24
                }}
              >
                全て既読にする
              </Button>
            }
          </Box>
        )}

        <Box sx={{ maxHeight: 310, overflowY: "auto" }}>
          {unread.map((n, i) => (
            <Box
              key={n.report_date || i}
              sx={{
                mb: 1.2,
                px: 2,
                py: 1.2,
                display: "flex",
                alignItems: "center",
                bgcolor: "#e0e7ff",
                borderRadius: 2.4,
                boxShadow: "0 3px 14px #6366f115",
                border: "1.2px solid #a5b4fc"
              }}
            >
              <IconButton
                size="small"
                onClick={() => onRead && onRead(i)}
                sx={{ mr: 1, color: cyan }}
              >
                <RadioButtonUncheckedIcon />
              </IconButton>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 15.2,
                    color: "#222",
                    fontWeight: 700,
                    mb: 0.3,
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    overflow: "hidden"
                  }}
                >
                  {n.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12.2,
                    color: "#8c98b9",
                    fontWeight: 500,
                    letterSpacing: 0.5
                  }}
                >
                  {(n.created_at || "").replace("T", " ").slice(0, 16)}
                </Typography>
                {n.body && (
                  <Typography
                    sx={{
                      fontSize: 13,
                      color: "#444",
                      fontWeight: 400,
                      mt: 0.3,
                      whiteSpace: "pre-line"
                    }}
                  >
                    {n.body}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
