import { PriorityLevel } from "./task.model";
import { Status } from "./task.model";

// 親課題 (Project) インターフェース
export interface ParentProject {
    id: string; // 親課題ID
    title: string; // 親課題名
    description?: string; // 親課題の説明
    priority: PriorityLevel; // 優先度
    tags: string[]; // タグ
    status: Status; // ステータス
    scheduledStartDate?: string; // 作業開始予定日 (yyyy-mm-dd)
    scheduledEndDate?: string; // 作業完了予定日 (yyyy-mm-dd)
    deadline?: string; // 最終締切日 (yyyy-mm-dd)
    docLinks?: { title: string; url: string }[]; // ドキュメントリンク
    memos?: { timestamp: string; content: string }[]; // メモ
    totalTaskCount: number; // 総タスク数
    completedTaskCount: number; // 完了タスク数
    progressPercentage: number; // 子タスク進捗率
    // createdAt?: string; // 作成日時 (yyyy-mm-dd HH:MM:SS)
    // updatedAt?: string; // 更新日時 (yyyy-mm-dd HH:MM:SS)
}