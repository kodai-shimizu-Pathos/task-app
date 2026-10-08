import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterInfoPanel } from './components/master-info-panel/master-info-panel';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { TaskForm } from './components/task-form/task-form';
import { ParentProject } from './models/project.model';
import { Task } from './models/task.model';
import { ProjectForm } from './components/project-form/project-form';
import { MasterKanbanBoard } from './components/master-kanban-board/master-kanban-board';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    MasterInfoPanel, 
    KanbanBoard, 
    TaskForm,
    ProjectForm,
    MasterKanbanBoard
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  // --- アプリ全体の状態保持 (Single Source of Truth) ---  
  currentView: 'kanban' | 'gantt' = 'kanban';
  currentTheme: 'dark' | 'light' = 'dark';

  // 親課題(Project)一覧・選択状態
  projects: ParentProject[] = [];
  selectedProject: ParentProject | null = null;

  // 子タスク(Task)一覧・選択状態
  tasks: Task[] = [];
  selectedTask: Task | null = null;

  // 親課題 (Project) フォームの表示状態
  isProjectFormOpen = false;
  projectToEdit?: ParentProject | null = null;  

  // 子タスク (Task) フォームの表示状態
  isTaskFormOpen = false;
  taskToEdit: Task | null = null;

  
  // テーマ切り替えハンドラ
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  // 表示モード切替ハンドラ
  switchViewMode(view: 'kanban' | 'gantt'): void {
    this.currentView = view;
  }
  
  ngOnInit(): void {
    document.body.setAttribute('data-theme', this.currentTheme);
    this.loadInitialData();
  }

  // =======================================================
  // 親課題(Project)操作ロジック
  // =======================================================

  // 親課題を選択
  onSelectProject(project: ParentProject): void {
    this.selectedProject = project;
    this.loadTasksForProject(project.id);
  }

  // 一覧へ戻る処理
  onUnselectProject(): void {
    this.selectedProject = null;
    this.tasks = [];
  }

  // 新規の親課題フォームを開く
  onOpenNewProjectForm(): void {
    this.projectToEdit = null;
    this.isProjectFormOpen = true;
  }

  // 既存の親課題の編集フォームを開く
  onEditProject(): void {
    if (this.selectedProject) {
      this.projectToEdit = { ...this.selectedProject };
      this.isProjectFormOpen = true;
    }
  }

  // 親課題フォームを閉じる
  onCloseProjectForm(): void {
    this.isProjectFormOpen = false;
    this.projectToEdit = null;
  }

  // 親課題の作成完了ハンドラ
  onProjectCreated(newProject: ParentProject): void {
    this.projects.push(newProject);
    this.selectedProject = newProject;
    this.tasks = [];
    this.onCloseProjectForm();
  }

  // 親課題の更新完了ハンドラ
  onProjectUpdated(updatedProject: ParentProject): void {
    const index = this.projects.findIndex(p => p.id === updatedProject.id);
    if (index !== -1) {
      this.projects[index] = updatedProject;
      if (this.selectedProject?.id === updatedProject.id) {
        this.selectedProject = updatedProject;
      }
    }
    this.onCloseProjectForm();
  }

  // 親課題の削除完了ハンドラ
  onProjectDeleted(projectId: string): void {
    // プロジェクト一覧から削除
    this.projects = this.projects.filter(p => p.id !== projectId);

    // 紐づく子タスクも削除
    this.tasks = this.tasks.filter(t => t.parentId !== projectId);

    // 別のプロジェクトを選択、なければクリア
    if (this.projects.length > 0) {
      this.selectedProject = this.projects[0];
      this.loadTasksForProject(this.selectedProject.id);
    } else {
      this.selectedProject = null;
      this.tasks = [];
    }
    this.onCloseProjectForm();
  }

  // =======================================================
  // 子タスク(Task)操作ロジック
  // =======================================================

  // タスク選択時 (カードクリック)
  onSelectTask(task: Task): void {
    this.taskToEdit = task? { ...task } : null;
    this.isTaskFormOpen = true;
  }

  // 新規タスク追加フォームを開く
  onOpenNewTaskForm(): void {
    this.taskToEdit = null;
    this.isTaskFormOpen = true;
  }

  // タスクフォームを閉じる
  onCloseTaskForm(): void {
    this.isTaskFormOpen = false;
    this.taskToEdit = null;
  }

  // タスクの作成完了ハンドラ
  onTaskCreated(newTask: Task): void {
    this.tasks.push(newTask);
    this.recalculateProgress();
    this.onCloseTaskForm();
  }

  // タスクの更新完了ハンドラ
  onTaskUpdated(updatedTask: Task): void {
    const index = this.tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
      this.recalculateProgress();
    }
    this.onCloseTaskForm();
  }

  // タスクの削除完了ハンドラ
  onTaskDeleted(taskId: string): void {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.recalculateProgress();
    this.onCloseTaskForm();
  }

  // 進捗率と完了タスク数の自動再計算
  private recalculateProgress(): void {
    if (!this.selectedProject) return;
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'done').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.selectedProject.totalTaskCount = total;
    this.selectedProject.completedTaskCount = completed;
    this.selectedProject.progressPercentage = percentage;

    // projects 配列内の該当プロジェクトの進捗率を更新
    const index = this.projects.findIndex(p => p.id === this.selectedProject?.id);
    if (index !== -1) {
      this.projects[index] = { ...this.selectedProject };
    }
  }

  // ==========================================
  // 初期データロード処理
  // ==========================================

  private loadInitialData(): void {
    // サンプル親課題データ
    const sampleProject: ParentProject = {
      id: 'proj-1',
      title: 'BeSideFlow AI 開発フェーズ1',
      description: 'デスクトップ常駐型タスクパートナーアプリの基礎設計とMaster-Detail UIの実装。',
      
      // 🔴 不足していた必須プロパティを追加
      status: 'in-progress',
      priority: 'high',
      tags: ['開発', 'UI'],

      scheduledStartDate: '2026-10-01',
      scheduledEndDate: '2026-10-31',
      deadline: '2026-11-15',
      progressPercentage: 0,
      completedTaskCount: 0,
      totalTaskCount: 0,
      docLinks: [
        { title: '仕様書 v1.1', url: 'https://example.com/spec' },
        { title: 'UIレイアウト仕様書', url: 'https://example.com/ui-spec' }
      ],
      createdAt: new Date().toISOString()
    };

    this.projects = [sampleProject];
    this.selectedProject = sampleProject;

    // サンプル子タスクのロード
    this.loadTasksForProject(sampleProject.id);
  }

  private loadTasksForProject(projectId: string): void {
    // サンプル子タスク一覧
    const sampleTasks: Task[] = [
      {
        id: 'task-1',
        parentId: projectId,
        title: 'Master-Detail UI のレイアウト構築',
        description: '左側にMasterエリア、右側にカンバンボードを配置するレイアウトの実装。',
        status: 'done',
        priority: 'high',
        progress: 100, // 🔴 追加 (完了なので100%)
        tags: ['UI', 'レイアウト'], // 🔴 追加
        deadline: '2026-10-05',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-2',
        parentId: projectId,
        title: 'テーマ切り替え機能（ダーク/ライト）の実装',
        description: 'styles.cssのCSS変数とbodyタグのdata-theme属性によるテーマ切り替え。',
        status: 'in-progress',
        priority: 'medium',
        progress: 50, // 🔴 追加 (進行中なので50%)
        tags: ['CSS', 'テーマ'], // 🔴 追加
        deadline: '2026-10-10',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-3',
        parentId: projectId,
        title: 'ガントチャート表示モードの構築',
        description: 'SCR-04 ガントチャートモード画面コンポーネントの作成とデータ連動。',
        status: 'todo',
        priority: 'low',
        progress: 0, // 🔴 追加 (未着手なので0%)
        tags: ['機能開発'], // 🔴 追加
        deadline: '2026-10-25',
        createdAt: new Date().toISOString()
      }
    ];

    this.tasks = sampleTasks;
    this.recalculateProgress();
  }
}