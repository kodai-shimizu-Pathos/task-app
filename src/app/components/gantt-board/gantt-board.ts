import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, PriorityLevel } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';

export interface TimelineColumn {
  date: Date;
  dateString: string // yyyy-mm-dd
  label: string; // MM/DD
  dayOfWeek: string; //(月), (火)など
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'app-gantt-board',
  imports: [CommonModule, FormsModule],
  templateUrl: './gantt-board.html',
  styleUrl: './gantt-board.css',
})
export class GanttBoard implements OnInit, OnChanges {
  @Input() tasks: Task[] = [];
  @Input() project?: ParentProject | null = null;
  @Input() projects: ParentProject[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() addTask = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();

  // ヘッダーコントロール状態
  viewScale: 'day' | 'week' | 'month' = 'week';
  showInazumaLine: boolean = true;

  // タイムライン算出プロボディ
  timelineColumns: TimelineColumn[] = [];
  timelineStartDate!: Date;
  timelineEndDate!: Date;
  totalDays: number = 14;

  ngOnInit(): void  {
    this.calculateTimelineRange();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] || changes['project']) {
      this.calculateTimelineRange();
    }
  }

  // 表示スケールの切替
  onViewScaleChange(scale: 'day' | 'week' | 'month'): void {
    this.viewScale = scale;
    this.totalDays = scale === 'day' ? 7 : scale === 'week' ? 14 : 30;
    this.calculateTimelineRange();
  }

  // タイムラインの日付列グリッドを生成
  private calculateTimelineRange(): void {
    const today = new Date();
    today.setHours(0,0,0,0);

    // 今日を中心 (過去3日～未来11日) に設定
    const start = new Date(today);
    start.setDate(today.getDate() - 3);
    this.timelineStartDate = start;

    const end = new Date(start);
    end.setDate(start.getDate() + this.totalDays -1);
    this.timelineEndDate = end;

    const days: TimelineColumn[] = [];
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    for (let i = 0; i < this.totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const dayNum = d.getDay();
      days.push({
        date: d,
        dateString: dateString,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayOfWeek: `(${dayNames[dayNum]})`,
        isToday: d.getTime() === today.getTime(),
        isWeekend: dayNum === 0 || dayNum === 6,
      });
    }

    this.timelineColumns = days;
  }

  // タスクの開始・修了予定日からガントバーの相対位置・幅を計算
  getTaskBarPosition(task: Task) : { left: number; width: number; visible: boolean} {
    if (!task.scheduledStartDate || !task.scheduledEndDate) {
      // 予定日未設定の場合は期限のみ、または初期幅hy字
      if (task.deadline) {
        const dl = new Date(task.deadline);
        dl.setHours(0,0,0,0);
        const startDiff = (dl.getTime() - this.timelineStartDate.getTime()) / (1000 * 60 * 60 * 24);
        const left = Math.max(0, (startDiff / this.totalDays) * 100);
        return { left: left, width: Math.max(4, (1 / this.totalDays) * 100), visible: true };
      }
      return { left: 0, width: 0, visible: false };
    }

    const start = new Date(task.scheduledStartDate);
    start.setHours(0,0,0,0);
    const end = new Date(task.scheduledEndDate);
    end.setHours(23,59,59,999);

    const totalRangeMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();
    const startOffsetMs = start.getTime() - this.timelineStartDate.getTime();
    const durationMs = end.getTime() - start.getTime();

    let left = (startOffsetMs / totalRangeMs) * 100;
    let width = (durationMs / totalRangeMs) * 100;

    // 範囲外の補正
    if (left < 0 ) {
      width += left;
      left = 0;
    }
    if (width <= 0) return { left: 0, width: 0, visible: false };

    return { left: Math.min(100, left), width: Math.min(100, width), visible: true };
  }

  // イナズマ線の算出
  getInazumaPoints(): string {
    if (!this.showInazumaLine || !this.tasks || this.tasks.length === 0) return '';

    const today = new Date();
    today.setHours(0,0,0,0);
    const totalRangeMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();
    const todayOffsetMs = today.getTime() - this.timelineStartDate.getTime();
    const todayLeftPercent = (todayOffsetMs / totalRangeMs) * 100;

    const rowHeight = 44; // ガントバーの高さ
    const headerOffset = 36; // ヘッダー別オフセット

    const points: string[] = [];
    points.push(`${todayLeftPercent}%, 0`);

    this.tasks.forEach((task, index) => {
      const y = headerOffset + (index * rowHeight) + (rowHeight / 2);
      let targetXPercent = todayLeftPercent;

      // 遅延チェック：未完了かつ期限/予定終了日を過ぎている場合、左方向へ屈曲する
      const isDone = task.status === 'done';
      const progress = task.progress == 0;
      const targetDate = task.scheduledEndDate || task.deadline;

      if (!isDone && targetDate) {
        const target = new Date(targetDate);
        target.setHours(0,0,0,0);
        if (target < today) {
          // 遅延日数に応じた左シフト
          const delayDays = Math.min(5, (today.getTime() - target.getTime()) / (1000* 60 * 60 * 24));
          const delayPercent = (delayDays / this.totalDays) * 100;
          targetXPercent = Math.max(2, todayLeftPercent - delayPercent);
        }
      }

      points.push(`${targetXPercent}%, ${y}px`);
    });

    const totalHeight = headerOffset + (this.tasks.length * rowHeight);
    points.push(`${todayLeftPercent}%, ${totalHeight}px`);

    return points.join(',');
  }

  isOverdue(deadline?: string): boolean {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(deadline);
    d.setHours(0,0,0,0);
    return d < today;
  }

  onSelectTask(task: Task): void {
    this.selectTask.emit(task);
  }

  onAddTask(): void {
    this.addTask.emit();
  }
}
