import { Component } from '@angular/core';
import { KanbanBoard } from './components/kanban-board/kanban-board';
import { KanbanColumn } from './components/kanban-column/kanban-column';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [KanbanBoard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // テスト用の全タスクリスト（未着手・進行中・完了を混在させる）
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
    },
    {
      id: '3',
      title: 'Firebase Hostingへの自動デプロイ設定',
      status: 'in_progress',
      priority: 'medium',
      progress: 40,
      tags: ['インフラ', 'Firebase'],
      deadline: '2026-10-20'
    },
    {
      id: '4',
      title: 'ドラッグ＆ドロップ機能の実装',
      status: 'todo',
      priority: 'low',
      progress: 0,
      tags: ['機能開発'],
      deadline: '2026-10-25'
    }
  ];
}
