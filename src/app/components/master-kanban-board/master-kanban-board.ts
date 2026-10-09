import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ProjectCard } from '../project-card/project-card';
import { ParentProject } from '../../models/project.model';
import { Status } from '../../models/task.model';

@Component({
  selector: 'app-master-kanban-board',
  standalone: true,
  imports: [CommonModule, ProjectCard, DragDropModule],
  templateUrl: './master-kanban-board.html',
  styleUrl: './master-kanban-board.css',
})
export class MasterKanbanBoard {
  @Input() projects: ParentProject[] = [];
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() parentTaskUpdated = new EventEmitter<ParentProject>();

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

  /**
   * 親課題カードがカラム間でドロップされた際のハンドラー
   * @param event CdkDragDrop イベント
   * @param targetStatus ドロップ先のステータス ('todo' | 'in-progress' | 'done')
   */
  onProjectDropped(event: CdkDragDrop<ParentProject[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      // 同一カラム内での順番入れ替え
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 異なるカラム間での移動 (ステータスの変更)
      const project = event.previousContainer.data[event.previousIndex];

      const updatedProject: ParentProject = {
        ...project,
        status: targetStatus,
        updatedAt: new Date().toISOString(),
      };

      // CDK の配列間データ移動処理
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // 親コンポーネントに更新された親課題を通知
      this.parentTaskUpdated.emit(updatedProject);
    }
  }
}
