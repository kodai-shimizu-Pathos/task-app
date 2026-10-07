import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true, //単独かつ軽量なコンポーネントとして宣言
  imports: [CommonModule], //HTMLでngIf(条件分岐)やngFor(繰り返し処理)などのAngularの機能を使用できるようにする
  templateUrl: './task-card.html',
  styleUrl: './task-card.css',
})
export class TaskCard {
  // 親コンポーネントから渡される1件のタスクデータを受け取るためのプロパティ
  @Input() task!: Task;

  // 期限超過チェック
  isOverdue(deadline?: string): boolean {
    // 締切なしもしくはステータスが「完了」の場合は期限超過とみなさない
    if (!deadline || this.task.status === 'done') {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    return deadlineDate < today;
  }
}