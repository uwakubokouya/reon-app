// 全ランクで全機能を利用可能なダミー
export const FEATURE_LIST = [
  "storeAdmin",      // 店舗管理
  "timetable",       // 出勤管理・タイムテーブル
  "dailyReport",     // 日報・締め作業
  "castAnalysis",    // キャスト分析
  "castSalary",      // キャスト給与詳細
  "compare",         // キャスト比較
  "diaryCount",      // 写メ日記投稿数
  "courseOp",        // コース/OP別売上
  "kpiDetail",       // KPI詳細
  "reservationList", // 予約履歴
  "heavenTimeChart", // タイムチャート
  "jobOffer",        // 求人管理
  "diaryAnalysis",   // 写メ日記分析
  "castDiaryTab",    // 在籍キャスト分析タブの日記分析
  // 必要に応じて他も追記
];

// 機能ごとのアクセス可否設定
const FEATURE_ACCESS = {
  diaryTab: ["S"],
  castDiaryAnalysis: ["S"],
  // 必要に応じて他も追加
};

// 利用可否チェック（exportは1つだけ！）
export function canUseFeature(feature, rank = "all") {
  if (!feature) return false;
  if (!FEATURE_ACCESS[feature]) return true; // 制御未指定は全開放
  return FEATURE_ACCESS[feature].includes(rank);
}
