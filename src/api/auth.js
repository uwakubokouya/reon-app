// src/api/auth.js
export async function checkStoreAuth(storeId, pass) {
  // preload.jsで contextBridge で公開したAPIを使う
  if (window.api && window.api.checkStoreAuth) {
    return await window.api.checkStoreAuth(storeId, pass);
  }
  return { status: "error", message: "APIブリッジが無効です" };
}
