import { Component, Input, Output, EventEmitter } from '@angular/core'; // Output, EventEmitter 追加
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
})
export class TaskCard {
  @Input() task!: Task;
  @Output() selectTask = new EventEmitter<Task>(); // 追加: タスク選択イベント

  // 追加: カードクリック時の処理
  onCardClick(): void {
    console.log('カードクリック:', this.task);
    this.selectTask.emit(this.task);
  }

  isOverdue(deadline?: string): boolean {
    if (!deadline || this.task.status === 'done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.replace(/-/g, '/'));
    deadlineDate.setHours(0, 0, 0, 0);
    
    return deadlineDate < today;
  }
}