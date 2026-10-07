export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

// 1件のタスクが持つ情報の形 (設計図)
export interface Task {
    id: string; // タスクID (例： 'task-1')
    title: string; // タスク名
    status: 'todo' | 'in_progress' | 'done'; // ステータス(未着手|進行中|完了)
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
    // prerequisitesTaskIds?: string[]; // 依存関係・前提タスクのID(例：['task-1', 'task-2'])
    // isRoutine?: boolean // ルーチンタスクかどうか
    // routineInterval?: 'daily' | 'weekly' | 'monthly'; // ルーチンタスクの間隔(日|週|月)
    // estimatedTime?: number; // 作業予定時間
    // isOverdue?: boolean; // 期限超過フラグ
    // createdBy?: string; // 作成者 (ユーザーID)
    // updatedBy?: string; // 更新者 (ユーザーID)
    // assignedTo?: string; // 担当者 (ユーザーID)
    // attachments?: string[]; // 添付ファイルのURL(例：['https://example.com/file1.pdf', 'https://example.com/file2.jpg'])
    // comments?: string[]; // コメント(例：['コメント1', 'コメント2'])
    // subTasks?: Task[]; // サブタスク(例：[Task, Task])
    // reminders?: string[]; // リマインダー(例：['2026-01-01 10:00:00', '2026-01-02 10:00:00'])
    // notes?: string[]; // ノート(例：['ノート1', 'ノート2'])
}