import { PriorityLevel } from './task.model';
import { Status } from './task.model';

/** 親課題（プロジェクト）のデータモデル */
export interface ParentProject {
  id: string;
  userId?: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  tags: string[];
  status: Status;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  deadline?: string;
  docLinks?: { title: string; url: string }[];
  memos?: { timestamp: string; content: string }[];
  totalTaskCount: number;
  completedTaskCount: number;
  progressPercentage: number;
  createdAt?: string;
  updatedAt?: string;
}