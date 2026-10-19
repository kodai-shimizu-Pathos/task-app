export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'high' | 'medium' | 'low';
export type Status = 'todo' | 'in-progress' | 'done' | 'archived';

// チェックリスト項目のインターフェース
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  addedAfterStart?: boolean; // 作業着手後に追加されたフラグ
}

// 1件のタスクが持つ情報の形 (設計図)
export interface Task {
    id: string; // タスクID (例： 'task-1')
    userId?: string; // ユーザーID
    title: string; // タスク名
    status: Status; // ステータス(未着手|進行中|完了)
    priority: PriorityLevel; // 優先度
    progress: number; // 進捗度(1~100)
    tags: string[]; // タグ(例：['work', 'personal', 'urgent'])
    scheduledStartDate?: string; // 作業開始予定日 (yyyy-mm-dd)
    scheduledEndDate?: string; // 作業完了予定日 (yyyy-mm-dd)
    deadline?: string; // 最終締切日 (yyyy-mm-dd)
    parentId?: string; // 親課題のID (Master-Detail UI時の紐づけに使用)
    description?: string; // タスクの説明
    createdAt?: string; // 作成日時 (yyyy-mm-dd HH:MM:SS)
    updatedAt?: string; // 更新日時 (yyyy-mm-dd HH:MM:SS)
    checklist?: ChecklistItem[]; // チェックリスト（軽量チェックリスト）
}
