const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const dayjs = require('dayjs'); 

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzEfLs0FRT0khQEiWaDTA35z6vCeXoSPtOu_R20ywwwldgiyjdNjz_f6qgyPgbF7j80/exec";

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  // --- ここでCSPヘッダを全レスポンスに付与 ---
win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-inline' data:;",
        "connect-src 'self' https://zkufbcvorhoyfafukeom.supabase.co https://api.open-meteo.com https://nominatim.openstreetmap.org http://localhost:8000 ws://localhost:3000;",
        "img-src 'self' data:;",
        "style-src 'self' 'unsafe-inline';",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' data:;"
      ].join(' ')
    }
  });
});


  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  win.webContents.openDevTools();
}

// GAS連携
ipcMain.handle('check-store-auth', async (event, storeId, pass) => {
  const url = `${GAS_API_URL}?id=${encodeURIComponent(storeId)}&pass=${encodeURIComponent(pass)}`;
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return res.data;
  } catch (e) {
    return { status: "error", message: e.message };
  }
});

// シティヘブンAPIプロキシ
ipcMain.handle('heaven-login', async (event, heavenId, heavenPass) => {
  try {
    const res = await axios.post('http://localhost:8000/api/heaven/login', {
      heaven_id: heavenId,
      heaven_pass: heavenPass
    });
    return res.data;
  } catch (e) {
    return {
      ok: false,
      message: e?.response?.data?.detail || e?.response?.data?.message || e.message || "認証失敗",
      raw: e?.response?.data || null
    };
  }
});

ipcMain.handle('heaven-diary-count', async (event, sessionId) => {
  try {
    const res = await axios.get('http://localhost:8000/api/heaven/diary_count', {
      params: { session_id: sessionId }
    });
    return res.data;
  } catch (e) {
    return {
      ok: false,
      message: e?.response?.data?.detail || e?.response?.data?.message || e.message || "取得失敗",
      raw: e?.response?.data || null
    };
  }
});

ipcMain.handle('heaven-diary-list', async (event, sessionId, fromDate, toDate) => {
  try {
    let result = { diaries: [] };
    let start = dayjs(fromDate);
    let end = dayjs(toDate);

    for (
      let d = start;
      d.isBefore(end.add(1, 'day')); // end日も含める
      d = d.add(1, 'day')
    ) {
      // 1日ごとにAPI叩く（例：/api/heaven/diary_list?session_id=xxx&date=2025-07-01）
      const res = await axios.get('http://localhost:8000/api/heaven/diary_list', {
        params: {
          session_id: sessionId,
          date: d.format('YYYY-MM-DD')
        }
      });
      if (res.data?.diaries?.length) {
        result.diaries = result.diaries.concat(res.data.diaries);
      }
    }
    result.ok = true;
    return result;
  } catch (e) {
    return {
      diaries: [],
      ok: false,
      message: e?.response?.data?.detail || e?.response?.data?.message || e.message || "取得失敗",
      raw: e?.response?.data || null
    };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
