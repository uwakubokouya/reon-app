import { supabase } from "./supabase";

// 1件（日付指定）取得
export async function fetchDailyReport(storeId, reportDate) {
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("store_id", storeId)
    .eq("report_date", reportDate)
    .single();
  return { data, error };
}

// 月ごと一覧（全履歴）取得
export async function fetchDailyReports(storeId, month) {
  // month例: "2025-06"
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("store_id", storeId)
    .gte("report_date", `${month}-01`)
    .lte("report_date", `${month}-31`)
    .order("report_date", { ascending: false });
  return { data, error };
}

// 日報アップサート（insert or update）
export async function upsertDailyReport(storeId, reportDate, values) {
  const { data, error } = await supabase
    .from("daily_reports")
    .upsert([
      {
        store_id: storeId,
        report_date: reportDate,
        ...values,
      }
    ], {
      onConflict: ['store_id', 'report_date']
    });
  return { data, error };
}

// （必要なら）削除
export async function deleteDailyReport(storeId, reportDate) {
  const { data, error } = await supabase
    .from("daily_reports")
    .delete()
    .eq("store_id", storeId)
    .eq("report_date", reportDate);
  return { data, error };
}
