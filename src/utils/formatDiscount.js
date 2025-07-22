// utils/formatDiscount.js

/**
 * 割引codeリストからラベル文字列（例："SPA割100, サイコロ100"）を返す
 * @param {Array|string} discountCodes 割引code配列 or 単体
 * @param {Array} discountOptions [{code, label}]
 * @returns {string}
 */
export function formatDiscount(discountCodes, discountOptions) {
  if (!discountCodes) return "";
  // 配列でなければ配列化
  const codes = Array.isArray(discountCodes) ? discountCodes : [discountCodes];
  // コード→label変換
  return codes
    .map(code => {
      const found = discountOptions.find(opt => opt.code === code);
      return found?.label || found?.code || code || "";
    })
    .filter(Boolean)
    .join(", ");
}
