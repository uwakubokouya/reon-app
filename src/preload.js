// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  heavenLogin: (id, pass) => ipcRenderer.invoke('heaven-login', id, pass),
  heavenDiaryCount: (sessionId) => ipcRenderer.invoke('heaven-diary-count', sessionId),
  heavenDiaryList: (sessionId, fromDate, toDate) => ipcRenderer.invoke('heaven-diary-list', sessionId, fromDate, toDate),
});

