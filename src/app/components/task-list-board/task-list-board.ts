import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';
import { TaskDataService } from '../../services/task-data';

export type TaskFilterTab = 'all' | 'overdue' | 'today-tomorrow' | 'upcoming' | 'completed';

export interface ExpandedTaskState {
  [taskId: string]: boolean;
}

@Component({
  selector: 'app-task-list-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list-board.html',
  styleUrl: './task-list-board.css',
})
export class TaskListBoardComponent implements OnInit, OnChanges {
  private dataService = inject(TaskDataService);

  @Input() tasks: Task[] = [];
  @Input() projects: ParentProject[] = [];
  @Input() selectedProject?: ParentProject | null = null;

  @Output() selectTask = new EventEmitter<Task>();
  @Output() selectProject = new EventEmitter<ParentProject | undefined>();
  @Output() taskUpdated = new EventEmitter<Task>();

  currentTab: TaskFilterTab = 'all';

  overdueTasks: Task[] = [];
  todayTomorrowTasks: Task[] = [];
  upcomingTasks: Task[] = [];
  completedTasks: Task[] = [];
  allVisibleTasks: Task[] = [];

  expandedTasks: ExpandedTaskState = {};

  editingTaskId: string | null = null;
  editingTaskTitle: string = '';

  tabs: Array<{ id: TaskFilterTab; label: string; icon: string }> = [
    { id: 'all', label: 'すべて', icon: '' },
    { id: 'overdue', label: '期限超過', icon: '🚨' },
    { id: 'today-tomorrow', label: '今日・明日', icon: '🔥' },
    { id: 'upcoming', label: '今週中', icon: '📅' },
    { id: 'completed', label: '完了済み', icon: '✅' }
  ];

  todayStr: string = '';

  ngOnInit(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.todayStr = `${yyyy}-${mm}-${dd}`;

    this.categorizeAndSortTasks();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 初回読み込み、親課題フィルター切り替え、または件数が変わった時のみ全体再分類
    if (changes['tasks'] || changes['selectedProject']) {
      const prevLength = changes['tasks']?.previousValue?.length;
      const currLength = changes['tasks']?.currentValue?.length;

      if (prevLength !== currLength || changes['selectedProject']) {
        this.categorizeAndSortTasks();
      }
    }
  }

  /** 親課題フィルター適用済みのタスク一覧を取得 */
  private getFilteredTasksByProject(): Task[] {
    if (!this.selectedProject) return this.tasks;
    return this.tasks.filter(t => t.parentId === this.selectedProject?.id);
  }

  /** 代表比較日付の算出（完了予定日と最終期限のうち早い方を採用） */
  private getEffectiveDueDate(task: Task): string {
    if (task.scheduledEndDate && task.deadline) {
      return task.scheduledEndDate < task.deadline ? task.scheduledEndDate : task.deadline;
    }
    return task.scheduledEndDate || task.deadline || '9999-12-31';
  }

  /** 優先度のスコア化（高:3, 中:2, 低:1） */
  private getPriorityScore(priority?: string): number {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    if (p === 'low') return 1;
    return 2;
  }

  /** タスク配列の精緻ソート（1:早期日付順 ➔ 2:優先度順 ➔ 3:最終期限の有無順） */
  private sortTaskList(taskList: Task[]): Task[] {
    return [...taskList].sort((a, b) => {
      // 1. 代表日付（早い方）の昇順
      const dateA = this.getEffectiveDueDate(a);
      const dateB = this.getEffectiveDueDate(b);
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      // 2. 優先度の降順 (高 > 中 > 低)
      const prioA = this.getPriorityScore(a.priority);
      const prioB = this.getPriorityScore(b.priority);
      if (prioA !== prioB) {
        return prioB - prioA;
      }

      // 3. 最終期限が設定されているものを優先
      const hasDeadlineA = a.deadline ? 1 : 0;
      const hasDeadlineB = b.deadline ? 1 : 0;
      return hasDeadlineB - hasDeadlineA;
    });
  }

  private categorizeAndSortTasks(): void {
    const sourceTasks = this.getFilteredTasksByProject();

    const overdue: Task[] = [];
    const todayTomorrow: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomYyyy = tomorrow.getFullYear();
    const tomMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomDd = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tomYyyy}-${tomMm}-${tomDd}`;

    for (const task of sourceTasks) {
      if (task.status === 'done') {
        completed.push(task);
      } else {
        const dueDate = this.getEffectiveDueDate(task);

        if (dueDate === '9999-12-31') {
          upcoming.push(task);
        } else if (dueDate < this.todayStr) {
          overdue.push(task);
        } else if (dueDate <= tomorrowStr) {
          todayTomorrow.push(task);
        } else {
          upcoming.push(task);
        }
      }
    }

    // 各グループ内を確定ロジックで精緻ソート
    this.overdueTasks = this.sortTaskList(overdue);
    this.todayTomorrowTasks = this.sortTaskList(todayTomorrow);
    this.upcomingTasks = this.sortTaskList(upcoming);
    this.completedTasks = this.sortTaskList(completed);

    this.allVisibleTasks = [
      ...this.overdueTasks,
      ...this.todayTomorrowTasks,
      ...this.upcomingTasks,
      ...this.completedTasks
    ];
  }

  /** タブ切り替え時に最新基準で再判定・再ソート */
  switchTab(tab: TaskFilterTab): void {
    this.currentTab = tab;
    this.categorizeAndSortTasks();
  }

  getVisibleTasksByTab(): Task[] {
    switch (this.currentTab) {
      case 'overdue': return this.overdueTasks;
      case 'today-tomorrow': return this.todayTomorrowTasks;
      case 'upcoming': return this.upcomingTasks;
      case 'completed': return this.completedTasks;
      case 'all': default: return this.allVisibleTasks;
    }
  }

  getTabCount(tab: TaskFilterTab): number {
    switch (tab) {
      case 'overdue': return this.overdueTasks.length;
      case 'today-tomorrow': return this.todayTomorrowTasks.length;
      case 'upcoming': return this.upcomingTasks.length;
      case 'completed': return this.completedTasks.length;
      case 'all': default: return this.allVisibleTasks.length;
    }
  }

  // 超過判定（未完了時のみ）
  isScheduledOverdue(task: Task): boolean {
    if (task.status === 'done' || !task.scheduledEndDate) return false;
    return task.scheduledEndDate < this.todayStr;
  }

  isDeadlineOverdue(task: Task): boolean {
    if (task.status === 'done' || !task.deadline) return false;
    return task.deadline < this.todayStr;
  }

  // 行クラス（進行中のみ左青枠線、他は透過枠線で配置ブレを防止）
  getTaskRowClass(task: Task): Record<string, boolean> {
    const statusNorm = (task.status || 'todo').toLowerCase().replace('_', '-');
    return {
      'task-row': true,
      'completed': task.status === 'done',
      'status-line-in-progress': statusNorm === 'in-progress' || statusNorm === 'inprogress',
      'overdue-deadline': this.isDeadlineOverdue(task),
      'overdue-scheduled': !this.isDeadlineOverdue(task) && this.isScheduledOverdue(task)
    };
  }

  /** チェックボックス変更：その場にとどまり配列の並び順を即時変更しない（遅延ソート） */
  onTaskCheckboxChange(task: Task, checked: boolean): void {
    task.status = checked ? 'done' : 'todo';
    const updated: Task = { ...task, status: checked ? 'done' : 'todo' };
    this.taskUpdated.emit(updated);
  }

  onStatusChange(task: Task, newStatus: string): void {
    task.status = newStatus as any;
    const updated: Task = { ...task, status: newStatus as any };
    this.taskUpdated.emit(updated);
  }

  onPriorityChange(task: Task, newPriority: string): void {
    task.priority = newPriority as any;
    const updated: Task = { ...task, priority: newPriority as any };
    this.taskUpdated.emit(updated);
  }

  onScheduledDateChange(task: Task, newDate: string): void {
    task.scheduledEndDate = newDate;
    const updated: Task = { ...task, scheduledEndDate: newDate };
    this.taskUpdated.emit(updated);
  }

  onDeadlineChange(task: Task, newDate: string): void {
    task.deadline = newDate;
    const updated: Task = { ...task, deadline: newDate };
    this.taskUpdated.emit(updated);
  }

  startEditingTitle(task: Task, event: Event): void {
    event.stopPropagation();
    this.editingTaskId = task.id;
    this.editingTaskTitle = task.title;
  }

  saveTitle(task: Task): void {
    if (this.editingTaskId === task.id) {
      if (this.editingTaskTitle.trim() && this.editingTaskTitle !== task.title) {
        task.title = this.editingTaskTitle.trim();
        const updated: Task = { ...task, title: this.editingTaskTitle.trim() };
        this.taskUpdated.emit(updated);
      }
      this.editingTaskId = null;
    }
  }

  cancelEditingTitle(): void {
    this.editingTaskId = null;
  }

  getParentProjectLabel(task: Task): string {
    if (!task.parentId) return '';
    const project = this.projects.find(p => p.id === task.parentId);
    return project ? project.title : '';
  }

  /** 親課題バッジクリック ➔ 親課題選択（フィルター＋ヒーローカード表示） */
  onParentProjectBadgeClick(event: Event, task: Task): void {
    event.stopPropagation();
    if (task.parentId) {
      const project = this.projects.find(p => p.id === task.parentId);
      if (project) {
        this.selectProject.emit(project);
      }
    }
  }

  /** 右端の解除チップクリック ➔ 親課題選択を解除 */
  clearProjectFilter(event: Event): void {
    event.stopPropagation();
    this.selectProject.emit(undefined);
  }

  onEditTaskClick(event: Event, task: Task): void {
    event.stopPropagation();
    this.selectTask.emit(task);
  }

  toggleSubtasks(event: Event, task: Task): void {
    event.stopPropagation();
    if (!this.hasSubtasks(task)) return;
    this.expandedTasks[task.id] = !this.expandedTasks[task.id];
  }

  hasSubtasks(task: Task): boolean {
    return !!(task.checklist && task.checklist.length > 0);
  }

  getCompletedSubtaskCount(task: Task): number {
    return task.checklist?.filter(item => item.completed).length ?? 0;
  }

  getTotalSubtaskCount(task: Task): number {
    return task.checklist?.length ?? 0;
  }

  /** サブタスクチェック変更 ➔ 全完了時は親タスクの見た目（チェック＆打消し線）も即座に連動 */
  onSubtaskCheckboxChange(event: Event, parentTask: Task, subtaskId: string, checked: boolean): void {
    event.stopPropagation();
    if (!parentTask.checklist) return;

    const updatedChecklist = parentTask.checklist.map(item =>
      item.id === subtaskId ? { ...item, completed: checked } : item
    );

    const allCompleted = updatedChecklist.every(item => item.completed);

    parentTask.checklist = updatedChecklist;
    if (allCompleted) {
      parentTask.status = 'done';
    }

    const updatedTask: Task = {
      ...parentTask,
      checklist: updatedChecklist,
      status: allCompleted ? 'done' : parentTask.status
    };

    this.taskUpdated.emit(updatedTask);
  }
}