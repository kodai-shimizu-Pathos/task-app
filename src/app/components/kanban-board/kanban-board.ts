import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { KanbanColumn } from '../kanban-column/kanban-column';
import { Task, Status } from '../../models/task.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumn, DragDropModule],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.css',
})
export class KanbanBoard {
  // 全タスクの配列を受け取る
  @Input() tasks: Task[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() addTask = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();

  // 「未着手」のタスクだけを抽出するゲッター
  get todoTasks(): Task[] {
    return this.tasks.filter(task => task.status === "todo");
  }

  // 「進行中」のタスクだけを抽出するゲッター
  get inProgressTasks(): Task[] {
    return this.tasks.filter(task => task.status === "in-progress");
  }

  // 「完了」のタスクだけを抽出するゲッター
  get doneTasks() : Task[] {
    return this.tasks.filter(task => task.status === "done");
  }

  onTaskDropped(event: CdkDragDrop<Task[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      // 同一カラム内での順番入れ替え
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 異なるカラム間での移動 (ステータス＆進捗率の変更が走る)
      const task = event.previousContainer.data[event.previousIndex];
      const newProgress = targetStatus === 'done' ? 100 : (targetStatus === 'in-progress' ? 50 : 0);

      const updatedTask: Task = {
        ...task,
        status: targetStatus,
        progress: newProgress,
        updatedAt: new Date().toISOString(),
      };

      // CDKの配列間データ移動処理
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      // 親コンポーネントに更新されたタスクを通知
      this.taskUpdated.emit(updatedTask);
    } 
  }
  onAddTask(): void {
    this.addTask.emit();
  }
}
