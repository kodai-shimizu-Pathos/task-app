import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterInfoPanel } from './components/master-info-panel/master-info-panel';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { TaskForm } from './components/task-form/task-form';
import { ParentProject } from './models/project.model';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    MasterInfoPanel, 
    KanbanBoard, 
    TaskForm
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  // --- アプリ全体の状態保持 (Single Source of Truth) ---
  selectedProject: ParentProject | null = null;
  allTasks: Task[] = [];
  
  // 表示モード管理（カンバンモード / ガントチャートモード）
  currentMode: 'KANBAN' | 'GANTT' = 'KANBAN';

  // 🔴 テーマ管理（ダークテーマ / ライトテーマ）を追加
  currentTheme: 'dark' | 'light' = 'dark';

  // モーダル・パネルの表示状態
  isFormOpen = false;
  taskToEdit: Task | null = null;

  ngOnInit(): void {
    document.body.setAttribute('data-theme', this.currentTheme);
    this.loadInitialData();
  }

  // 🔴 テーマ切り替えハンドラ
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  // 表示モード切替ハンドラ
  switchViewMode(mode: 'KANBAN' | 'GANTT'): void {
    this.currentMode = mode;
  }

  // Master-Detail パネル閉じるハンドラ
  onCloseMasterDetail(): void {
    this.selectedProject = null;
    this.closeForm();
  }

  // 表示中の親課題に紐づく子タスクのみを抽出
  get filteredSubtasks(): Task[] {
    if (!this.selectedProject) return [];
    return this.allTasks.filter(task => task.parentId === this.selectedProject?.id);
  }

  // パネル・モーダル開閉ハンドラ
  openForm(): void {
    this.taskToEdit = null;
    this.isFormOpen = true;
  }

  onTaskSelected(task: Task): void {
    console.log('Appまでイベントが届きました:', task);
    this.taskToEdit = task;
    this.isFormOpen = true;
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.taskToEdit = null;
  }

  // タスクデータ操作 (CRUD) ＆ 進捗自動同期
  onTaskCreated(newTask: Task): void {
    if (this.selectedProject) {
      newTask.parentId = this.selectedProject.id;
    }
    this.allTasks = [newTask, ...this.allTasks];
    this.updateProjectProgress();
  }

  onTaskUpdated(updatedTask: Task): void {
    this.allTasks = this.allTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    this.updateProjectProgress();
  }

  onTaskDeleted(taskId: string): void {
    this.allTasks = this.allTasks.filter(t => t.id !== taskId);
    this.updateProjectProgress();
  }

  updateProjectProgress(): void {
    if (!this.selectedProject) return;
    
    const subtasks = this.filteredSubtasks;
    const total = subtasks.length;
    const completed = subtasks.filter(t => t.status === 'done').length;
    
    this.selectedProject.totalTaskCount = total;
    this.selectedProject.completedTaskCount = completed;
    this.selectedProject.progressPercentage = total > 0 ? 
      Math.round((completed / total) * 100) : 0;
  }

  private loadInitialData(): void {
    // 1. サンプル親課題（プロジェクト）のセット
    this.selectedProject = {
      id: 'proj-1',
      title: '課題管理アプリ開発',
      description: 'BeSideFlow AI の Master-Detail UI および核心機能の実装',
      priority: 'HIGH',
      tags: ['開発', 'アプリ', 'Angular'],
      status: 'in-progress',
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
  
    // 2. サンプル子タスク一覧のセット
    this.allTasks = [
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
        status: 'in-progress',
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
        priority: 'high',
        progress: 0,
        tags: ['結合'],
        deadline: '2026-10-25'
      }
    ];
  
    // 3. 親課題の進捗率を初期計算
    this.updateProjectProgress();
  }
}