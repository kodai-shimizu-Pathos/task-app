import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentProject } from '../../models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-card.html',
  styleUrl: './project-card.css',
})
export class ProjectCard {
  @Input() project!: ParentProject;
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() tagSelected = new EventEmitter<string>(); // ★ この定義が必要です！

  onCardClick(): void {
    this.selectProject.emit(this.project);
  }

  // タグチップクリック時に親へ文字列をemit
  onTagClick(event: MouseEvent, tag: string): void {
    event.stopPropagation(); // カードクリック（モーダル起動等）のバブリングを防止
    this.tagSelected.emit(tag);
  }

  isOverdue(deadline?: string): boolean {
    if (!deadline || this.project.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.replace(/-/g, '/'));
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  }

  getPriorityLabel(priority?: string): string {
    if (!priority) return '中';
    const lower = priority.toLowerCase();
    if (lower === 'high') return '高';
    if (lower === 'medium') return '中';
    if (lower === 'low') return '低';
    return '中';
  }
}