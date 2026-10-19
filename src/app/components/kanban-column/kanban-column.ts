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
  @Output() tagSelected = new EventEmitter<string>();

  onTagSelected(tag: string): void {
    this.tagSelected.emit(tag);
  }


  // カードがクリックされたら受け取ったtaskをそのままemitする
  onSelectTask(task: Task): void {
    if (task) {
      this.selectTask.emit(task);
    }
  }

  @Output() addTask = new EventEmitter<void>();

  onAddTask(event: Event): void {
    event.stopPropagation();
    this.addTask.emit();
  }

  @Output() taskDropped = new EventEmitter<CdkDragDrop<Task[]>>();

  onDrop(event: CdkDragDrop<Task[]>): void {
    this.taskDropped.emit(event);
  }
}