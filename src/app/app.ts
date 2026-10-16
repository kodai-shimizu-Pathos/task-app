import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePocketPanelComponent } from './components/side-pocket-panel/side-pocket-panel';
import { SidePocketMemo } from './services/task-data';
import { AppShell, MainView } from './components/app-shell/app-shell';
import { MasterInfoPanel } from './components/master-info-panel/master-info-panel';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { TaskForm } from './components/task-form/task-form';
import { TaskDataService } from './services/task-data';
import { ParentProject } from './models/project.model';
import { Task } from './models/task.model';
import { ProjectForm } from './components/project-form/project-form';
import { MasterKanbanBoard } from './components/master-kanban-board/master-kanban-board';
import { GanttBoard } from './components/gantt-board/gantt-board';
import { ArchiveModal } from './components/archive-modal/archive-modal';
import { PipService } from './services/pip';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    SidePocketPanelComponent,
    MasterInfoPanel, 
    KanbanBoard, 
    TaskForm,
    ProjectForm,
    MasterKanbanBoard,
    GanttBoard,
    AppShell,
    ArchiveModal,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  private dataService = inject(TaskDataService);
  private pipService = inject(PipService);

  // --- モーダル表示フラグ ---
  isArchiveModalOpen = false;

  // --- アーカイブデータ取得プロパティ ---
  get archivedProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'archived');
  }

  get archivedTasks(): Task[] {
    return this.allTasks.filter(t => t.status === 'archived');
  }

  // --- 通常表示用のフィルタ済みプロパティ ---
  get activeProjects(): ParentProject[] {
    return this.projects.filter(p => p.status !== 'archived');
  }

  // --- UI状態管理 ---  
  /** サイドパネル用：'tasks'(課題管理メイン) | 'review'(AIレビュー) */
  activeView: 'tasks' | 'review' = 'tasks';

  /** ヘッダーのモードトグル用：'KANBAN' | 'GANTT' */
  currentMode: 'KANBAN' | 'GANTT' = 'KANBAN';

  currentTheme: 'dark' | 'light' = 'dark';

  // 昇格処理中のメモIDを一時保持するプロパティ
  promotingMemoId: string | null = null;

  // 親課題パネルの折り畳み状態
  isMasterPanelCollapsed: boolean = false;

  // 親課題パネル折り畳みトグル
  toggleMasterPanel(): void {
    this.isMasterPanelCollapsed = !this.isMasterPanelCollapsed;
  }

  // 1. サイドパネルからのビュー切替（課題管理 ↔ レビュー）
  onViewchange(view: 'tasks' | 'review'): void {
    this.activeView = view;
  }

  // 2. ヘッダーからのカンバン/ガント切替
  switchViewMode(view: 'KANBAN' | 'GANTT'): void {
    this.currentMode = view;
  }

  // 集中モード切替ハンドラ
  onToggleConcentrationMode(): void {
    console.log('集中モード起動');
    this.pipService.togglePip();
  }

  // --- Project・Task データ管理 ---  
  projects: ParentProject[] = [];
  selectedProject: ParentProject | null = null;

  // 全タスクを一元管理するマスタ配列
  allTasks: Task[] = [];
  selectedTask: Task | null = null;

  // 選択中の親課題に紐づく子タスクのみを取得
  get currentTasks(): Task[] {
    if (!this.selectedProject) return [];
    return this.allTasks.filter(task => task.parentId === this.selectedProject?.id);
  }

  // --- フォーム状態管理 ---
  // 親課題 (Project) フォームの表示状態
  isProjectFormOpen = false;
  projectToEdit?: ParentProject | null = null;  

  // 子タスク (Task) フォームの表示状態
  isTaskFormOpen = false;
  taskToEdit: Task | null = null;

  // --- テーマ管理 ---
  // テーマ切り替えハンドラ
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }
  
  ngOnInit(): void {
    document.body.setAttribute('data-theme', this.currentTheme);

    // 1. Firestoreから親課題をリアルタイム受信
    this.dataService.getProjects().subscribe(projects => {
      this.projects = projects;
      // 選択中の親課題があれば最新状態に同期
      if (this.selectedProject) {
        const updated = projects.find(p => p.id === this.selectedProject?.id);
        this.selectedProject = updated || null;
      }
      this.recalculateProgress();
    });

    // 2. Firestoreから子タスクをリアルタイム受信
    this.dataService.getTasks().subscribe(tasks => {
      this.allTasks = tasks;
      this.recalculateProgress();
    });
  }

  // =======================================================
  // 親課題(Project)操作ロジック
  // =======================================================
  // 親課題を選択
  onSelectProject(project: ParentProject): void {
    this.selectedProject = project;
    this.isMasterPanelCollapsed = false; // 新しい親課題を開いたときは必ず親課題パネルを展開状態にする
  }
  
  // 親課題を解除
  onUnselectProject(): void {
    this.selectedProject = null;
    this.isMasterPanelCollapsed = false;
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

  // 親課題の新規作成
  onProjectCreated(newProject: ParentProject): void {
    const { id, ...projectData } = newProject;
    this.dataService.addProject(projectData);
    this.onCloseProjectForm();
  }

  // 親課題の更新
  onProjectUpdated(updatedProject: ParentProject): void {
    if (this.selectedProject?.id === updatedProject.id) {
      const { id, ...projectData } = updatedProject;
      this.dataService.updateProject(id, projectData);
    }
    this.onCloseProjectForm();
  }

  // 親課題のステータス更新
  onParentTaskUpdated(updatedProject: ParentProject | string): void {
    // 1. 引数が文字列(ID)の場合、projectsから対象親課題を検索
    let project: ParentProject | null = null;
    if (typeof updatedProject === 'string') {
      project = this.projects.find(p => p.id === updatedProject) || null;
      if (!project) {
        console.error('更新対象の親課題IDが存在しません:', updatedProject);
        return;
      }
    } else {
      project = updatedProject;
      if (!project || !project.id) {
        console.error('更新対象の親課題IDが存在しません:', updatedProject?.id);
        return;
      }
    }

    // 2. projectsのローカル配列を即座に更新
    const index = this.projects.findIndex(p => p.id === project!.id);
    if (index !== -1) {
      this.projects[index] = { ...project };
    }

    // 3. 選択中の親課題も同時に更新
    if (this.selectedProject?.id === project.id) {
      this.selectedProject = { ...project };
    }

    // 4. 進捗率を再計算
    this.recalculateProgress();

    // 5. Firestoreデータベースを更新
    const { id, ...projectData } = project;
    this.dataService.updateProject(id, projectData)
    .then(() => console.log('親課題更新完了:', id))
    .catch(err => console.error('親課題更新エラー:', err));
  }

  // 親課題の削除完了ハンドラ
  onProjectDeleted(projectId: string): void {
    // 削除された親課題に紐づく子タスクも一括クリア
    this.dataService.deleteProject(projectId);
    if (this.selectedProject?.id === projectId) {
      this.selectedProject = null;
    }
    this.onCloseProjectForm();
  }

  // =======================================================
  // 子タスク(Task)操作ロジック
  // =======================================================

  // タスク選択時 (カードクリック)
  onSelectTask(task: Task): void {
    if (task) {
      this.taskToEdit = { ...task };
    this.isTaskFormOpen = true;
    }
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
    this.promotingMemoId = null;
  }

  // タスクの作成完了ハンドラ
  onTaskCreated(newTask: Task): void {
    if (this.selectedProject && !newTask.parentId) {
      newTask.parentId = this.selectedProject.id;
    }
    const { id, ...taskData } = newTask;
    this.dataService.addTask(taskData);

    // サイドポケットからのタスク昇格処理
    if (this.promotingMemoId) {
      this.dataService.deleteSidePocketMemo(this.promotingMemoId);
      this.promotingMemoId = null;
    }
    this.onCloseTaskForm();
  }

  // タスクの更新完了ハンドラ
  onTaskUpdated(updatedTask: Task | string): void {
    // 1. 引数が文字列(ID)の場合、allTasksから対象タスクを検索
    let task: Task | null = null;
    if (typeof updatedTask === 'string') {
      task = this.allTasks.find(t => t.id === updatedTask) || null;
      if (!task) {
        console.error('更新対象のタスクIDが存在しません:', updatedTask);
        return;
      }
    } else {
      task = updatedTask;
      if (!task || !task.id) {
        console.error('更新対象のタスクIDが存在しません:', updatedTask?.id);
        return;
      }
    }

    // 2. allTasksを即座に更新して画面と進捗率に反映
    const index = this.allTasks.findIndex(t => t.id === task!.id);
    if (index !== -1) {
      this.allTasks[index] = { ...task };
    }
    this.recalculateProgress();

    // 3. Firestoreデータベースを更新
    const { id, ...taskData } = task;
    this.dataService.updateTask(id, taskData)
    .then(() => console.log('タスク更新完了:', id))
    .catch(err => console.error('タスク更新エラー:', err));

    this.onCloseTaskForm();
  }

  // タスクの削除完了ハンドラ
  onTaskDeleted(taskId: string): void {
    this.dataService.deleteTask(taskId);
    this.onCloseTaskForm();
  }

  // 進捗率と完了タスク数の自動再計算
  private recalculateProgress(): void {
    if (!this.projects || this.projects.length === 0) return;

    // 変更が必要なプロジェクトを追跡
    let hasChanges = false;

    // 1. .map() を使って、各プロジェクトに対して、子タスクの数と完了数をカウント
    const updatedProjects = this.projects.map(project => {
      const projectTasks = this.allTasks.filter(t => t.parentId === project.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // 値に変更があった場合のみ、新しい参照を作成して更新フラグを立てる
      if (
        project.totalTaskCount !== total ||
        project.completedTaskCount !== completed ||
        project.progressPercentage !== percentage
      ) {
        hasChanges = true;
        
        // Firestoreも更新
        this.dataService.updateProject(project.id, {
          totalTaskCount: total,
          completedTaskCount: completed,
          progressPercentage: percentage,
        }).catch(err => console.error('進捗率Firestore更新エラー:', err));

        // 新しい参照を持つオブジェクトを返す
        return {
          ...project,
          totalTaskCount: total,
          completedTaskCount: completed,
          progressPercentage: percentage,
        };
      }

      return project;
    });

    // 2. 変更があった場合のみprojectsを更新
    if (hasChanges) {
      this.projects = updatedProjects;
    }

    // 3. 選択中の親課題オブジェクトも新しい参照で更新
    if (this.selectedProject) {
      const updated = this.projects.find(p => p.id === this.selectedProject?.id);
      if (updated) {
        this.selectedProject = { ...updated };
      }
    }
  }

  // メモを本タスク化フォームへ移行
  onPromoteMemoToTask(memo: SidePocketMemo): void {
    this.promotingMemoId = memo.id; // メモIDを一時保持
    this.taskToEdit = {
      id: '',
      title: memo.content,
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
      parentId: this.selectedProject?.id || (this.projects[0]?.id || '')
    };
    this.isTaskFormOpen = true;
  }
  
  // ★ メモを親課題（プロジェクト）のメモ・履歴へ追加
  onPromoteMemoToProjectMemo(event: { memo: SidePocketMemo; projectId: string }): void {
    const targetProject = this.projects.find(p => p.id === event.projectId);
    if (!targetProject) return;

    const newMemoItem = {
      timestamp: new Date().toLocaleString('ja-JP'),
      content: event.memo.content
    };

    const updatedMemos = [...(targetProject.memos || []), newMemoItem];
    const updatedProject = {
      ...targetProject,
      memos: updatedMemos,
      updatedAt: new Date().toISOString()
    };

    // 親課題の更新実行
    const { id, ...projectData } = updatedProject;
    this.dataService.updateProject(id, projectData);

    // サイドポケットから消化・削除
    this.dataService.deleteSidePocketMemo(event.memo.id);
  }

    // =======================================================
  // アーカイブ操作ロジック
  // =======================================================
  onOpenArchiveModal(): void {
    this.isArchiveModalOpen = true;
  }

  onCloseArchiveModal(): void {
    this.isArchiveModalOpen = false;
  }

  // 親課題の復元（status を 'in-progress' に変更して保存）
  onRestoreProject(project: ParentProject): void {
    const updated = { ...project, status: 'in-progress' as const };
    const { id, ...projectData } = updated;
    this.dataService.updateProject(id, projectData);

    if (this.selectedProject?.id === id) {
      this.selectedProject = { ...updated };
    }
    this.recalculateProgress();
  }

  // 子タスクの復元（status を 'todo' に変更して保存）
  onRestoreTask(task: Task): void {
    const updated = { ...task, status: 'todo' as const };
    const { id, ...taskData } = updated;
    this.dataService.updateTask(id, taskData);

    this.recalculateProgress();
  }
}