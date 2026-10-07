import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { TaskForm } from './components/task-form/task-form';
import { MasterInfoPanel } from './components/master-info-panel/master-info-panel';
import { Task } from './models/task.model';
import { ParentProject } from './models/project.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, KanbanBoard, TaskForm, MasterInfoPanel],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  isFormOpen: boolean = false;
  currentMode: 'KANBAN' | 'GANTT' = 'KANBAN';

  // サンプル親課題（Master）
  selectedProject: ParentProject | null = {
    id: 'proj-1',
    title: '課題管理アプリ開発',
    description: 'BeSideFlow AI の Master-Detail UI および核心機能の実装',
    priority: 'HIGH',
    tags: ['開発', 'アプリ', 'Angular'],
    status: 'in_progress',
    scheduledEndDate: '2026-10-26',
    deadline: '2026-11-01',
    docLinks: [
      { title: '仕様書_v1.1', url: '#' },
      { title: 'UIレイアウト仕様書', url: '#' }
    ],
    memos: [
      { timestamp: '10/06 14:00', content: 'Master-Detail UI 骨格の構築に着手' }
    ],
    totalTaskCount: 3,
    completedTaskCount: 1,
    progressPercentage: 33
  };

  // 全タスクデータ（`parentId` で親課題と紐付け）
  allTasks: Task[] = [
    {
      id: 'task-1',
      parentId: 'proj-1',
      title: '要件定義・データモデル設計',
      status: 'done',
      priority: 'high',
      progress: 100,
      tags: ['設計'],
      deadline: '2026-10-05'
    },
    {
      id: 'task-2',
      parentId: 'proj-1',
      title: '画面遷移図とUI仕様書の作成',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      tags: ['UI設計', 'Angular'],
      deadline: '2026-10-15'
    },
    {
      id: 'task-3',
      parentId: 'proj-1',
      title: 'フロント結合テスト',
      status: 'todo',
      progress: 0,
      priority: 'high',
      tags: ['結合'],
      deadline: '2026-10-25'
    }
  ];

  // 選択中プロジェクトに属する子タスクのみを動的抽出
  get filteredSubtasks(): Task[] {
    if (!this.selectedProject) return [];
    return this.allTasks.filter(t => t.parentId === this.selectedProject?.id);
  }

  openForm(): void { this.isFormOpen = true; }
  closeForm(): void { this.isFormOpen = false; }

  switchViewMode(mode: 'KANBAN' | 'GANTT'): void {
    this.currentMode = mode;
  }

  onCloseMasterDetail(): void {
    this.selectedProject = null;
  }

  onTaskCreated(newTask: Task): void {
    if (this.selectedProject) {
      newTask.parentId = this.selectedProject.id;
    }
    this.allTasks = [newTask, ...this.allTasks];
    this.updateProjectProgress();
  }

  updateProjectProgress(): void {
    if (!this.selectedProject) return;
    const subtasks = this.filteredSubtasks;
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === 'done').length;
    
    this.selectedProject.totalTaskCount = total;
    this.selectedProject.completedTaskCount = completed;
    this.selectedProject.progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}