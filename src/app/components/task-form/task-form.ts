import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core'; 
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
export class TaskForm implements OnInit, OnChanges {
  // 編集対象のタスクデータを受け取る
  @Input() taskToEdit?: Task | null = null;

  @Output() taskCreated = new EventEmitter<Task>(); // 新規タスク作成時のイベント
  @Output() taskUpdated = new EventEmitter<Task>(); // タスク更新時のイベント
  @Output() taskDeleted = new EventEmitter<string>(); // タスク削除時のイベント

  // モーダルを閉じるイベント
  @Output() closeModal = new EventEmitter<void>();

  // フォームに入力された値を保持する一時データ
  title = '';
  status: 'todo' | 'in-progress' | 'done' = 'todo';
  priority: 'low' | 'medium' | 'high' = 'medium';
  scheduledStartDate: string = '';
  scheduledEndDate: string = '';
  deadline: string = '';
  description: string = '';
  tagsString: string = ''; // カンマ区切りの文字列用 (例： "UI設計, Angular")
  // progress = 0; 進捗は一旦非表示にする

  ngOnInit(): void {
    this.populateForm();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit']) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    console.log('task-formが受け取ったデータ：', this.taskToEdit);
    if (this.taskToEdit) {
      this.title = this.taskToEdit.title;
      this.status = this.taskToEdit.status;
      this.priority = this.taskToEdit.priority as any;
      this.scheduledStartDate = this.taskToEdit.scheduledStartDate || '';
      this.scheduledEndDate = this.taskToEdit.scheduledEndDate || '';
      this.deadline = this.taskToEdit.deadline || '';
      this.description = this.taskToEdit.description || '';
      this.tagsString = this.taskToEdit.tags?this.taskToEdit.tags.join(',') : '';
    } else {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.title = '';
    this.status = 'todo';
    this.priority = 'medium';
    this.scheduledStartDate = '';
    this.scheduledEndDate = '';
    this.deadline = '';
    this.description = '';
    this.tagsString = '';
  }

  // フォーム送信 (タスク作成ボタン押下時)
  onSubmit(): void {
    if (!this.title.trim()) {
      alert( 'タスク名を入力してください');
      return;
    }

    // カンマ区切りのタグ文字列を配列に変換
    const tags = this.tagsString
      ? this.tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []; // 空文字列は除外
    
    // タスク編集モードの場合
    if (this.taskToEdit) {
      // タスクを更新
      const updatedTask: Task = {
        ...this.taskToEdit,
        title: this.title,
        status: this.status,
        priority: this.priority,
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        description: this.description || undefined,
        tags: tags,
        progress: this.status === 'done' ?100 : (this.status === 'in-progress' ? 50 : 0),
        createdAt: new Date().toISOString()
      };
      this.taskUpdated.emit(updatedTask);
    } else {
      // 新規タスク作成
      const newTask: Task = {
        id: `ask-${Date.now()}`, // 簡易的な一意のID (タイムスタンプ)
        title: this.title,
        status: this.status,
        priority: this.priority,
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        description: this.description || undefined,
        tags: tags,
        progress: this.status === 'done' ? 100 : (this.status === 'in-progress' ? 50 : 0),
        createdAt: new Date().toISOString()
      };
      this.taskCreated.emit(newTask);
    }
    this.onClose();
  }

  // タスク削除ボタン押下時
  onDelete(): void {
    if (this.taskToEdit && confirm(`タスク「${this.taskToEdit.title}」を削除しますか？`)) {
      this.taskDeleted.emit(this.taskToEdit.id);
      this.onClose();
    }
  }

  // キャンセル　/モーダルを閉じるボタン押下時
  onClose(): void {
    this.closeModal.emit();
  }
}
