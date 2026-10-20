import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';

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
  @Input() tasks: Task[] = [];
  @Input() project?: ParentProject | null = null;
  @Input() projects: ParentProject[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() addTask = new EventEmitter<void>();
  @Output() addProject = new EventEmitter<void>(); // ★ 新規親課題作成用イベント
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() projectUpdated = new EventEmitter<any>();

  @ViewChild('timelinePane', { static: false }) timelinePane?: ElementRef<HTMLDivElement>;

  timelineColumns: TimelineColumn[] = [];
  monthGroups: MonthGroup[] = [];
  timelineStartDate!: Date;
  timelineEndDate!: Date;

  wbsWidth: number = 320;
  isResizing: boolean = false;
  resizeStartX: number = 0;
  resizeStartWbsWidth: number = 0;

  columnWidth: number = 32;
  timelineScrollLeft: number = 0;

  draggedItem: Task | ParentProject | null = null;
  dragType: 'move' | 'resize-left' | 'resize-right' | 'flag' | null = null;
  dragStartX: number = 0;
  dragHasMoved: boolean = false;
  dragStartScheduledStart?: string;
  dragStartScheduledEnd?: string;
  dragStartDeadline?: string;
  private childTaskStartDates: Map<string, { start?: string; end?: string; deadline?: string }> = new Map();

  private boundMouseMove?: (e: MouseEvent) => void;
  private boundMouseUp?: () => void;
  private justDragged: boolean = false;

  // フィルター・ソート
  searchQuery: string = '';
  selectedStatus: string = 'all';
  selectedPriority: string = 'all';
  sortBy: 'deadline' | 'scheduledEndDate' | 'priority' | 'createdAt' = 'deadline';
  sortOrder: 'asc' | 'desc' = 'asc';

  ngOnInit(): void {
    this.calculateTimelineRange();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] || changes['project'] || changes['projects']) {
      this.calculateTimelineRange();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.onScrollToToday();
    }, 0);
  }

  get isFilterActive(): boolean {
    return (
      this.searchQuery.trim() !== '' ||
      this.selectedStatus !== 'all' ||
      this.selectedPriority !== 'all' ||
      this.sortBy !== 'deadline' ||
      this.sortOrder !== 'asc'
    );
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedPriority = 'all';
    this.sortBy = 'deadline';
    this.sortOrder = 'asc';
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

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

  onProjectClick(project: ParentProject, event: Event): void {
    event.stopPropagation();
    if (project && project.id) {
      this.selectProject.emit(project);
    }
  }

  // ★ 親課題一覧時は「＋ 親課題」、親課題詳細画面（子タスク表示）時は「＋ タスク」を発火
  onAddNewItem(): void {
    if (this.project) {
      this.addTask.emit();
    } else {
      this.addProject.emit();
    }
  }

  getPriorityLabel(priority?: string): string {
    if (!priority) return '中';
    const lower = priority.toLowerCase();
    if (lower === 'high') return '高';
    if (lower === 'medium') return '中';
    if (lower === 'low') return '低';
    return '中';
  }

  isScheduledOverdue(item: Task | ParentProject): boolean {
    if (item.status === 'done' || !item.scheduledEndDate) return false;
    if (this.isDeadlineOverdue(item)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(item.scheduledEndDate.replace(/-/g, '/'));
    target.setHours(0, 0, 0, 0);
    return target < today;
  }

  isDeadlineOverdue(item: Task | ParentProject): boolean {
    if (item.status === 'done' || !item.deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(item.deadline.replace(/-/g, '/'));
    target.setHours(0, 0, 0, 0);
    return target < today;
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
    this.columnWidth = Math.max(24, Math.min(newWidth, 120));
  }

  onZoomIn(): void {
    const newWidth = this.columnWidth + 4;
    this.columnWidth = Math.min(newWidth, 120);
  }

  onZoomOut(): void {
    const newWidth = this.columnWidth - 4;
    this.columnWidth = Math.max(newWidth, 24);
  }

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

  onTimelineScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    if (target) {
      this.timelineScrollLeft = target.scrollLeft;
    }
  }

  onBarMouseDown(item: Task | ParentProject, event: MouseEvent, dragType: 'move' | 'resize-left' | 'resize-right'): void {
    event.stopPropagation();
    this.draggedItem = item;
    this.dragType = dragType;
    this.dragStartX = event.clientX;
    this.dragHasMoved = false;

    this.dragStartScheduledStart = item.scheduledStartDate;
    this.dragStartScheduledEnd = item.scheduledEndDate;
    this.dragStartDeadline = item.deadline;

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

  @HostListener('document:mousemove', ['\$event'])
  onBarMouseMove(event: MouseEvent): void {
    if (!this.draggedItem || !this.dragType || this.dragType === 'flag') return;

    const diffPixels = event.clientX - this.dragStartX;
    if (Math.abs(diffPixels) > 3) {
      this.dragHasMoved = true;
    }

    if (!this.dragHasMoved) return;

    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragType === 'move') {
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
      const baseStart = this.dragStartScheduledStart || this.dragStartScheduledEnd || this.dragStartDeadline;
      if (baseStart) {
        const start = new Date(baseStart.replace(/-/g, '/'));
        start.setDate(start.getDate() + diffDays);
        this.draggedItem.scheduledStartDate = this.formatDateString(start);
      }
    } else if (this.dragType === 'resize-right') {
      if (this.dragStartDeadline) {
        const deadline = new Date(this.dragStartDeadline.replace(/-/g, '/'));
        deadline.setDate(deadline.getDate() + diffDays);
        this.draggedItem.deadline = this.formatDateString(deadline);
      } else if (this.dragStartScheduledEnd) {
        const end = new Date(this.dragStartScheduledEnd.replace(/-/g, '/'));
        end.setDate(end.getDate() + diffDays);
        this.draggedItem.scheduledEndDate = this.formatDateString(end);
      }
    }
  }

  @HostListener('document:mouseup', ['\$event'])
  onBarMouseUp(event: MouseEvent): void {
    if (!this.draggedItem || !this.dragType || this.dragType === 'flag') return;

    try {
      const diffPixels = event.clientX - this.dragStartX;
      const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

      const isProject = 'totalTaskCount' in this.draggedItem;

      if (diffDays !== 0 && this.dragHasMoved) {
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

  onFlagMouseMove(event: MouseEvent): void {
    if (!this.draggedItem || this.dragType !== 'flag') return;
    const diffPixels = event.clientX - this.dragStartX;
    const diffDays = Math.round(diffPixels / (this.columnWidth || 48));

    if (this.dragStartScheduledEnd) {
      const end = new Date(this.dragStartScheduledEnd.replace(/-/g, '/'));
      end.setDate(end.getDate() + diffDays);
      this.draggedItem.scheduledEndDate = this.formatDateString(end);
    }
  }

  onFlagMouseUp(): void {
    if (this.draggedItem && this.dragType === 'flag') {
      const updatedTask = { ...this.draggedItem as Task };
      this.taskUpdated.emit(updatedTask);
    }
    this.draggedItem = null;
    this.dragType = null;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
  }

  getTaskBarPositionPx(item: Task | ParentProject): { left: number; width: number; visible: boolean } {
    const targetEndDate = item.deadline || item.scheduledEndDate;
    
    if (!item.scheduledStartDate || !targetEndDate) {
      if (targetEndDate) {
        const dl = new Date(targetEndDate.replace(/-/g, '/'));
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

  getScheduledEndPositionPx(item: Task | ParentProject): number {
    if (!item.scheduledEndDate) return 0;
    let end = new Date(item.scheduledEndDate.replace(/-/g, '/'));
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

  getChecklistStats(task: Task): { completed: number; total: number } {
    if (!task.checklist || task.checklist.length === 0) {
      return { completed: 0, total: 0 };
    }
    const completed = task.checklist.filter(item => item.completed).length;
    return { completed, total: task.checklist.length };
  }

  hasChecklist(task: Task): boolean {
    return !!(task.checklist && task.checklist.length > 0);
  }

  private compareItems(a: any, b: any): number {
    const getWeight = (p?: string) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[p?.toUpperCase() || ''] || 0);
    const parseDate = (d?: string) => (d ? new Date(d.replace(/-/g, '/')).getTime() : Infinity);

    if (this.sortBy === 'scheduledEndDate') {
      const dateA = parseDate(a.scheduledEndDate);
      const dateB = parseDate(b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority);
    }

    if (this.sortBy === 'deadline') {
      const dateA = parseDate(a.deadline || a.scheduledEndDate);
      const dateB = parseDate(b.deadline || b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority);
    }

    if (this.sortBy === 'priority') {
      let diff = getWeight(b.priority) - getWeight(a.priority);
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return parseDate(a.deadline || a.scheduledEndDate) - parseDate(b.deadline || b.scheduledEndDate);
    }

    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return this.sortOrder === 'asc' ? tA - tB : tB - tA;
  }

  get filteredTasks(): Task[] {
    if (!this.tasks) return [];
    let result = this.tasks.filter(task => {
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

    result.sort((a, b) => this.compareItems(a, b));
    return result;
  }

  get filteredProjects(): ParentProject[] {
    if (!this.projects) return [];
    let result = this.projects.filter(proj => {
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

    result.sort((a, b) => this.compareItems(a, b));
    return result;
  }

  private calculateTimelineRange(): void {
    const hasTasks = this.tasks && this.tasks.length > 0;
    const hasProjects = !this.project && this.projects && this.projects.length > 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDateMs = new Date('9999-12-31').getTime();
    let maxDateMs = new Date('1970-01-01').getTime();

    if (this.project) {
      const pStart = this.project.scheduledStartDate ? new Date(this.project.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
      const pEnd = (this.project.deadline || this.project.scheduledEndDate) ? new Date((this.project.deadline || this.project.scheduledEndDate!).replace(/-/g, '/')).getTime() : null;
      if (pStart && pStart < minDateMs) minDateMs = pStart;
      if (pEnd && pEnd > maxDateMs) maxDateMs = pEnd;
    }

    if (hasTasks) {
      this.tasks.forEach(task => {
        const start = task.scheduledStartDate ? new Date(task.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
        const targetEndDate = task.deadline || task.scheduledEndDate;
        const end = targetEndDate ? new Date(targetEndDate.replace(/-/g, '/')).getTime() : null;
        if (start && start < minDateMs) minDateMs = start;
        if (end && end > maxDateMs) maxDateMs = end;
      });
    }

    if (hasProjects) {
      this.projects.forEach(proj => {
        const start = proj.scheduledStartDate ? new Date(proj.scheduledStartDate.replace(/-/g, '/')).getTime() : null;
        const targetEndDate = proj.deadline || proj.scheduledEndDate;
        const end = targetEndDate ? new Date(targetEndDate.replace(/-/g, '/')).getTime() : null;
        if (start && start < minDateMs) minDateMs = start;
        if (end && end > maxDateMs) maxDateMs = end;
      });
    }

    if (minDateMs === new Date('9999-12-31').getTime()) minDateMs = today.getTime();
    if (maxDateMs === new Date('1970-01-01').getTime()) maxDateMs = today.getTime();

    const startDate = new Date(Math.min(minDateMs, today.getTime()));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const minFutureDate = new Date(today);
    minFutureDate.setDate(minFutureDate.getDate() + 60);

    let endDate = new Date(Math.max(maxDateMs, minFutureDate.getTime()));
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);

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

  private checkJapaneseHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = date.getDay();

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

    const nthMonday = Math.ceil(day / 7);
    if (dayOfWeek === 1) {
      if (month === 1 && nthMonday === 2) return true;
      if (month === 7 && nthMonday === 3) return true;
      if (month === 9 && nthMonday === 3) return true;
      if (month === 10 && nthMonday === 2) return true;
    }

    if (month === 3) {
      const shunbun = Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
      if (day === shunbun) return true;
    }
    if (month === 9) {
      const shūbun = Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
      if (day === shūbun) return true;
    }

    if (dayOfWeek === 1) {
      const prevDate = new Date(date);
      prevDate.setDate(date.getDate() - 1);
      if (this.checkJapaneseHoliday(prevDate)) return true;
    }

    return false;
  }

  private formatDateString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

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