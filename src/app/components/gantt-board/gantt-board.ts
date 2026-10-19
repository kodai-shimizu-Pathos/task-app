import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, PriorityLevel } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';

/**
 * タイムラインの1日分を表すインターフェース
 */
export interface TimelineColumn {
  date: Date;
  dateString: string;
  label: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}

/**
 * タイムラインの年月グループ情報
 */
export interface MonthGroup {
  label: string;
  daysCount: number;
}

@Component({
  selector: 'app-gantt-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt-board.html',
  styleUrl: './gantt-board.css',
})
export class GanttBoard implements OnInit, OnChanges, AfterViewInit {
  // ========================================
  // @Input / @Output / @ViewChild
  // ========================================
  @Input() tasks: Task[] = [];
  @Input() project?: ParentProject | null = null;
  @Input() projects: ParentProject[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() addTask = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() projectUpdated = new EventEmitter<any>();

  @ViewChild('timelinePane', { static: false }) timelinePane?: ElementRef<HTMLDivElement>;

  // ========================================
  // タイムライン表示関連
  // ========================================
  /** タイムラインの列一覧 */
  timelineColumns: TimelineColumn[] = [];

  /** タイムラインの年月グループ */
  monthGroups: MonthGroup[] = [];

  /** タイムラインの開始日時 */
  timelineStartDate!: Date;

  /** タイムラインの終了日時 */
  timelineEndDate!: Date;

  // ========================================
  // WBS（左パネル）のリサイズ制御
  // ========================================
  wbsWidth: number = 320;
  isResizing: boolean = false;
  resizeStartX: number = 0;
  resizeStartWbsWidth: number = 0;

  // ========================================
  // タイムラインスクロール・ズーム制御
  // ========================================
  columnWidth: number = 32;
  timelineScrollLeft: number = 0;

  // ========================================
  // ガントバーのドラッグ制御
  // ========================================
  /** 現在ドラッグ中のアイテム（Task or ParentProject） */
  draggedItem: Task | ParentProject | null = null;

  /** ドラッグの種類：移動、左端伸縮、右端伸縮、フラグ移動 */
  dragType: 'move' | 'resize-left' | 'resize-right' | 'flag' | null = null;

  /** ドラッグ開始時の X 座標 */
  dragStartX: number = 0;

  /** ドラッグで実際に移動があったかのフラグ（クリック誤発を防ぐ） */
  dragHasMoved: boolean = false;

  /** ドラッグ開始時のスケジュール開始日 */
  dragStartScheduledStart?: string;

  /** ドラッグ開始時のスケジュール終了日 */
  dragStartScheduledEnd?: string;

  /** ドラッグ開始時の期限 */
  dragStartDeadline?: string;

  /** 親課題ドラッグ時の配下タスク初期日付マップ */
  private childTaskStartDates: Map<string, { start?: string; end?: string; deadline?: string }> = new Map();

  // ========================================
  // フラッグドラッグ用バインディング
  // ========================================
  private boundMouseMove?: (e: MouseEvent) => void;
  private boundMouseUp?: () => void;

  /** ドラッグ直後のクリック誤発を防ぐフラグ */
  private justDragged: boolean = false;

  // ========================================
  // フィルター・検索
  // ========================================
  searchQuery: string = '';
  selectedStatus: string = 'all';
  selectedPriority: string = 'all';

  // ========================================
  // ライフサイクル
  // ========================================

  ngOnInit(): void {
    this.calculateTimelineRange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // 子タスク一覧をソート
    if (changes['tasks'] && this.tasks) {
      this.tasks.sort((a, b) => {
        const dateA = new Date(a.scheduledStartDate || a.deadline || '9999-12-31').getTime();
        const dateB = new Date(b.scheduledStartDate || b.deadline || '9999-12-31').getTime();
        return dateA - dateB;
      });
    }

    // 親課題一覧をソート
    if (changes['projects'] && this.projects) {
      this.projects.sort((a, b) => {
        const dateA = new Date(a.createdAt || '9999-12-31').getTime();
        const dateB = new Date(b.createdAt || '9999-12-31').getTime();
        return dateB - dateA;
      });
    }

    if (changes['tasks'] || changes['project'] || changes['projects']) {
      this.calculateTimelineRange();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.onScrollToToday();
    }, 0);
  }

  // ========================================
  // Public メソッド
  // ========================================

  /**
   * タスククリック時のハンドラ
   * ドラッグ直後のクリック誤発を防止
   */
  onTaskClick(task: Task, event: Event): void {
    event.stopPropagation();

    if (this.justDragged) {
      this.justDragged = false;
      return;
    }

    if (task && task.id) {
      this.selectTask.emit(task);
    }
  }

  /**
   * 親課題クリック時のハンドラ
   */
  onProjectClick(project: ParentProject, event: Event): void {
    event.stopPropagation();
    if (project && project.id) {
      this.selectProject.emit(project);
    }
  }

  /**
   * 新規タスク追加ボタンのハンドラ
   */
  onAddNewTask(): void {
    this.addTask.emit();
  }

  /**
   * 優先度値を日本語ラベルに変換
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
   * WBS（左パネル）のスプリッター、ドラッグ開始
   */
  onSplitterMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWbsWidth = this.wbsWidth;
    this.boundMouseMove = this.onSplitterMouseMove.bind(this);
    this.boundMouseUp = this.onSplitterMouseUp.bind(this);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * WBS スプリッター、ドラッグ中の処理
   */
  onSplitterMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;
    const diff = event.clientX - this.resizeStartX;
    const newWidth = this.resizeStartWbsWidth + diff;
    this.wbsWidth = Math.max(200, Math.min(newWidth, window.innerWidth * 0.8));
  }

  /**
   * WBS スプリッター、ドラッグ終了
   */
  onSplitterMouseUp(): void {
    this.isResizing = false;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * Ctrl+マウスホイール でズーム制御
   */
  onTimelineWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -1 : 1;
    const newWidth = this.columnWidth + delta * 4;
    this.columnWidth = Math.max(24, Math.min(newWidth, 120));
  }

  /**
   * ズームイン
   */
  onZoomIn(): void {
    const newWidth = this.columnWidth + 4;
    this.columnWidth = Math.min(newWidth, 120);
  }

  /**
   * ズームアウト
   */
  onZoomOut(): void {
    const newWidth = this.columnWidth - 4;
    this.columnWidth = Math.max(newWidth, 24);
  }

  /**
   * 本日の日付までスクロール
   */
  onScrollToToday(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayIndex = Math.floor(
      (today.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (this.timelinePane && this.timelinePane.nativeElement) {
      const offset = (this.timelinePane.nativeElement.clientWidth / 4) - (this.columnWidth / 2);
      const scrollLeft = todayIndex * this.columnWidth - offset;
      this.timelinePane.nativeElement.scrollLeft = Math.max(0, scrollLeft);
    }
  }

  /**
   * タイムラインスクロール時のハンドラ
   */
  onTimelineScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    if (target) {
      this.timelineScrollLeft = target.scrollLeft;
    }
  }

  /**
   * ガントバーのドラッグ開始（移動・伸縮制御）
   */
  onBarMouseDown(item: Task | ParentProject, event: MouseEvent, dragType: 'move' | 'resize-left' | 'resize-right'): void {
    event.stopPropagation();

    this.draggedItem = item;
    this.dragType = dragType;
    this.dragStartX = event.clientX;
    this.dragHasMoved = false;

    this.dragStartScheduledStart = item.scheduledStartDate;
    this.dragStartScheduledEnd = item.scheduledEndDate;
    this.dragStartDeadline = item.deadline;

    // 親課題ドラッグ時：配下の子タスクの初期日付を保持
    const isProject = 'totalTaskCount' in item;
    if (isProject && dragType === 'move') {
      this.childTaskStartDates.clear();
      this.tasks.forEach(task => {
        this.childTaskStartDates.set(task.id, {
          start: task.scheduledStartDate,
          end: task.scheduledEndDate,
          deadline: task.deadline
        });
      });
    }
  }

  /**
   * ガントバーのドラッグ中処理
   */
  @HostListener('document:mousemove', ['$event'])
  onBarMouseMove(event: MouseEvent): void {
    if (!this.draggedItem || !this.dragType || this.dragType === 'flag') return;

    const diffPixels = event.clientX - this.dragStartX;
    if (Math.abs(diffPixels) > 3) {
      this.dragHasMoved = true;
    }

    if (!this.dragHasMoved) return;

    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragType === 'move') {
      // バーの移動：開始日・終了日・期限を一括移動
      const baseStart = this.dragStartScheduledStart || this.dragStartScheduledEnd || this.dragStartDeadline;
      if (baseStart) {
        const start = new Date(baseStart.replace(/-/g, '/'));
        start.setDate(start.getDate() + diffDays);
        this.draggedItem.scheduledStartDate = this.formatDateString(start);
      }
      if (this.dragStartScheduledEnd) {
        const end = new Date(this.dragStartScheduledEnd.replace(/-/g, '/'));
        end.setDate(end.getDate() + diffDays);
        this.draggedItem.scheduledEndDate = this.formatDateString(end);
      }
      if (this.dragStartDeadline) {
        const deadline = new Date(this.dragStartDeadline.replace(/-/g, '/'));
        deadline.setDate(deadline.getDate() + diffDays);
        this.draggedItem.deadline = this.formatDateString(deadline);
      }

      // 親課題ドラッグ時：配下の子タスクもリアルタイム連動
      const isProject = 'totalTaskCount' in this.draggedItem;
      if (isProject) {
        this.tasks.forEach(task => {
          const initial = this.childTaskStartDates.get(task.id);
          if (initial) {
            if (initial.start) {
              const d = new Date(initial.start.replace(/-/g, '/'));
              d.setDate(d.getDate() + diffDays);
              task.scheduledStartDate = this.formatDateString(d);
            }
            if (initial.end) {
              const d = new Date(initial.end.replace(/-/g, '/'));
              d.setDate(d.getDate() + diffDays);
              task.scheduledEndDate = this.formatDateString(d);
            }
            if (initial.deadline) {
              const d = new Date(initial.deadline.replace(/-/g, '/'));
              d.setDate(d.getDate() + diffDays);
              task.deadline = this.formatDateString(d);
            }
          }
        });
      }
    } else if (this.dragType === 'resize-left') {
      // 左端伸縮：開始日のみ変更
      const baseStart = this.dragStartScheduledStart || this.dragStartScheduledEnd || this.dragStartDeadline;
      if (baseStart) {
        const start = new Date(baseStart.replace(/-/g, '/'));
        start.setDate(start.getDate() + diffDays);
        this.draggedItem.scheduledStartDate = this.formatDateString(start);
      }
    } else if (this.dragType === 'resize-right') {
      // 右端伸縮：終了日・期限のみ変更
      if (this.dragStartScheduledEnd) {
        const end = new Date(this.dragStartScheduledEnd.replace(/-/g, '/'));
        end.setDate(end.getDate() + diffDays);
        this.draggedItem.scheduledEndDate = this.formatDateString(end);
      }
      if (this.dragStartDeadline) {
        const deadline = new Date(this.dragStartDeadline.replace(/-/g, '/'));
        deadline.setDate(deadline.getDate() + diffDays);
        this.draggedItem.deadline = this.formatDateString(deadline);
      }
    }
  }

  /**
   * ガントバーのドラッグ終了
   */
  @HostListener('document:mouseup', ['$event'])
  onBarMouseUp(event: MouseEvent): void {
    if (!this.draggedItem || !this.dragType || this.dragType === 'flag') return;

    try {
      const diffPixels = event.clientX - this.dragStartX;
      const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

      const isProject = 'totalTaskCount' in this.draggedItem;

      if (diffDays !== 0 && this.dragHasMoved) {
        // ドラッグが発生した場合、クリックイベントをブロック
        this.justDragged = true;

        const oldDueDate = this.dragStartDeadline || this.dragStartScheduledEnd || '';

        if (isProject) {
          const projectToEmit = {
            ...this.draggedItem,
            _previousDueDate: oldDueDate
          };
          this.projectUpdated.emit(projectToEmit);

          if (this.dragType === 'move') {
            this.tasks.forEach(task => {
              this.taskUpdated.emit(task);
            });
          }
        } else {
          const taskToEmit = {
            ...this.draggedItem as Task,
            _previousDueDate: oldDueDate
          };
          this.taskUpdated.emit(taskToEmit);
        }
      }
    } catch (error) {
      console.error('ドラッグ終了時の保存処理でエラーが発生しました:', error);
    } finally {
      this.resetDragState();
    }
  }

  /**
   * 完了予定日フラグ（🚩）のドラッグ開始
   */
  onFlagMouseDown(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.draggedItem = task;
    this.dragType = 'flag';
    this.dragStartX = event.clientX;
    this.dragStartScheduledEnd = task.scheduledEndDate;

    this.boundMouseMove = this.onFlagMouseMove.bind(this);
    this.boundMouseUp = this.onFlagMouseUp.bind(this);

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * 完了予定日フラッグのドラッグ中処理
   */
  onFlagMouseMove(event: MouseEvent): void {
    if (!this.draggedItem || this.dragType !== 'flag') return;
    const diffPixels = event.clientX - this.dragStartX;
    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragStartScheduledEnd) {
      const end = new Date(this.dragStartScheduledEnd);
      end.setDate(end.getDate() + diffDays);
      this.draggedItem.scheduledEndDate = this.formatDateString(end);
    }
  }

  /**
   * 完了予定日フラッグのドラッグ終了
   */
  onFlagMouseUp(): void {
    if (this.draggedItem && this.dragType === 'flag') {
      const updatedTask = { ...this.draggedItem as Task };
      this.draggedItem.scheduledEndDate = this.dragStartScheduledEnd;
      this.taskUpdated.emit(updatedTask);
    }
    this.draggedItem = null;
    this.dragType = null;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * ガントバーの表示位置とサイズを計算
   */
  getTaskBarPositionPx(item: Task | ParentProject): { left: number; width: number; visible: boolean } {
    const targetEndDate = item.scheduledEndDate || item.deadline;
    
    if (!item.scheduledStartDate || !targetEndDate) {
      // 開始日がない場合：期限のみで表示
      if (item.deadline) {
        const dl = new Date(item.deadline.replace(/-/g, '/'));
        dl.setHours(0, 0, 0, 0);

        if (dl < this.timelineStartDate || dl > this.timelineEndDate) {
          return { left: 0, width: 0, visible: false };
        }

        const deadlineIndex = Math.floor((dl.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const left = deadlineIndex * this.columnWidth;
        return { left, width: this.columnWidth, visible: true };
      }
      return { left: 0, width: 0, visible: false };
    }

    const start = new Date(item.scheduledStartDate.replace(/-/g, '/'));
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetEndDate.replace(/-/g, '/'));
    end.setHours(23, 59, 59, 999);

    if (end < this.timelineStartDate || start > this.timelineEndDate) {
      return { left: 0, width: 0, visible: false };
    }

    const clampedStart = new Date(Math.max(start.getTime(), this.timelineStartDate.getTime()));
    const clampedEnd = new Date(Math.min(end.getTime(), this.timelineEndDate.getTime()));

    const startIndex = Math.floor((clampedStart.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const endIndex = Math.ceil((clampedEnd.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));

    const left = startIndex * this.columnWidth;
    const width = (endIndex - startIndex) * this.columnWidth;

    return { left: Math.max(0, left), width: Math.max(this.columnWidth, width), visible: width > 0 };
  }

  /**
   * 完了予定日フラグの表示位置を計算
   */
  getScheduledEndPositionPx(item: Task | ParentProject): number {
    if (!item.scheduledEndDate) return 0;
    let end = new Date(item.scheduledEndDate);
    end.setHours(23, 59, 59, 999);

    if (end > this.timelineEndDate) {
      end = new Date(this.timelineEndDate);
    }
    if (end < this.timelineStartDate) {
      return 0;
    }

    const endIndex = Math.floor((end.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
    return (endIndex * this.columnWidth) + (this.columnWidth / 2);
  }

  /**
   * タスク/親課題が遅延しているか判定
   */
  isTaskOverdue(item: Task | ParentProject): boolean {
    if (item.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = item.deadline || item.scheduledEndDate;
    if (!targetDate) return false;
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    return target < today;
  }

  /**
   * タスクのチェックリスト統計情報を取得
   */
  getChecklistStats(task: Task): { completed: number; total: number } {
    if (!task.checklist || task.checklist.length === 0) {
      return { completed: 0, total: 0 };
    }
    const completed = task.checklist.filter(item => item.completed).length;
    return { completed, total: task.checklist.length };
  }

  /**
   * タスクがチェックリストを持つか判定
   */
  hasChecklist(task: Task): boolean {
    return !!(task.checklist && task.checklist.length > 0);
  }

  // ========================================
  // Getters
  // ========================================

  /**
   * フィルター適用後の表示タスク一覧
   */
  get filteredTasks(): Task[] {
    if (!this.tasks) return [];
    return this.tasks.filter(task => {
      if (this.searchQuery && !task.title.toLowerCase().includes(this.searchQuery.toLowerCase())) {
        return false;
      }
      if (this.selectedStatus === 'exclude-done' && task.status === 'done') {
        return false;
      }
      if (this.selectedStatus !== 'all' && this.selectedStatus !== 'exclude-done' && task.status !== this.selectedStatus) {
        return false;
      }
      if (this.selectedPriority !== 'all' && (task.priority || 'medium').toLowerCase() !== this.selectedPriority) {
        return false;
      }
      return true;
    });
  }

  /**
   * フィルター適用後の表示親課題一覧（マスターガント用）
   */
  get filteredProjects(): ParentProject[] {
    if (!this.projects) return [];
    return this.projects.filter(proj => {
      if (this.searchQuery && !proj.title.toLowerCase().includes(this.searchQuery.toLowerCase())) {
        return false;
      }
      if (this.selectedStatus === 'exclude-done' && proj.status === 'done') {
        return false;
      }
      if (this.selectedStatus !== 'all' && this.selectedStatus !== 'exclude-done' && proj.status !== this.selectedStatus) {
        return false;
      }
      if (this.selectedPriority !== 'all' && (proj.priority || 'medium').toLowerCase() !== this.selectedPriority) {
        return false;
      }
      return true;
    });
  }

  // ========================================
  // Private ヘルパーメソッド
  // ========================================

  /**
   * タイムラインの表示範囲を計算
   * 各タスク/親課題の日付から最適な範囲を決定
   */
  private calculateTimelineRange(): void {
    const hasTasks = this.tasks && this.tasks.length > 0;
    const hasProjects = !this.project && this.projects && this.projects.length > 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDateMs = new Date('9999-12-31').getTime();
    let maxDateMs = new Date('1970-01-01').getTime();

    // 選択中の親課題の日付を含める
    if (this.project) {
      const pStart = this.project.scheduledStartDate ? new Date(this.project.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
      const pEnd = (this.project.deadline || this.project.scheduledEndDate) ? new Date((this.project.deadline || this.project.scheduledEndDate!).replace(/-/g, '/')).getTime() : null;
      if (pStart && pStart < minDateMs) minDateMs = pStart;
      if (pEnd && pEnd > maxDateMs) maxDateMs = pEnd;
    }

    // 全タスクの日付を含める
    if (hasTasks) {
      this.tasks.forEach(task => {
        const start = task.scheduledStartDate ? new Date(task.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
        const targetEndDate = task.deadline ? task.deadline : task.scheduledEndDate;
        const end = targetEndDate ? new Date(targetEndDate.replace(/-/g, '/')).getTime() : null;
        if (start && start < minDateMs) minDateMs = start;
        if (end && end > maxDateMs) maxDateMs = end;
      });
    }

    // 全親課題の日付を含める
    if (hasProjects) {
      this.projects.forEach(proj => {
        const start = proj.scheduledStartDate ? new Date(proj.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
        const targetEndDate = proj.deadline ? proj.deadline : proj.scheduledEndDate;
        const end = targetEndDate ? new Date(targetEndDate.replace(/-/g, '/')).getTime() : null;
        if (start && start < minDateMs) minDateMs = start;
        if (end && end > maxDateMs) maxDateMs = end;
      });
    }

    if (minDateMs === new Date('9999-12-31').getTime()) minDateMs = today.getTime();
    if (maxDateMs === new Date('1970-01-01').getTime()) maxDateMs = today.getTime();

    // タイムライン開始日を月の1日に固定
    const startDate = new Date(Math.min(minDateMs, today.getTime()));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // タイムライン終了日：最小60日先の未来 + さらに30日余裕を持たせる
    const minFutureDate = new Date(today);
    minFutureDate.setDate(minFutureDate.getDate() + 60);

    let endDate = new Date(Math.max(maxDateMs, minFutureDate.getTime()));
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

    // セイフティキャップ：最大365日間
    const MAX_SPAN_DAYS = 365;
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > MAX_SPAN_DAYS) {
      endDate = new Date(startDate.getTime() + MAX_SPAN_DAYS * 24 * 60 * 60 * 1000);
    }

    this.timelineStartDate = startDate;
    this.timelineEndDate = endDate;

    this.generateTimelineColumns(this.timelineStartDate, this.timelineEndDate);
  }

  /**
   * タイムラインの列情報を生成
   */
  private generateTimelineColumns(start: Date, end: Date): void {
    const columns: TimelineColumn[] = [];
    let currentDate = new Date(start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      const d = new Date(currentDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      const dayNum = d.getDay();
      const monthLabel = `${yyyy}/${mm}`;

      const isWeekend = dayNum === 0 || dayNum === 6;
      const isHoliday = this.checkJapaneseHoliday(d);

      columns.push({
        date: d,
        dateString: dateString,
        label: `${d.getDate()}`,
        dayNumber: d.getDate(),
        monthLabel: monthLabel,
        isToday: d.getTime() === today.getTime(),
        isWeekend: isWeekend,
        isHoliday: isHoliday,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.timelineColumns = columns;

    // 年月ごとにヘッダーセルをグループ化
    const monthGroups: MonthGroup[] = [];
    let currentMonthLabel = '';
    let currentCount = 0;

    columns.forEach(col => {
      if (col.monthLabel !== currentMonthLabel) {
        if (currentMonthLabel !== '') {
          monthGroups.push({ label: currentMonthLabel, daysCount: currentCount });
        }
        currentMonthLabel = col.monthLabel;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });
    if (currentMonthLabel !== '') {
      monthGroups.push({ label: currentMonthLabel, daysCount: currentCount });
    }

    this.monthGroups = monthGroups;
  }

  /**
   * 日本の祝日を自動判定
   */
  private checkJapaneseHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    // 固定祝日
    if (month === 1 && day === 1) return true;
    if (month === 2 && day === 11) return true;
    if (month === 2 && day === 23) return true;
    if (month === 4 && day === 29) return true;
    if (month === 5 && day === 3) return true;
    if (month === 5 && day === 4) return true;
    if (month === 5 && day === 5) return true;
    if (month === 8 && day === 11) return true;
    if (month === 11 && day === 3) return true;
    if (month === 11 && day === 23) return true;

    // ハッピーマンデー
    const nthMonday = Math.ceil(day / 7);
    if (dayOfWeek === 1) {
      if (month === 1 && nthMonday === 2) return true;
      if (month === 7 && nthMonday === 3) return true;
      if (month === 9 && nthMonday === 3) return true;
      if (month === 10 && nthMonday === 2) return true;
    }

    // 春分の日・秋分の日の概算
    if (month === 3) {
      const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
      if (day === shunbun) return true;
    }
    if (month === 9) {
      const shūbun = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
      if (day === shūbun) return true;
    }

    // 振替休日
    if (dayOfWeek === 1) {
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - 1);
      if (this.checkJapaneseHoliday(prevDate)) return true;
    }

    return false;
  }

  /**
   * 日付オブジェクトを YYYY-MM-DD 形式の文字列に変換
   */
  private formatDateString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * ドラッグ状態をリセット
   */
  private resetDragState(): void {
    this.draggedItem = null;
    this.dragType = null;
    this.dragStartX = 0;
    this.dragHasMoved = false;
    this.dragStartScheduledStart = undefined;
    this.dragStartScheduledEnd = undefined;
    this.dragStartDeadline = undefined;
    this.childTaskStartDates.clear();
  }
}
