import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DelayReason, DELAY_REASON_LABELS } from '../../models/delay-log.model';

@Component({
  selector: 'app-delay-log-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delay-log-toast.html',
  styleUrl: './delay-log-toast.css',
})
export class DelayLogToast {
  @Input() taskTitle: string = '';
  @Output() selectReason = new EventEmitter<DelayReason>();

  labels = DELAY_REASON_LABELS;
  reasons: DelayReason[] = ['estimation', 'interruption', 'condition', 'external'];

  progressWidth: number = 100;
  private timer: any;
  private interval:any;

  ngOnInit(): void {
    // 5秒間のカウントダウン
    const duration = 5000;
    const step = 50;
    let elapsed = 0;

    this.interval = setInterval(() => {
      elapsed += step;
      this.progressWidth = Math.max(0, 100 - (elapsed / duration) * 100);
    }, step);

    // 5秒経過で自動選択なしとして閉じる
    this.timer = setTimeout(() => {
      this.onSelect('unclassified');
    }, duration);
  }

  onSelect(reason: DelayReason): void {
    this.clearTimers();
    this.selectReason.emit(reason);
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.interval) clearInterval(this.interval);
  }
}
