import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DelayReason, DELAY_REASON_LABELS } from '../../models/delay-log.model';

@Component({
  selector: 'app-delay-log-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delay-log-toast.html',
  styleUrl: './delay-log-toast.css',
})
export class DelayLogToast implements OnInit, OnDestroy, OnChanges {
  @Input() taskId: string = ''; // ★ タスク切替検知用ID
  @Input() taskTitle: string = '';
  @Input() queueLength: number = 1;
  @Output() selectReason = new EventEmitter<DelayReason>();
  @Output() skipAll = new EventEmitter<void>();

  labels = DELAY_REASON_LABELS;
  reasons: DelayReason[] = ['estimation', 'interruption', 'condition', 'external'];

  progressWidth: number = 100;
  isHovered: boolean = false;

  private interval: any;
  private duration = 5000;
  private elapsed = 0;

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovered = true;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovered = false;
  }

  ngOnInit(): void {
    this.startTimer();
  }

  // 2枚目以降のトーストに切り替わった際、タイマーと状態を完全リセット
  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['taskId'] && !changes['taskId'].firstChange) || 
        (changes['taskTitle'] && !changes['taskTitle'].firstChange)) {
      this.resetAndRestart();
    }
  }

  private resetAndRestart(): void {
    this.clearTimers();
    this.elapsed = 0;
    this.progressWidth = 100;
    this.isHovered = false; // ホバー状態もリセット
    this.startTimer();
  }

  private startTimer(): void {
    const step = 50;
    this.interval = setInterval(() => {
      if (this.isHovered) return; // ホバー中は一時停止

      this.elapsed += step;
      this.progressWidth = Math.max(0, 100 - (this.elapsed / this.duration) * 100);

      if (this.elapsed >= this.duration) {
        this.onSelect('unclassified');
      }
    }, step);
  }

  onSelect(reason: DelayReason): void {
    this.clearTimers();
    this.selectReason.emit(reason);
  }

  onSkipAll(): void {
    this.clearTimers();
    this.skipAll.emit();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}