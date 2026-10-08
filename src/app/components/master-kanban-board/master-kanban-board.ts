import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectCard } from '../project-card/project-card';
import { ParentProject } from '../../models/project.model';

@Component({
  selector: 'app-master-kanban-board',
  standalone: true,
  imports: [CommonModule, ProjectCard],
  templateUrl: './master-kanban-board.html',
  styleUrl: './master-kanban-board.css',
})
export class MasterKanbanBoard {
  @Input() projects: ParentProject[] = [];
  @Output() selectProject = new EventEmitter<ParentProject>();

  // 各ステータスごとの親課題フィルタリング
  get todoProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'todo');
  }

  get inProgressProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'in-progress' || (p.status as string) === 'in-progress');
  }

  get doneProjects(): ParentProject[] {
    return this.projects.filter(p => p.status === 'done');
  }

  onSelectProject(project: ParentProject): void {
    this.selectProject.emit(project);
  }
}
