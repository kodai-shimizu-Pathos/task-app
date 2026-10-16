import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, OnChanges } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
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

  @Output() taskCreated = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() closePanel = new EventEmitter<void>();

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

  get isEditMode(): boolean {
    return !!(this.taskToEdit && this.taskToEdit.id);
  }
  
  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] && this.taskToEdit) {
      this.taskData = { ...this.taskToEdit };
      this.tagsInput = this.taskToEdit.tags ? this.taskToEdit.tags.join(', '): '';
    } else if (!this.taskToEdit) {
      this.resetForm(this.projectId);
    }
  }

  private populateForm(): void {
    // 親課題IDのデフォルト値を設定（渡されたprojectId、またはprojectsの先頭要素のID）
    const defaultParentId = this.projectId || (this.projects && this.projects.length > 0 ? this.projects[0].id : '');

    if (this.taskToEdit) {
      // 編集モード
      this.taskData = { ...this.taskToEdit };
      if (!this.taskData.parentId) {
        this.taskData.parentId = defaultParentId;
      }
      this.tagsInput = Array.isArray(this.taskToEdit.tags) ? this.taskToEdit.tags.join(', ') : '';
    } else {
      // 新規作成モード
      this.resetForm(defaultParentId);
    }
  }

  private resetForm(defaultParentId: string): void {
    this.taskData = {
      parentId: defaultParentId,
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

  private parseTags(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(tag => tag.length > 0);
  }

  onSubmit(): void {
    if (!this.taskData.title?.trim() || !this.taskData.parentId) {
      alert('タスク名と親課題を選択してください');
      return;
    }

    const parsedTags = this.parseTags(this.tagsInput);

    // 既存タスク更新処理
    if (this.taskToEdit && this.taskToEdit.id) {
      const updatedTask: Task = {
        ...this.taskToEdit,
        ...(this.taskData as Task),
        tags: parsedTags,
        progress: this.taskData.status === 'done' ? 100 : (this.taskData.status === 'in-progress' ? 50 : 0),
        updatedAt: new Date().toISOString()
      };
      this.taskUpdated.emit(updatedTask);
    } else {
      // 新規タスク作成処理
      const newTask: Task = {
        id: 'task-' + Date.now(),
        parentId: this.taskData.parentId,
        title: this.taskData.title!,
        status: this.taskData.status || 'todo',
        priority: this.taskData.priority || 'medium',
        scheduledStartDate: this.taskData.scheduledStartDate || '',
        scheduledEndDate: this.taskData.scheduledEndDate || '',
        deadline: this.taskData.deadline || '',
        description: this.taskData.description || '',
        tags: parsedTags,
        progress: this.taskData.status === 'done' ? 100 : (this.taskData.status === 'in-progress' ? 50 : 0),
        createdAt: new Date().toISOString()
      };
      this.taskCreated.emit(newTask);
    }
    this.onClose();
  }

  onDelete(): void {
    if (this.taskToEdit && confirm(`タスク「${this.taskToEdit.title}」を削除しますか？`)) {
      this.taskDeleted.emit(this.taskToEdit.id);
      this.onClose();
    }
  }

  onClose(): void {
    this.closePanel.emit();
  }
}