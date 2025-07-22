import axios from "axios";

export const getDiaryList = async (sessionId, fromDate, toDate) => {
  const res = await window.electronAPI.heavenDiaryList(sessionId, fromDate, toDate);
  if (res.diaries) {
    return res.diaries;
  } else {
    throw new Error(res.message || "日記リスト取得失敗");
  }
};

export const loginHeaven = async (heaven_id, heaven_pass) => {
  const res = await window.electronAPI.heavenLogin(heaven_id, heaven_pass);
  if (res.ok) {
    return { data: res }; // ← res.session_id をセットで返す
  } else {
    const error = new Error(res.message || "認証失敗");
    error.response = { data: { detail: res.message || "認証失敗" } };
    throw error;
  }
};

export const getDiaryCount = async (session_id, shopdir) => {
  const res = await fetch(`/api/heaven/diary_count?session_id=${session_id}&shopdir=${shopdir}`);
  const data = await res.json();
  if (data.ok) {
    return data;
  } else {
    throw new Error(data.detail || "取得失敗");
  }
};

