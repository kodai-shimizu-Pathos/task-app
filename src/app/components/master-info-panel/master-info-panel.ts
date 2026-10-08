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
  @Output() editProject = new EventEmitter<void>();

  onEdit(): void {
    this.editProject.emit();
    
  }
  @Output() closePanel = new EventEmitter<void>();

  onClose(): void {
    this.closePanel.emit();
  }

  // 期限超過チェック
  isOverdue(deadline?: string): boolean {
    // 締切なしもしくはステータスが「完了」の場合は期限超過とみなさない
    if (!deadline || this.project.status === 'done') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  }
}