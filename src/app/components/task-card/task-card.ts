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
}
