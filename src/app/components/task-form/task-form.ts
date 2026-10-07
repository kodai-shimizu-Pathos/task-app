import { Component, EventEmitter, Output } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; // フォームのバリデーションを行うために使用
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm {
  // 親 (ボード画面) に新規タスク作成イベントを伝える
  @Output() taskCreated = new EventEmitter<Task>();
  // モーダルを閉じるイベント
  @Output() closeModal = new EventEmitter<void>();

  // フォームに入力された値を保持する一時データ
  title = '';
  status: 'todo' | 'in_progress' | 'done' = 'todo';
  priority: 'low' | 'medium' | 'high' = 'medium';
  progress = 0;
  deadline = '';
  description = '';
  tagsString: string = ''; // カンマ区切りの文字列用 (例： "UI設計, Angular")

  // フォーム送信 (タスク作成ボタン押下時)
  onSubmit(): void {
    if (!this.title.trim()) {
      alert( 'タスク名を入力してください');
      return;
    }

    // カンマ区切りのタグ文字列を配列に変換
    const tags = this.tagsString
      ? this.tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []; // 空文字列は除外

    // 新しいTaskオブジェクトを作成
    const newTask: Task = {
      id: `ask-${Date.now()}`, // 簡易的な一意のID (タイムスタンプ)
      title: this.title,
      status: this.status,
      priority: this.priority,
      progress: this.progress,
      deadline: this.deadline,
      description: this.description,
      tags: tags,
      createdAt: new Date().toISOString()
    };

    // イベント発火 (親コンポーネントへ送信)
    this.taskCreated.emit(newTask);
    this.onClose();
  }

  // キャンセル　/モーダルを閉じる
  onClose(): void {
    this.closeModal.emit();
  }
}
