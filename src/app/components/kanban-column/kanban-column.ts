import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() title: string = '';
  @Input() tasks: Task[] = [];

  @Input() status: 'todo' | 'in-progress' | 'done' = 'todo';

  @Output() selectTask = new EventEmitter<Task>();
}
