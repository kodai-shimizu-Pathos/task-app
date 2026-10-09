import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; // フォームのバリデーションを行うために使用
import { Task, PriorityLevel, Status } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm implements OnInit {
  @Input() projectId: string = '';
  @Input() projects: ParentProject[] = [];
  @Input() taskToEdit?: Task | null = null;

  @Output() taskCreated = new EventEmitter<Task>(); // 新規タスク作成時のイベント
  @Output() taskUpdated = new EventEmitter<Task>(); // タスク更新時のイベント
  @Output() taskDeleted = new EventEmitter<string>(); // タスク削除時のイベント

  // モーダルを閉じるイベント
  @Output() closePanel = new EventEmitter<void>();

  // フォーム用モデル
  taskData: Partial<Task> = {
    title: '',
    status: 'todo',
    priority: 'medium',
    parentId: '',
    scheduledStartDate: '',
    scheduledEndDate: '',
    deadline: '',
    description: '',
    tags: []
  };

  ngOnInit(): void {
    if (this.taskToEdit) {
      // 編集モード：既存のタスク情報をセットする
      this.taskData = { ...this.taskToEdit };
    } else {
      // 新規モード：現在選択中の親課題IDを初期値にセット
      this.taskData.parentId = this.projectId;
    }
  }

  // フォーム送信 (タスク作成ボタン押下時)
  onSubmit(): void {
    if (!this.taskData.title || !this.taskData.parentId) return;

    if (this.taskToEdit) {
      this.taskUpdated.emit(this.taskData as Task);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`, // 簡易的な一意のID (タイムスタンプ)
        parentId: this.projectId,
        title: this.taskData.title,
        status: this.taskData.status as Status,
        priority: this.taskData.priority as PriorityLevel,
        scheduledStartDate: this.taskData.scheduledStartDate || undefined,
        scheduledEndDate: this.taskData.scheduledEndDate || undefined,
        deadline: this.taskData.deadline || undefined,
        description: this.taskData.description || undefined,
        tags: this.taskData.tags || [],
        progress: this.taskData.status === 'done' ? 100 : (this.taskData.status === 'in-progress' ? 50 : 0),
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

  // モーダルを閉じるメソッド
  onClose(): void {
    this.closePanel.emit();
  }
}
