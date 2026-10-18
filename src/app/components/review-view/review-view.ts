import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskDataService } from '../../services/task-data';
import { AiService, ReviewTone } from '../../services/ai.service';
import { DelayLog, DELAY_REASON_LABELS, DelayReason } from '../../models/delay-log.model';
import { Task } from '../../models/task.model'; // ★ Task型をインポート

@Component({
  selector: 'app-review-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-view.html',
  styleUrls: ['./review-view.css']
})
export class ReviewViewComponent implements OnInit, OnChanges {
  @Input() tasks: Task[] = []; // ★ 親(AppComponent)からタスク一覧を受け取る
  @Input() autoCollect: boolean = true;
  @Output() toggleAutoCollect = new EventEmitter<boolean>();

  selectedTone: ReviewTone = 'sympathetic';
  
  completedCount: number = 0;
  recentLogs: DelayLog[] = [];
  reasonStats: { reason: DelayReason; label: string; icon: string; count: number; percentage: number }[] = [];

  reviewComment: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private dataService: TaskDataService,
    private aiService: AiService
  ) {}

  ngOnInit(): void {
    this.calculateStats();
    this.generateReview();
  }

  // ★ 親からのtasksデータが更新・ロードされた時にも自動再計算する
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] && !changes['tasks'].firstChange) {
      this.calculateStats();
    }
  }

  /**
   * 過去7日間の実績・遅延要因データの集計
   */
  calculateStats(): void {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ★ this.tasks を直接フィルタリング（updatedAt が無い場合は status === 'done' を判定）
    this.completedCount = (this.tasks || []).filter(t => {
      if (t.status !== 'done') return false;
      
      // updatedAt または createdAt など利用可能な日付プロパティを参照（無ければ完了済みの全件を対象）
      const dateStr = (t as any).updatedAt || t.scheduledEndDate || t.deadline;
      if (!dateStr) return true;
      
      return new Date(dateStr) >= sevenDaysAgo;
    }).length;

    // 遅延ログの取得と内訳計算
    this.recentLogs = this.dataService.getRecentDelayLogs(7);
    const totalLogs = this.recentLogs.length;

    const counts: Record<DelayReason, number> = {
      estimation: 0,
      interruption: 0,
      condition: 0,
      external: 0,
      unclassified: 0
    };

    this.recentLogs.forEach(log => {
      if (counts[log.reason] !== undefined) {
        counts[log.reason]++;
      } else {
        counts.unclassified++;
      }
    });

    const reasonsKey: DelayReason[] = ['estimation', 'interruption', 'condition', 'external'];
    this.reasonStats = reasonsKey.map(r => ({
      reason: r,
      label: DELAY_REASON_LABELS[r].label,
      icon: DELAY_REASON_LABELS[r].icon,
      count: counts[r],
      percentage: totalLogs > 0 ? Math.round((counts[r] / totalLogs) * 100) : 0
    }));
  }

  async generateReview(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.reviewComment = await this.aiService.generateWeeklyReview(
        this.completedCount,
        this.recentLogs,
        this.selectedTone
      );
    } catch (err) {
      this.errorMessage = err instanceof Error ? err.message : 'AIレビューの生成に失敗しました。';
    } finally {
      this.isLoading = false;
    }
  }

  onToneChange(): void {
    this.generateReview();
  }

  onToggleCollect(): void {
    this.autoCollect = !this.autoCollect;
    this.toggleAutoCollect.emit(this.autoCollect);
  }
}