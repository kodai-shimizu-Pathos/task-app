import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParentProject } from '../../models/project.model';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-archive-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archive-modal.html',
  styleUrl: './archive-modal.css',
})
export class ArchiveModal {
  @Input() archivedProjects: ParentProject[] = [];
  @Input() archivedTasks: Task[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() restoreProject = new EventEmitter<ParentProject>();
  @Output() deleteProject = new EventEmitter<string>();
  @Output() restoreTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();

  activeTab: 'projects' | 'tasks' = 'projects';

  onClose(): void {
    this.closeModal.emit();
  }

  onRestoreProject(project: ParentProject): void {
    this.restoreProject.emit(project);
  }

  onDeleteProject(id: string): void {
    if (confirm('この親課題を完全に削除しますか？紐づくデータも削除されます。')) {
      this.deleteProject.emit(id);
    }
  }

  onRestoreTask(task: Task): void {
    this.restoreTask.emit(task);
  }

  onDeleteTask(id: string): void {
    if (confirm('このタスクを完全に削除しますか？')) {
      this.deleteTask.emit(id);
    }
  }
}