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

  onCardClick(): void {
    this.selectProject.emit(this.project);
  }

  isOverdue(deadline?: string): boolean {
    if (!deadline || this.project.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.replace(/-/g, '/'));
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  }
}