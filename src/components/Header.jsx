import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Typography, Avatar, Button, Modal, Paper, TextField,
  Tabs, Tab, IconButton, List, ListItem, ListItemText, Checkbox, CircularProgress
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationBell from "./NotificationBell";
import { useSettings } from "../SettingsContext";
import { supabase } from "../lib/supabase";

// 配信先キャスト取得用のダミー（本番はDBから取得推奨）
async function fetchCastList(store_id) {
  const { data } = await supabase
    .from("casts")
    .select("id, name")
    .eq("store_id", store_id || "natural");
  return data || [];
}

export default function Header({ onLogout }) {
  const { currentStoreId, storeDataMap } = useSettings();

  const [now, setNow] = useState(new Date());
  const [noticeModal, setNoticeModal] = useState(false);
  const [tabIdx, setTabIdx] = useState(0);

  // お知らせ入力用
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [castOptions, setCastOptions] = useState([]);
  const [selectedCastIds, setSelectedCastIds] = useState([]);
  const [isAll, setIsAll] = useState(true);
  const [saving, setSaving] = useState(false);

  // お知らせ履歴
  const [notices, setNotices] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [editId, setEditId] = useState(null); // 編集対象ID

  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!currentStoreId) return setNotifications([]);
    const { data: reportList } = await supabase
      .from("daily_reports")
      .select("report_date, memo, memo_readed")
      .eq("store_id", currentStoreId)
      .order("report_date", { ascending: false })
      .limit(10);

    const notifications = (reportList || [])
      .filter(r => r.memo && r.memo !== "EMPTY" && r.memo.trim() !== "")
      .map(r => ({
        title: "本日引き継ぎ事項",
        body: r.memo,
        created_at: r.report_date + "T00:00:00",
        type: "report_memo",
        report_date: r.report_date,
        read: !!r.memo_readed, // DBの値に合わせて
      }));

    setNotifications(notifications);
  }, [currentStoreId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleRead = async (idxOrAll) => {
    if (idxOrAll === "all") {
      // 全件既読
      for (const n of notifications.filter(n => !n.read)) {
        await supabase.from("daily_reports")
          .update({ memo_readed: true })
          .eq("store_id", currentStoreId)
          .eq("report_date", n.report_date);
      }
    } else {
      // 1件既読
      const n = notifications.filter(n => !n.read)[idxOrAll];
      if (!n) return;
      await supabase.from("daily_reports")
        .update({ memo_readed: true })
        .eq("store_id", currentStoreId)
        .eq("report_date", n.report_date);
    }
    fetchNotifications();
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);
  const timeString = now.toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });

  const storeLabel =
    storeDataMap?.[currentStoreId]?.label
      ? `店舗名: ${storeDataMap[currentStoreId].label}`
      : currentStoreId
        ? `店舗ID: ${currentStoreId}`
        : "未ログイン";

  useEffect(() => {
    if (!currentStoreId) return;
    fetchCastList(currentStoreId).then(setCastOptions);
  }, [currentStoreId]);

  const fetchNotices = async () => {
    setLoadingNotices(true);
    const { data } = await supabase
      .from("notices")
      .select("*")
      .eq("store_id", currentStoreId)
      .order("created_at", { ascending: false });
    setNotices(data || []);
    setLoadingNotices(false);
  };
  useEffect(() => {
    if (noticeModal && tabIdx === 1) fetchNotices();
    // eslint-disable-next-line
  }, [noticeModal, tabIdx]);

  const handleSendNotice = async () => {
    setSaving(true);
    const isEdit = !!editId;
    const payload = {
      title: noticeTitle,
      body: noticeBody,
      store_id: currentStoreId,
      cast_ids: isAll ? null : selectedCastIds,
    };
    let result;
    if (isEdit) {
      result = await supabase
        .from("notices")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editId);
    } else {
      result = await supabase
        .from("notices")
        .insert([{ ...payload }]);
    }
    setSaving(false);
    if (result.error) return alert("保存に失敗しました\n" + result.error.message);

    setNoticeTitle("");
    setNoticeBody("");
    setSelectedCastIds([]);
    setIsAll(true);
    setEditId(null);
    fetchNotices();
    setTabIdx(1);
  };

  const handleEdit = (n) => {
    setNoticeTitle(n.title);
    setNoticeBody(n.body);
    setSelectedCastIds(n.cast_ids || []);
    setIsAll(!n.cast_ids || n.cast_ids.length === 0);
    setEditId(n.id);
    setTabIdx(0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("本当に削除しますか？")) return;
    await supabase.from("notices").delete().eq("id", id);
    fetchNotices();
  };

  const toggleCast = (cid) => {
    if (selectedCastIds.includes(cid)) {
      setSelectedCastIds(selectedCastIds.filter(id => id !== cid));
    } else {
      setSelectedCastIds([...selectedCastIds, cid]);
    }
  };

  // 配信モーダルUI
  const noticeModalUI = (
    <Modal open={noticeModal} onClose={() => setNoticeModal(false)}>
      <Paper sx={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)", p: 4, width: 500, maxWidth: "100vw"
      }}>
        <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ mb: 2 }}>
          <Tab label={editId ? "お知らせ編集" : "新規配信"} />
          <Tab label="配信履歴" />
        </Tabs>
        {tabIdx === 0 && (
          <>
            <TextField
              label="タイトル"
              value={noticeTitle}
              onChange={e => setNoticeTitle(e.target.value)}
              fullWidth sx={{ mb: 1 }}
            />
            <TextField
              label="本文"
              value={noticeBody}
              onChange={e => setNoticeBody(e.target.value)}
              fullWidth multiline minRows={3}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography fontSize={14} fontWeight={700} mb={0.5}>
                配信先キャスト
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Checkbox
                  checked={isAll}
                  onChange={e => setIsAll(e.target.checked)}
                />
                <Typography
                  onClick={() => setIsAll(true)}
                  sx={{ cursor: "pointer", userSelect: "none", fontSize: 13 }}
                >全員</Typography>
                {!isAll && (
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {castOptions.map(c => (
                      <Button
                        key={c.id}
                        onClick={() => toggleCast(c.id)}
                        size="small"
                        variant={selectedCastIds.includes(c.id) ? "contained" : "outlined"}
                        sx={{ minWidth: 0, px: 1, fontSize: 13 }}
                      >
                        {c.name}
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={1.5} mt={1.5}>
              <Button
                variant="contained"
                sx={{ bgcolor: "#6366f1", fontWeight: 700 }}
                disabled={!noticeTitle || !noticeBody || saving}
                onClick={handleSendNotice}
              >
                {editId ? "編集保存" : "配信"}
              </Button>
              {editId && (
                <Button onClick={() => {
                  setEditId(null); setNoticeTitle(""); setNoticeBody(""); setSelectedCastIds([]); setIsAll(true);
                }}>キャンセル</Button>
              )}
              <Button onClick={() => setNoticeModal(false)} color="inherit">閉じる</Button>
            </Box>
          </>
        )}
        {tabIdx === 1 && (
          <Box>
            {loadingNotices ? (
              <Box textAlign="center" mt={4}><CircularProgress /></Box>
            ) : (
              <List dense>
                {notices.length === 0 && <ListItem><ListItemText primary="お知らせ履歴なし" /></ListItem>}
                {notices.map(n => (
                  <ListItem
                    disableGutters
                    key={n.id}
                    alignItems="flex-start"
                    sx={{ position: "relative", minHeight: 72 }}
                  >
                    <ListItemText
                      primary={`${n.title}（${n.created_at?.slice(0, 16).replace("T", " ")}）`}
                      secondary={n.body}
                      sx={{
                        pr: 6, // ボタン分の余白
                        wordBreak: "break-all",
                        whiteSpace: "pre-line"
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.3
                      }}
                    >
                      <IconButton size="small" onClick={() => handleEdit(n)}><EditIcon /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(n.id)}><DeleteIcon /></IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>
    </Modal>
  );

  return (
    <Box
      sx={{
        width: "calc(100% - 230px)",
        height: 75,
        px: 3,
        py: 0.5,
        bgcolor: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        borderBottom: "1px solid #e5e7eb",
        position: "fixed",
        top: 0,
        left: 230,
        overflow: "visible",
        zIndex: 1200,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          minWidth: 200,
          flexShrink: 0,
          overflow: "visible",
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          position="relative"
          flexShrink={0}
          overflow="visible"
        >
          <Box display="flex" alignItems="center" gap={1.7}>
            <NotificationBell
              notifications={notifications}
              onRead={handleRead}
            />
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: "#6366f1", color: "#fff", fontWeight: 700, px: 2, mx: 0.7, boxShadow: "none", minWidth: 0 }}
              onClick={() => setNoticeModal(true)}
            >
              お知らせ配信
            </Button>
            <Typography fontWeight={700} color="#6366f1" fontSize={17} sx={{ pr: 0.7 }}>
              {storeLabel}
            </Typography>
            <Avatar sx={{
              bgcolor: "#38bdf8",
              color: "#fff",
              width: 35,
              height: 35,
              fontSize: 19
            }}>U</Avatar>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography fontSize={10.5} color="#94a3b8" sx={{ fontWeight: 500, mt: 0.5 }}>
              最終更新：{timeString} 現在
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={onLogout}
              sx={{ fontSize: 10.5, height: 17, px: 1.5, ml: 1 }}
            >
              ログアウト
            </Button>
          </Box>
        </Box>
      </Box>
      {noticeModalUI}
    </Box>
  );
}
