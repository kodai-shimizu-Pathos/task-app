import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { TaskForm } from './components/task-form/task-form';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, KanbanBoard, TaskForm],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // モーダルの表示/非表示フラグ
  isFormOpen: boolean = false;

  allTasks: Task[] = [
    {
      id: '1',
      title: '要件定義・データモデル設計',
      status: 'done',
      priority: 'high',
      progress: 100,
      tags: ['設計'],
      deadline: '2026-10-05'
    },
    {
      id: '2',
      title: '画面遷移図とUI仕様書の作成',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      tags: ['UI設計', 'Angular'],
      deadline: '2026-10-15'
    }
  ];

  // モーダルの開閉
  openForm(): void { this.isFormOpen = true; }
  closeForm(): void { this.isFormOpen = false; }

  // 新規タスク追加処理
  onTaskCreated(newTask: Task): void {
    // 新しいタスクを配列の先頭に追加
    this.allTasks = [newTask, ...this.allTasks];
  }
}