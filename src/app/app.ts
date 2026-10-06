import { Component } from '@angular/core';
import { TaskCard } from './components/task-card/task-card';
import { Task } from './models/task.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TaskCard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // テスト用のダミーデータ1件
  sampleTask: Task = {
    id: '1',
    title: '画面遷移図とUI仕様書の作成',
    status: 'in_progress',
    priority: 'high',
    progress: 75,
    tags: ['UI設計', 'Angular'],
    deadline: '2026-10-15'
  };
}
