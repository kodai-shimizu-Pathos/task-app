import { Component, OnInit, inject, ViewChild } from '@angular/core';
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
import { DelayLogToast } from './components/delay-log-toast/delay-log-toast';
import { DelayReason } from './models/delay-log.model';
import { ReviewViewComponent } from './components/review-view/review-view';


// --- 遅延ログ情報インターフェース ---
export interface DelayLogInfo {
  taskId: string;
  taskTitle: string;
  previousDueDate: string;
  newDueDate: string;
}

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
    DelayLogToast,
    ReviewViewComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  private dataService = inject(TaskDataService);
  private pipService = inject(PipService);
  private wasMasterPanelCollapsedBeforeForm: boolean = false;
  @ViewChild(SidePocketPanelComponent) sidePocketPanel!: SidePocketPanelComponent;

  private openTaskFormWithAutoCollapse(): void {
    if (!this.isTaskFormOpen) {
      // 開く直前の折り畳み状態を記憶
      this.wasMasterPanelCollapsedBeforeForm = this.isMasterPanelCollapsed;
      // 親課題パネルを折り畳む
      this.isMasterPanelCollapsed = true;
    }
    this.isTaskFormOpen = true;
  
    // ★ ここを追加：タスク詳細が開いたらサイドポケットを自動でたたむ
    if (this.sidePocketPanel) {
      this.sidePocketPanel.isCollapsed = true;
    }
  }

  delayLogQueue: DelayLogInfo[] = [];

  get activeDelayLogInfo(): DelayLogInfo | null {
    return this.delayLogQueue.length > 0 ? this.delayLogQueue[0] : null;
  }

  private enqueueDelayLog(info: DelayLogInfo): void {
    if (info.newDueDate <= info.previousDueDate) return;

    if (this.delayLogQueue.length >= 3) {
      const oldest = this.delayLogQueue.shift();
      if (oldest) {
        this.saveDelayLog(oldest.taskId, oldest.taskTitle, oldest.previousDueDate, oldest.newDueDate, 'unclassified');
      }
    }

    this.delayLogQueue.push(info);
  }

  // --- 遅延ログ関連プロパティ ---
  autoCollectDelayLog: boolean = true; // 自動収集 ON/OFF（デフォルトON）

  // 遅延ログ自動収集の ON/OFF 切替ハンドラ
  onToggleAutoCollect(event: any): void {
    if (typeof event === 'boolean') {
      this.autoCollectDelayLog = event;
    } else if (event && event.target) {
      this.autoCollectDelayLog = (event.target as HTMLInputElement).checked;
    }
  }

  isSummaryExpanded: boolean = false;

  // ★ 右ドッキングパネルの幅（初期値: 480px）
  taskFormWidth: number = 480;

  // ★ 右ドッキングパネルの幅変更（スプリッター）ドラッグ処理
  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.taskFormWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      // 最小 360px、最大 800px の範囲で可変
      this.taskFormWidth = Math.max(360, Math.min(800, startWidth + deltaX));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // --- モーダル表示フラグ ---
  isArchiveModalOpen = false;

  // --- アーカイブデータ取得プロパティ ---
  get archivedProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'archived');
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
    this.isTaskFormOpen = false; // タスクフォームが開いていれば閉じる
    this.isProjectFormOpen = true;

    if (this.sidePocketPanel) {
      this.sidePocketPanel.isCollapsed = true; // サイドポケットを自動で閉じる
    }
  }

  // 既存の親課題の編集フォームを開く
  onEditProject(): void {
    if (this.selectedProject) {
      this.projectToEdit = { ...this.selectedProject };
      this.isTaskFormOpen = false; // タスクフォームが開いていれば閉じる
      this.isProjectFormOpen = true;
  
      if (this.sidePocketPanel) {
        this.sidePocketPanel.isCollapsed = true; // サイドポケットを自動で閉じる
      }
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

  // 親課題の更新ハンドラ
  onParentTaskUpdated(updatedProject: ParentProject | string): void {
    let project: ParentProject | null = null;
    if (typeof updatedProject === 'string') {
      project = this.projects.find(p => p.id === updatedProject) || null;
      if (!project) return;
    } else {
      project = updatedProject;
      if (!project || !project.id) return;
    }

    const oldProject = this.projects.find(p => p.id === project!.id);
    const oldDueDate = (updatedProject as any)._previousDueDate || oldProject?.deadline || oldProject?.scheduledEndDate || '';
    const newDueDate = project.deadline || project.scheduledEndDate || '';

    // 後ろ倒し発生時、親課題（配下タスク含む）として1回だけキューへ追加
    if (this.autoCollectDelayLog && oldDueDate && newDueDate) {
      const childCount = this.allTasks.filter(t => t.parentId === project!.id).length;
      const titleLabel = childCount > 0 
        ? `📁 ${project.title} (配下タスク${childCount}件)` 
        : `📁 ${project.title}`;

      this.enqueueDelayLog({
        taskId: project.id,
        taskTitle: titleLabel,
        previousDueDate: oldDueDate,
        newDueDate: newDueDate
      });
    }

    const index = this.projects.findIndex(p => p.id === project!.id);
    if (index !== -1) {
      this.projects[index] = { ...project };
    }
    if (this.selectedProject?.id === project.id) {
      this.selectedProject = { ...project };
    }

    this.recalculateProgress();
    const { id, ...projectData } = project;
    this.dataService.updateProject(id, projectData);
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
    this.openTaskFormWithAutoCollapse();
    }
  }

  // 新規タスク追加フォームを開く
  onOpenNewTaskForm(): void {
    this.taskToEdit = null;
    this.openTaskFormWithAutoCollapse();
  }

  // タスクフォームを閉じる
  onCloseTaskForm(): void {
    this.isTaskFormOpen = false;
    this.taskToEdit = null;
    this.promotingMemoId = null;
    this.isMasterPanelCollapsed = this.wasMasterPanelCollapsedBeforeForm;
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

  // 子タスクの更新ハンドラ
  onTaskUpdated(updatedTask: Task | string): void {
    let task: Task | null = null;
    if (typeof updatedTask === 'string') {
      task = this.allTasks.find(t => t.id === updatedTask) || null;
      if (!task) return;
    } else {
      task = updatedTask;
      if (!task || !task.id) return;
    }

    const oldTask = this.allTasks.find(t => t.id === task!.id);
    const oldDueDate = (updatedTask as any)._previousDueDate || oldTask?.deadline || oldTask?.scheduledEndDate || '';
    const newDueDate = task.deadline || task.scheduledEndDate || '';

    // 親課題のトーストがすでにキューにある場合は重複追加しない
    const isParentInQueue = this.delayLogQueue.some(q => q.taskId === task!.parentId);

    if (this.autoCollectDelayLog && oldDueDate && newDueDate && !isParentInQueue) {
      this.enqueueDelayLog({
        taskId: task.id,
        taskTitle: task.title,
        previousDueDate: oldDueDate,
        newDueDate: newDueDate
      });
    }

    const index = this.allTasks.findIndex(t => t.id === task!.id);
    if (index !== -1) {
      this.allTasks[index] = { ...task };
    }
    this.recalculateProgress();

    const { id, ...taskData } = task;
    this.dataService.updateTask(id, taskData);
    this.onCloseTaskForm();
  }

  // 遅延理由選択ハンドラ
  onSelectDelayReason(reason: DelayReason): void {
    const current = this.delayLogQueue.shift(); // 先頭のログを取り出して消化
    if (!current) return;

    this.saveDelayLog(current.taskId, current.taskTitle, current.previousDueDate, current.newDueDate, reason);
  }

  // 残りのキューを一括スキップ（未分類としてすべて保存）
  onSkipAllDelayLogs(): void {
    while (this.delayLogQueue.length > 0) {
      const item = this.delayLogQueue.shift();
      if (item) {
        this.saveDelayLog(item.taskId, item.taskTitle, item.previousDueDate, item.newDueDate, 'unclassified');
      }
    }
  }

  // Firestoreへの保存共通ヘルパー
  private saveDelayLog(taskId: string, title: string, oldDate: string, newDate: string, reason: DelayReason): void {
    const isProject = this.projects.some(p => p.id === taskId);
    if (isProject) {
      const childTasks = this.allTasks.filter(t => t.parentId === taskId);
      if (childTasks.length > 0) {
        childTasks.forEach(task => {
          this.dataService.addDelayLog({
            taskId: task.id,
            taskTitle: task.title,
            previousDueDate: oldDate,
            newDueDate: newDate,
            reason: reason
          });
        });
        return;
      }
    }

    this.dataService.addDelayLog({
      taskId: taskId,
      taskTitle: title,
      previousDueDate: oldDate,
      newDueDate: newDate,
      reason: reason
    });
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
    this.openTaskFormWithAutoCollapse();
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

  // --- アーカイブ操作ハンドラ ---
  onOpenArchiveModal(): void {
    this.isArchiveModalOpen = true;
  }

  onCloseArchiveModal(): void {
    this.isArchiveModalOpen = false;
  }

  // 選択中の親課題をアーカイブへ移動
  onArchiveSelectedProject(): void {
    if (!this.selectedProject) return;

    const updated = { ...this.selectedProject, status: 'archived' as const };
    const { id, ...projectData } = updated;
    this.dataService.updateProject(id, projectData);

    this.selectedProject = null; // 一覧画面へ戻る
    this.recalculateProgress();
  }

  // 親課題の復元
  onRestoreProject(project: ParentProject): void {
    const updated = { ...project, status: 'in-progress' as const };
    const { id, ...projectData } = updated;
    this.dataService.updateProject(id, projectData);

    if (this.selectedProject?.id === id) {
      this.selectedProject = { ...updated };
    }
    this.recalculateProgress();
  }
}