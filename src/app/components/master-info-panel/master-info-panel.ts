import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentProject } from '../../models/project.model';

@Component({
  selector: 'app-master-info-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './master-info-panel.html',
  styleUrl: './master-info-panel.css'
})
export class MasterInfoPanel {
  @Input() project!: ParentProject;
  @Input() isCollapsed: boolean = false;
  
  @Output() editProject = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() addTask = new EventEmitter<void>();
  @Output() archiveProject = new EventEmitter<void>();

  onEdit(): void {
    this.editProject.emit();
  }

  onToggle(): void {
    this.toggleCollapse.emit();
  }

  onClose(): void {
    this.closePanel.emit();
  }

  onAddTask(): void {
    this.addTask.emit();
  }

  onArchiveProject(): void {
    if (confirm('この親課題をアーカイブしますか？')) {
      this.archiveProject.emit();
    }
  }

  /**
   * ★ カンバンカラムと同色のステータスカラーを取得
   */
  getStatusColor(status?: string): string {
    if (!status) return '#64748B';
    const normalized = status.toLowerCase().replace('_', '-');
    if (normalized === 'done') return '#059669';       // 完了：グリーン
    if (normalized === 'in-progress' || normalized === 'inprogress') return '#2563EB'; // 進行中：ブルー
    return '#64748B';                                  // 未着手：スレートグレー
  }

  /**
   * ★ 優先度ラベル変換
   */
  getPriorityLabel(priority?: string): string {
    if (!priority) return '中';
    const lower = priority.toLowerCase();
    if (lower === 'high') return '高';
    if (lower === 'medium') return '中';
    if (lower === 'low') return '低';
    return '中';
  }

  // 期限超過チェック
  isOverdue(deadline?: string): boolean {
    if (!deadline || this.project.status === 'done') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.replace(/-/g, '/'));
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  }
}