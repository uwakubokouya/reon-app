// utils/salesData.js など別ファイル推奨（同じファイル内に書いてもOK）

// --- 前日から過去1週間分 ---
export function getPastWeekData(dailyReports) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(yesterday);
  weekAgo.setDate(yesterday.getDate() - 6);

  // 例: 2025-06-07 → 6/7
  const formatMD = d => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  return dailyReports
    .filter(r => new Date(r.report_date) >= weekAgo && new Date(r.report_date) <= yesterday)
    .sort((a, b) => new Date(a.report_date) - new Date(b.report_date))
    .map(r => ({
      date: formatMD(r.report_date),
      sales: Number(r.sales_cash) || 0,
      profit: Math.round((Number(r.sales_cash) || 0) * 0.3), // 利益は例（必要なら修正）
    }));
}

// --- 月別（先月から6か月分） ---
export function getPast6MonthsData(dailyReports) {
  const today = new Date();
  const months = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  months.reverse();

  // 月ごとに集計
  const grouped = {};
  for (const r of dailyReports) {
    const m = (r.report_date || "").slice(0, 7);
    if (!months.includes(m)) continue;
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(r);
  }

  // 集計
  return months.map(month => {
    const records = grouped[month] || [];
    const sales = records.reduce((sum, r) => sum + (Number(r.sales_cash) || 0), 0);
    const profit = Math.round(sales * 0.3); // 利益は例
    return {
      date: `${Number(month.split("-")[1])}月`,
      sales,
      profit,
    };
  });
}
