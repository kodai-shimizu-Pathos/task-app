import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidePocketPanelComponent } from './components/side-pocket-panel/side-pocket-panel';
import { SidePocketMemo } from './services/task-data';
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
import { AuthService } from './services/auth.service';
import { LoginModalComponent } from './components/login-modal/login-modal';
import { GuideTourComponent } from './components/guide-tour/guide-tour.component';

/**
 * 遅延ログ情報インターフェース
 * タスク/親課題の期限変更時に記録される情報
 */
export interface DelayLogInfo {
  taskId: string;
  taskTitle: string;
  previousDueDate: string;
  newDueDate: string;
}

/**
 * メインアプリケーションコンポーネント
 * タスク管理、親課題管理、AI レビュー、遅延ログ、メモ機能を統合
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SidePocketPanelComponent,
    KanbanBoard,
    TaskForm,
    ProjectForm,
    MasterKanbanBoard,
    GanttBoard,
    ArchiveModal,
    DelayLogToast,
    ReviewViewComponent,
    LoginModalComponent,
    GuideTourComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnInit {
  // === DI & サービス注入 ===
  authService = inject(AuthService);
  private dataService = inject(TaskDataService);
  private pipService = inject(PipService);

  // === UI 状態管理 (State) ===
  /** アクティブビュー: 'tasks'（課題管理メイン）| 'review'（AIレビュー） */
  activeView: 'tasks' | 'review' = 'tasks';

  /** 表示モード: 'KANBAN' | 'GANTT' */
  currentMode: 'KANBAN' | 'GANTT' = 'KANBAN';

  /** テーマ: 'dark' | 'light' */
  currentTheme: 'dark' | 'light' = 'dark';

  /** 親課題パネルの折り畳み状態 */
  isMasterPanelCollapsed: boolean = false;

  /** サマリーバーの展開状態 */
  isSummaryExpanded: boolean = false;

  /** 親課題フォームの表示状態 */
  isProjectFormOpen = false;

  /** タスクフォームの表示状態 */
  isTaskFormOpen = false;

  /** アーカイブモーダルの表示状態 */
  isArchiveModalOpen = false;

  /** 右ドッキングパネルの幅（単位: px） */
  taskFormWidth: number = 480;

  /** ログインモーダルの表示状態 */
  isLoginModalOpen = false;

  /** ガイドツアー表示状態 */
  isGuideTourOpen = false;

  // === コンポーネント参照 ===
  @ViewChild(SidePocketPanelComponent) sidePocketPanel!: SidePocketPanelComponent;

  // === データ参照 (Getters) ===
  /** 全親課題の配列 */
  projects: ParentProject[] = [];

  /** 現在選択中の親課題 */
  selectedProject: ParentProject | null = null;

  /** 編集対象の親課題（フォーム用） */
  projectToEdit?: ParentProject | null = null;

  /** 全タスクを一元管理するマスタ配列 */
  allTasks: Task[] = [];

  /** 現在選択中のタスク */
  selectedTask: Task | null = null;

  /** 編集対象のタスク（フォーム用） */
  taskToEdit: Task | null = null;

  // === 遅延ログ・メモ昇格管理 ===
  /** 遅延ログ情報のキュー */
  delayLogQueue: DelayLogInfo[] = [];

  /** 遅延ログの自動収集フラグ */
  autoCollectDelayLog: boolean = true;

  /** メモ昇格処理時の一時保持ID */
  promotingMemoId: string | null = null;

  /** タスクフォーム開く直前の親課題パネル折り畳み状態を記憶 */
  private wasMasterPanelCollapsedBeforeForm: boolean = false;

  /**
   * 遅延ログキューの先頭要素を取得
   */
  get activeDelayLogInfo(): DelayLogInfo | null {
    return this.delayLogQueue.length > 0 ? this.delayLogQueue[0] : null;
  }

  /**
   * 現在選択中の親課題に紐づく子タスク一覧を取得
   */
  get currentTasks(): Task[] {
    if (!this.selectedProject) return [];
    return this.allTasks.filter(task => task.parentId === this.selectedProject?.id);
  }

  /**
   * アクティブ（未アーカイブ）な親課題一覧を取得
   */
  get activeProjects(): ParentProject[] {
    return this.projects.filter(p => p.status !== 'archived');
  }

  /**
   * アーカイブ済み親課題一覧を取得
   */
  get archivedProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'archived');
  }

  // === ライフサイクル ===

  /**
   * コンポーネント初期化
   */
  ngOnInit(): void {
    // テーマの初期化
    document.body.setAttribute('data-theme', this.currentTheme);

    // Firestore リアルタイムリスナー登録
    // 1. 親課題の監視
    this.dataService.getProjects().subscribe(projects => {
      this.projects = projects;
      // 選択中の親課題があれば最新状態に同期
      if (this.selectedProject) {
        const updated = projects.find(p => p.id === this.selectedProject?.id);
        this.selectedProject = updated || null;
      }
      this.recalculateProgress();
    });

    // 2. 子タスクの監視
    this.dataService.getTasks().subscribe(tasks => {
      this.allTasks = tasks;
      this.recalculateProgress();
    });
  }

  // === ログアウト処理 ===

  /**
   * ログアウト実行
   */
  async onLogout(): Promise<void> {
    if (confirm('ログアウトしますか？')) {
      await this.authService.logout();
    }
  }

  /**
   * ログインモーダルを開く
   */
  onOpenLoginModal(): void {
    this.isLoginModalOpen = true;
  }

  /**
   * ログインモーダルを閉じる
   */
  onCloseLoginModal(): void {
    this.isLoginModalOpen = false;
  }

  // === UI 操作（汎用） ===

  /**
   * ビュー切り替え（課題管理 ↔ AIレビュー）
   */
  onViewchange(view: 'tasks' | 'review'): void {
    this.activeView = view;
    this.closeAllForms();
  }

  /**
   * 表示モード切り替え（KANBAN ↔ GANTT）
   */
  switchViewMode(view: 'KANBAN' | 'GANTT'): void {
    this.currentMode = view;
  }

  /**
   * テーマ切り替え（ダーク ↔ ライト）
   */
  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', this.currentTheme);
  }

  /**
   * 親課題パネルの折り畳み/展開切り替え
   */
  toggleMasterPanel(): void {
    this.isMasterPanelCollapsed = !this.isMasterPanelCollapsed;
  }

  /**
   * 集中モード（PIP）の切り替え
   */
  onToggleConcentrationMode(): void {
    console.log('集中モード起動');
    this.pipService.togglePip();
  }

  /**
   * 自動遅延ログ収集の ON/OFF 切り替え
   */
  onToggleAutoCollect(event: any): void {
    if (typeof event === 'boolean') {
      this.autoCollectDelayLog = event;
    } else if (event && event.target) {
      this.autoCollectDelayLog = (event.target as HTMLInputElement).checked;
    }
  }

  /**
   * 右ドッキングパネルのリサイズ開始（スプリッタードラッグ）
   */
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

  // === 親課題 (Project) ハンドラ ===

  /**
   * 親課題を選択
   */
  onSelectProject(project: ParentProject): void {
    this.selectedProject = project;
    this.isMasterPanelCollapsed = false;
    this.closeAllForms();
  }

  /**
   * 親課題選択を解除
   */
  onUnselectProject(): void {
    this.selectedProject = null;
    this.isMasterPanelCollapsed = false;
    this.closeAllForms();
  }

  /**
   * 新規親課題フォームを開く
   */
  onOpenNewProjectForm(): void {
    this.projectToEdit = null;
    this.isTaskFormOpen = false;
    this.isProjectFormOpen = true;

    if (this.sidePocketPanel) {
      this.sidePocketPanel.isCollapsed = true;
    }
  }

  /**
   * 既存親課題の編集フォームを開く
   */
  onEditProject(): void {
    if (this.selectedProject) {
      this.projectToEdit = { ...this.selectedProject };
      this.isTaskFormOpen = false;
      this.isProjectFormOpen = true;

      if (this.sidePocketPanel) {
        this.sidePocketPanel.isCollapsed = true;
      }
    }
  }

  /**
   * 親課題フォームを閉じる
   */
  onCloseProjectForm(): void {
    this.isProjectFormOpen = false;
    this.projectToEdit = null;
  }

  /**
   * 新規親課題作成完了ハンドラ
   */
  onProjectCreated(newProject: ParentProject): void {
    const { id, ...projectData } = newProject;
    this.dataService.addProject(projectData);
    this.onCloseProjectForm();
  }

  /**
   * 親課題更新完了ハンドラ
   */
  onProjectUpdated(updatedProject: ParentProject): void {
    if (this.selectedProject?.id === updatedProject.id) {
      const { id, ...projectData } = updatedProject;
      this.dataService.updateProject(id, projectData);
    }
    this.onCloseProjectForm();
  }

  /**
   * 親課題の更新（期限変更など）ハンドラ
   * 遅延ログの自動記録処理を含む
   */
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

    // 期限が後ろ倒しになった場合、親課題としてキューに追加
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

  /**
   * 親課題削除完了ハンドラ
   * 紐づく子タスクも一括で削除される
   */
  onProjectDeleted(projectId: string): void {
    this.dataService.deleteProject(projectId);
    if (this.selectedProject?.id === projectId) {
      this.selectedProject = null;
    }
    this.onCloseProjectForm();
  }

  /**
   * 選択中の親課題をアーカイブ済み状態に変更
   */
  onArchiveSelectedProject(): void {
    if (!this.selectedProject) return;

    const updated = { ...this.selectedProject, status: 'archived' as const };
    const { id, ...projectData } = updated;
    this.dataService.updateProject(id, projectData);

    this.selectedProject = null;
    this.recalculateProgress();
  }

  /**
   * 親課題をアーカイブから復元
   */
  onRestoreProject(project: ParentProject): void {
    const updated = { ...project, status: 'in-progress' as const };
    const { id, ...projectData } = updated;
    this.dataService.updateProject(id, projectData);

    if (this.selectedProject?.id === id) {
      this.selectedProject = { ...updated };
    }
    this.recalculateProgress();
  }

  /**
   * アーカイブモーダルを開く
   */
  onOpenArchiveModal(): void {
    this.isArchiveModalOpen = true;
  }

  /**
   * アーカイブモーダルを閉じる
   */
  onCloseArchiveModal(): void {
    this.isArchiveModalOpen = false;
  }

  // === 子タスク (Task) ハンドラ ===

  /**
   * タスク選択時（カードクリック）
   * 親課題パネルを自動で折り畳む
   */
  onSelectTask(task: Task): void {
    if (task) {
      this.taskToEdit = { ...task };
      this.openTaskFormWithAutoCollapse();
    }
  }

  /**
   * 新規タスク作成フォームを開く
   */
  onOpenNewTaskForm(): void {
    this.taskToEdit = null;
    this.openTaskFormWithAutoCollapse();
  }

  /**
   * タスクフォームを閉じる
   */
  onCloseTaskForm(): void {
    this.isTaskFormOpen = false;
    this.taskToEdit = null;
    this.promotingMemoId = null;
    this.isMasterPanelCollapsed = this.wasMasterPanelCollapsedBeforeForm;
  }

  /**
   * 新規タスク作成完了ハンドラ
   */
  onTaskCreated(newTask: Task): void {
    if (this.selectedProject && !newTask.parentId) {
      newTask.parentId = this.selectedProject.id;
    }
    const { id, ...taskData } = newTask;
    this.dataService.addTask(taskData);

    // サイドポケットからのメモ昇格処理
    if (this.promotingMemoId) {
      this.dataService.deleteSidePocketMemo(this.promotingMemoId);
      this.promotingMemoId = null;
    }
    this.onCloseTaskForm();
  }

  /**
   * タスク更新完了ハンドラ
   * 期限変更時の遅延ログ自動記録を含む
   */
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

  /**
   * タスク削除完了ハンドラ
   */
  onTaskDeleted(taskId: string): void {
    this.dataService.deleteTask(taskId);
    this.onCloseTaskForm();
  }

  /**
   * メモから本タスクへの昇格ハンドラ
   */
  onPromoteMemoToTask(memo: SidePocketMemo): void {
    this.promotingMemoId = memo.id;
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

  /**
   * メモから親課題のメモ履歴への昇格ハンドラ
   */
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

    const { id, ...projectData } = updatedProject;
    this.dataService.updateProject(id, projectData);

    // サイドポケットから消化・削除
    this.dataService.deleteSidePocketMemo(event.memo.id);
  }

  /**
   * 遅延理由の選択ハンドラ
   */
  onSelectDelayReason(reason: DelayReason): void {
    const current = this.delayLogQueue.shift();
    if (!current) return;

    this.saveDelayLog(current.taskId, current.taskTitle, current.previousDueDate, current.newDueDate, reason);
  }

  /**
   * 残りのキューをすべてスキップ（未分類として保存）
   */
  onSkipAllDelayLogs(): void {
    while (this.delayLogQueue.length > 0) {
      const item = this.delayLogQueue.shift();
      if (item) {
        this.saveDelayLog(item.taskId, item.taskTitle, item.previousDueDate, item.newDueDate, 'unclassified');
      }
    }
  }

  // === 遅延ログ & ヘルパー処理 ===

  /**
   * ステータスのカラー値を取得
   * @param status タスクのステータス
   * @returns 16進数カラーコード
   */
  getStatusColor(status?: string): string {
    if (!status) return '#64748B';
    const normalized = status.toLowerCase().replace('_', '-');
    if (normalized === 'done') return '#059669';
    if (normalized === 'in-progress' || normalized === 'inprogress') return '#2563EB';
    return '#64748B';
  }

  /**
   * 優先度の日本語ラベルを取得
   * @param priority 優先度
   * @returns 日本語ラベル
   */
  getPriorityLabel(priority?: string): string {
    if (!priority) return '中';
    const lower = priority.toLowerCase();
    if (lower === 'high') return '高';
    if (lower === 'medium') return '中';
    if (lower === 'low') return '低';
    return '中';
  }

  /**
   * ステータスの日本語ラベルを取得
   * @param status ステータス
   * @returns 日本語ラベル
   */
  getStatusLabel(status?: string): string {
    if (!status) return '未着手';
    const normalized = status.toLowerCase().replace('_', '-');
    if (normalized === 'done') return '完了';
    if (normalized === 'in-progress' || normalized === 'inprogress') return '進行中';
    return '未着手';
  }

  /**
   * タスクフォームを開く際に親課題パネルを自動で折り畳む
   * @private
   */
  private openTaskFormWithAutoCollapse(): void {
    if (!this.isTaskFormOpen) {
      this.wasMasterPanelCollapsedBeforeForm = this.isMasterPanelCollapsed;
      this.isMasterPanelCollapsed = true;
    }
    this.isTaskFormOpen = true;

    // サイドポケットも自動で折り畳む
    if (this.sidePocketPanel) {
      this.sidePocketPanel.isCollapsed = true;
    }
  }

  /**
   * すべての入力・編集フォームを閉じる
   */
  closeAllForms(): void {
    this.onCloseTaskForm();
    this.onCloseProjectForm();
  }

  /**
   * 遅延ログをキューに追加（最大3件保持、超過時は最古を保存）
   * @param info 遅延ログ情報
   * @private
   */
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

  /**
   * Firestore へ遅延ログを保存
   * 親課題更新の場合は配下の子タスクに分散記録
   * @param taskId タスク/親課題 ID
   * @param title タイトル
   * @param oldDate 変更前の期限
   * @param newDate 変更後の期限
   * @param reason 遅延理由
   * @private
   */
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

  /**
   * 各親課題の進捗率と完了タスク数を自動再計算
   * 配下のタスク数・完了数から進捗率を算出し、Firestore に反映
   * @private
   */
  private recalculateProgress(): void {
    if (!this.projects || this.projects.length === 0) return;

    let hasChanges = false;

    const updatedProjects = this.projects.map(project => {
      const projectTasks = this.allTasks.filter(t => t.parentId === project.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // 値に変更があった場合のみ更新
      if (
        project.totalTaskCount !== total ||
        project.completedTaskCount !== completed ||
        project.progressPercentage !== percentage
      ) {
        hasChanges = true;

        this.dataService.updateProject(project.id, {
          totalTaskCount: total,
          completedTaskCount: completed,
          progressPercentage: percentage,
        }).catch(err => console.error('進捗率 Firestore 更新エラー:', err));

        return {
          ...project,
          totalTaskCount: total,
          completedTaskCount: completed,
          progressPercentage: percentage,
        };
      }

      return project;
    });

    if (hasChanges) {
      this.projects = updatedProjects;
    }

    // 選択中の親課題オブジェクトも新しい参照で更新
    if (this.selectedProject) {
      const updated = this.projects.find(p => p.id === this.selectedProject?.id);
      if (updated) {
        this.selectedProject = { ...updated };
      }
    }
  }
}
