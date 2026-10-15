import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, PriorityLevel } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';

export interface TimelineColumn {
  date: Date;
  dateString: string;
  label: string;
  dayOfWeek: string;
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'app-gantt-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt-board.html',
  styleUrl: './gantt-board.css',
})
export class GanttBoard implements OnInit, OnChanges, AfterViewInit {
  @Input() tasks: Task[] = [];
  @Input() project?: ParentProject | null = null;
  @Input() projects: ParentProject[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() addTask = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();

  @ViewChild('timelinePane', { static: false }) timelinePane?: ElementRef<HTMLDivElement>;

  viewScale: 'day' | 'week' | 'month' = 'week';
  timelineColumns: TimelineColumn[] = [];
  timelineStartDate!: Date;
  timelineEndDate!: Date;
  totalDays: number = 14;

  wbsWidth: number = 320;
  isResizing: boolean = false;
  resizeStartX: number = 0;
  resizeStartWbsWidth: number = 0;

  columnWidth: number = 48;
  timelineScrollLeft: number = 0;

  draggedTask: Task | null = null;
  dragType: 'move' | 'resize-left' | 'resize-right' | 'flag' | null = null;
  dragStartX: number = 0;
  dragHasMoved: boolean = false;

  dragStartScheduledStart?: string;
  dragStartScheduledEnd?: string;
  dragStartDeadline?: string;

  private boundMouseMove?: (e: MouseEvent) => void;
  private boundMouseUp?: () => void;

  ngOnInit(): void {
    this.calculateTimelineRange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] && this.tasks) {
      this.tasks.sort((a, b) => {
        const dateA = new Date(a.scheduledStartDate || a.deadline || '9999-12-31').getTime();
        const dateB = new Date(b.scheduledStartDate || b.deadline || '9999-12-31').getTime();
        return dateA - dateB;
      });
    }
    if (changes['tasks'] || changes['project']) {
      this.calculateTimelineRange();
    }
  }

  // ビューが初期化された後に今日の日付にスクロール
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.onScrollToToday();
    }, 0);
  }


  onViewScaleChange(scale: 'day' | 'week' | 'month'): void {
    this.viewScale = scale;
    this.totalDays = scale === 'day' ? 7 : scale === 'week' ? 14 : 30;
    this.calculateTimelineRange();
  }

  private calculateTimelineRange(): void {
    // 1. タスクが1つもない場合は、今日を基準に前後30日を表示
    if (!this.tasks || this.tasks.length === 0) {
      const today = new Date();
      this.timelineStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
      this.generateTimelineColumns(this.timelineStartDate, endDate);
      return;
    }

    // 2. 全タスクの中から「最小の開始日」と「最大の終了日(期限)」を求める
    let minDateMs = new Date('9999-12-31').getTime();
    let maxDateMs = new Date('1970-01-01').getTime();

    this.tasks.forEach(task => {
      const start = task.scheduledStartDate ? new Date(task.scheduledStartDate).getTime() : null;
      // 終了日はdeadlineを優先、なければscheduledEndDateを使用
      const targetEndDate = task.deadline ? task.deadline : task.scheduledEndDate;
      const end = targetEndDate ? new Date(targetEndDate).getTime() : null;

      if (start && start < minDateMs) minDateMs = start;
      if (end && end > maxDateMs) maxDateMs = end;
    });

    // 3. タイムラインの始点と終点を設定
    const startDate = new Date(minDateMs);
    startDate.setDate(startDate.getDate() -30);
    this.timelineStartDate = startDate; // getTaskBarPositionPx()で使用

    const endDate = new Date(maxDateMs);
    endDate.setDate(endDate.getDate() + 30);

    // 4. 始点から終点までの日付配列を生成
    this.generateTimelineColumns(this.timelineStartDate, endDate);
  }

  // 日付の配列を作る処理
  generateTimelineColumns(start: Date, end: Date): void {
    const columns = [];
    let currentDate = new Date(start);

    // 今日の日付判定用
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    // 開始日から終了日まで1日ずつループして配列に詰める
    while (currentDate <= end) {
      const d = new Date(currentDate);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;
      const dayNum = d.getDay();

      columns.push({
        date: d,
        dateString: dateString,
        label: `${mm}/${dd}`,
        dayOfWeek: `(${dayNames[dayNum]})`,
        isToday: d.getTime() === today.getTime(),
        isWeekend: dayNum === 0 || dayNum === 6,
      });

      // 日付を1日進める
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.timelineColumns = columns;
  }

  onTaskClick(task: Task, event: Event): void {
    event.stopPropagation();
    console.log('🔍 [4] GanttBoard onTaskClick 発火:', task);
    if (task && task.id) {
      this.selectTask.emit(task);
    }
  }

  onProjectClick(project: ParentProject, event: Event): void {
    event.stopPropagation();
    if (project && project.id) {
      this.selectProject.emit(project);
    }
  }

  onAddNewTask(): void {
    this.addTask.emit();
  }

  getPriorityLabel(priority?: string): string {
    if (!priority) return '中';
    const lower = priority.toLowerCase();
    if (lower === 'high') return '高';
    if (lower === 'medium') return '中';
    if (lower === 'low') return '低';
    return '中';
  }

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

  onSplitterMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;
    const diff = event.clientX - this.resizeStartX;
    const newWidth = this.resizeStartWbsWidth + diff;
    this.wbsWidth = Math.max(200, Math.min(newWidth, window.innerWidth * 0.8));
  }

  onSplitterMouseUp(): void {
    this.isResizing = false;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  onTimelineWheel(event: WheelEvent): void {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -1 : 1;
    const newWidth = this.columnWidth + delta * 4;
    this.columnWidth = Math.max(32, Math.min(newWidth, 120));
  }

  onZoomIn(): void {
    const newWidth = this.columnWidth + 4;
    this.columnWidth = Math.min(newWidth, 120);
  }

  onZoomOut(): void {
    const newWidth = this.columnWidth - 4;
    this.columnWidth = Math.max(newWidth, 32);
  }

  onScrollToToday(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日の日付がタイムラインのどの位置にあるかを計算
    const todayIndex = Math.floor(
      (today.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    // タイムラインのスクロール位置を計算
    if (this.timelinePane && this.timelinePane.nativeElement) {
      const offset = (this.timelinePane.nativeElement.clientWidth / 4) - (this.columnWidth / 2);
      const scrollLeft = todayIndex * this.columnWidth - offset;
      this.timelinePane.nativeElement.scrollLeft = Math.max(0, scrollLeft);
    }
  }

  onTimelineScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    if (target) {
      this.timelineScrollLeft = target.scrollLeft;
    }
  }

  onBarMouseDown(task: Task, event: MouseEvent, dragType: 'move' | 'resize-left' | 'resize-right'): void {
    event.stopPropagation();

    this.draggedTask = task;
    this.dragType = dragType;
    this.dragStartX = event.clientX;
    this.dragHasMoved = false;

    this.dragStartScheduledStart = task.scheduledStartDate;
    this.dragStartScheduledEnd = task.scheduledEndDate;
    this.dragStartDeadline = task.deadline;

    this.boundMouseMove = this.onBarMouseMove.bind(this);
    this.boundMouseUp = this.onBarMouseUp.bind(this);

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onBarMouseMove(event: MouseEvent): void {
    if (!this.draggedTask || !this.dragType) return;

    const diffPixels = event.clientX - this.dragStartX;
    if (Math.abs(diffPixels) > 3) {
      this.dragHasMoved = true;
    }

    if (!this.dragHasMoved) return;

    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragType === 'move') {
      if (this.dragStartScheduledStart) {
        const start = new Date(this.dragStartScheduledStart);
        start.setDate(start.getDate() + diffDays);
        this.draggedTask.scheduledStartDate = this.formatDateString(start);
      }
      if (this.dragStartScheduledEnd) {
        const end = new Date(this.dragStartScheduledEnd);
        end.setDate(end.getDate() + diffDays);
        this.draggedTask.scheduledEndDate = this.formatDateString(end);
      }
      if (this.dragStartDeadline) {
        const deadline = new Date(this.dragStartDeadline);
        deadline.setDate(deadline.getDate() + diffDays);
        this.draggedTask.deadline = this.formatDateString(deadline);
      }
    } else if (this.dragType === 'resize-left') {
      if (this.dragStartScheduledStart) {
        const start = new Date(this.dragStartScheduledStart);
        start.setDate(start.getDate() + diffDays);
        this.draggedTask.scheduledStartDate = this.formatDateString(start);
      }
    } else if (this.dragType === 'resize-right') {
      if (this.dragStartDeadline) {
        const deadline = new Date(this.dragStartDeadline);
        deadline.setDate(deadline.getDate() + diffDays);
        this.draggedTask.deadline = this.formatDateString(deadline);
      }
    }
  }

  onBarMouseUp(): void {
    if (this.draggedTask) {
      if (this.dragHasMoved) {
        console.log('🔍 [2-A] GanttBoard ドラッグ移動完了:', this.draggedTask);
        this.taskUpdated.emit(this.draggedTask);
      } else {
        // ドラッグ移動しなかった場合はクリック（詳細画面オープン）
        console.log('🔍 [2-B] GanttBoard バークリック (選択):', this.draggedTask);
        this.selectTask.emit(this.draggedTask);
      }
    }
    this.draggedTask = null;
    this.dragType = null;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  onFlagMouseDown(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.draggedTask = task;
    this.dragType = 'flag';
    this.dragStartX = event.clientX;
    this.dragStartScheduledEnd = task.scheduledEndDate;

    this.boundMouseMove = this.onFlagMouseMove.bind(this);
    this.boundMouseUp = this.onFlagMouseUp.bind(this);

    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  onFlagMouseMove(event: MouseEvent): void {
    if (!this.draggedTask || this.dragType !== 'flag') return;
    const diffPixels = event.clientX - this.dragStartX;
    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragStartScheduledEnd) {
      const end = new Date(this.dragStartScheduledEnd);
      end.setDate(end.getDate() + diffDays);
      this.draggedTask.scheduledEndDate = this.formatDateString(end);
    }
  }

  onFlagMouseUp(): void {
    if (this.draggedTask) {
      this.taskUpdated.emit(this.draggedTask);
    }
    this.draggedTask = null;
    this.dragType = null;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private formatDateString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getTaskBarPositionPx(item: Task | ParentProject): { left: number; width: number; visible: boolean } {
    // スケジュール開始日と終了日がない場合は、期限があれば期限によって位置を計算
    if (!item.scheduledStartDate || !item.scheduledEndDate) {
      if (item.deadline) {
        const dl = new Date(item.deadline);
        dl.setHours(0, 0, 0, 0);
        const deadlineIndex = Math.floor((dl.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const left = deadlineIndex * this.columnWidth;
        return { left, width: this.columnWidth, visible: true };
      }
      return { left: 0, width: 0, visible: false };
    }

    const start = new Date(item.scheduledStartDate);
    start.setHours(0, 0, 0, 0);

    const targetEnddate = item.deadline ? item.deadline : item.scheduledEndDate;
    const end = new Date(targetEnddate);
    end.setHours(23, 59, 59, 999);

    const startIndex = Math.floor((start.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const endIndex = Math.ceil((end.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));

    const left = startIndex * this.columnWidth;
    const width = (endIndex - startIndex) * this.columnWidth;

    return { left: Math.max(0, left), width: Math.max(this.columnWidth, width), visible: width > 0 };
  }

  // スケジュール終了日の位置を取得
  getScheduledEndPositionPx(item: Task | ParentProject): number {
    if (!item.scheduledEndDate) return 0;
    const end = new Date(item.scheduledEndDate);
    end.setHours(23, 59, 59, 999);
    const endIndex = Math.floor((end.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000));
    return (endIndex * this.columnWidth) + (this.columnWidth / 2);
  }

  // タスクが期限切れかどうかを判定
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
}