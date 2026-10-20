/** 遅延理由の分類 */
export type DelayReason = 'estimation' | 'interruption' | 'condition' | 'external' | 'unclassified';

/** 遅延ログのデータモデル */
export interface DelayLog {
  id?: string;
  taskId: string;
  taskTitle: string;
  previousDueDate: string;
  newDueDate: string;
  reason: DelayReason;
  createdAt: string;
}

/** 遅延理由ラベルと表示用アイコンのマッピング */
export const DELAY_REASON_LABELS: Record<DelayReason, { label: string; icon: string }> = {
  estimation: { label: '見積もり不足', icon: '⏱️' },
  interruption: { label: '割り込みタスク', icon: '⚡' },
  condition: { label: '集中力・体調・気分', icon: '😴' },
  external: { label: '要件変更・外部要因', icon: '🌧️' },
  unclassified: { label: '未分類（スキップ）', icon: '❓' },
};