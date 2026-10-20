/** タスクの優先度レベル */
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'high' | 'medium' | 'low';

/** タスク・親課題のステータス */
export type Status = 'todo' | 'in-progress' | 'done' | 'archived';

/** チェックリスト項目 */
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  addedAfterStart?: boolean;
}

/** タスク（子タスク）のデータモデル */
export interface Task {
  id: string;
  userId?: string;
  title: string;
  status: Status;
  priority: PriorityLevel;
  progress: number;
  tags: string[];
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  deadline?: string;
  parentId?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  checklist?: ChecklistItem[];
}
