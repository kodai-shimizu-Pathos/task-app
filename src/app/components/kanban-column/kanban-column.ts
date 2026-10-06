import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskCard } from '../task-card/task-card';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, TaskCard],
  templateUrl: './kanban-column.html',
  styleUrl: './kanban-column.css',
})
export class KanbanColumn {
  // カラムのタイトル
  @Input() title!: string;

  // カラムに表示するタスクのリスト
  @Input() tasks: Task[] = [];
}
