import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, OnChanges} from '@angular/core'; 
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
export class TaskForm implements OnInit, OnChanges {
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
  };

  tagsInput: string = '';
  
  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] || changes['projectId']) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (this.taskToEdit) {
      // 編集モード
      this.taskData = {...this.taskToEdit};
      // タグはカンマ区切りの文字列から配列に変換
      this.tagsInput = Array.isArray(this.taskToEdit.tags) ? this.taskToEdit.tags.join(', '): '';
    } else {
      // 新規作成モード：初期化
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.taskData = {
      parentId: this.projectId,
      title: '',
      status: 'todo',
      priority: 'medium',
      description: '',
      scheduledStartDate: '',
      scheduledEndDate: '',
      deadline: '',
    };
    this.tagsInput = '';
  }

  // カンマ区切りの文字列を string[]に分解するヘルパー
  private parseTags(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(tag => tag.length > 0);
  }

  // フォーム送信 (タスク作成ボタン押下時)
  onSubmit(): void {
    if (!this.taskData.title?.trim() || !this.taskData.parentId) {
      alert('タスク名と親課題を選択してください');
      return;
    }

    const parsedTags = this.parseTags(this.tagsInput);

    if (this.taskToEdit) {
      // 更新処理
      const updatedTask: Task = {
        ...(this.taskToEdit),
        ...(this.taskData as Task),
        tags: parsedTags,
        progress: this.taskData.status === 'done' ? 100 : (this.taskData.status === 'in-progress' ? 50 :0),
        updatedAt: new Date().toISOString()
      };
      this.taskUpdated.emit(updatedTask);
    } else {
      // 新規作成処理
      const newTask: Task = {
        id: `task-${Date.now()}`, // 簡易的な一意のID (タイムスタンプ)
        parentId: this.projectId,
        title: this.taskData.title!,
        status: this.taskData.status || 'todo',
        priority: this.taskData.priority || 'medium',
        scheduledStartDate: this.taskData.scheduledStartDate,
        scheduledEndDate: this.taskData.scheduledEndDate,
        deadline: this.taskData.deadline,
        description: this.taskData.description,
        tags: parsedTags,
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
