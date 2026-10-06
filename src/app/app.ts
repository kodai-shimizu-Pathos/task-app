import { Component } from '@angular/core';
import { KanbanColumn } from './components/kanban-column/kanban-column';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KanbanColumn],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // テスト用タスクリスト（2件）
  inProgressTasks: Task[] = [
    {
      id: '1',
      title: '画面遷移図とUI仕様書の作成',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      tags: ['UI設計', 'Angular'],
      deadline: '2026-10-15'
    },
    {
      id: '2',
      title: 'Firebase Hostingへの自動デプロイ設定',
      status: 'in_progress',
      priority: 'medium',
      progress: 40,
      tags: ['インフラ', 'Firebase'],
      deadline: '2026-10-20'
    }
  ];
}
