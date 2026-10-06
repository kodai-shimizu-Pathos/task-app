import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanColumn } from '../kanban-column/kanban-column';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumn],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.css',
})
export class KanbanBoard {
  // 全タスクの配列を受け取る
  @Input() tasks: Task[] = [];

  // 「未着手」のタスクだけを抽出するゲッター
  get todoTasks(): Task[] {
    return this.tasks.filter(task => task.status === "todo");
  }

  // 「進行中」のタスクだけを抽出するゲッター
  get inProgressTasks(): Task[] {
    return this.tasks.filter(task => task.status === "in_progress");
  }

  // 「完了」のタスクだけを抽出するゲッター
  get doneTasks() : Task[] {
    return this.tasks.filter(task => task.status === "done");
  }
}
