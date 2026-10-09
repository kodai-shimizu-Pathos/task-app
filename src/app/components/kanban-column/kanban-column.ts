import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskCard } from '../task-card/task-card';
import { Task, Status } from '../../models/task.model';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, TaskCard, DragDropModule],
  templateUrl: './kanban-column.html',
  styleUrl: './kanban-column.css',
})
export class KanbanColumn {
  @Input() title!: string;
  @Input() tasks: Task[] = [];
  @Input() headerColor: string= '#2563EB';
  @Input() status!: Status;

  @Output() selectTask = new EventEmitter<Task>();
  @Output() taskDropped = new EventEmitter<CdkDragDrop<Task[]>>();

  onDrop(event: CdkDragDrop<Task[]>): void {
    this.taskDropped.emit(event);
  }

  onSelectTask(task: Task): void {
    this.selectTask.emit(task);
  }
}