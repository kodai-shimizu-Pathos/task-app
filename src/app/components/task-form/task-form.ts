import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, OnChanges } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Task, PriorityLevel, Status, ChecklistItem } from '../../models/task.model';
import { ParentProject } from '../../models/project.model';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.css',
})
export class TaskForm implements OnInit, OnChanges {
  // ========================================
  // @Input / @Output
  // ========================================
  @Input() projectId: string = '';
  @Input() projects: ParentProject[] = [];
  @Input() taskToEdit?: Task | null = null;

  @Output() taskCreated = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() closePanel = new EventEmitter<void>();

  // ========================================
  // フォーム状態
  // ========================================
  taskData: Partial<Task> = {
    title: '',
    status: 'todo',
    priority: 'medium',
    parentId: '',
    scheduledStartDate: '',
    scheduledEndDate: '',
    deadline: '',
    description: '',
    checklist: [],
  };

  tagsInput: string = '';
  checklistInput: string = '';
  
  /** インライン編集中のチェックリスト項目ID */
  editingItemId: string | null = null;

  /** 編集前のテキストをバックアップ（キャンセル用） */
  originalEditText: string = '';

  /** AI生成中フラグ */
  isGeneratingAi: boolean = false;

  /** 説明欄の展開状態 */
  isDescriptionOpen: boolean = false;

  // ========================================
  // Constructor / Dependency Injection
  // ========================================
  constructor(private aiService: AiService) {}

  // ========================================
  // Getter
  // ========================================

  /**
   * 編集モード判定（新規作成 vs 既存タスク編集）
   */
  get isEditMode(): boolean {
    return !!(this.taskToEdit && this.taskToEdit.id);
  }

  // ========================================
  // ライフサイクル
  // ========================================

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['taskToEdit'] && this.taskToEdit) {
      this.taskData = { ...this.taskToEdit };
      this.tagsInput = this.taskToEdit.tags ? this.taskToEdit.tags.join(', ') : '';
    } else if (!this.taskToEdit) {
      this.resetForm(this.projectId);
    }
  }

  // ========================================
  // Public メソッド
  // ========================================

  /**
   * チェックリスト項目を追加
   */
  addChecklistItem(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    if (!this.checklistInput.trim()) return;
    
    if (!this.taskData.checklist) {
      this.taskData.checklist = [];
    }

    const newItem: ChecklistItem = {
      id: 'item-' + Date.now(),
      text: this.checklistInput.trim(),
      completed: false,
      addedAfterStart: false,
    };

    this.taskData.checklist.push(newItem);
    this.checklistInput = '';
    this.recalculateChecklistProgress();
  }

  /**
   * チェックリスト項目を削除
   */
  deleteChecklistItem(itemId: string): void {
    if (this.taskData.checklist) {
      this.taskData.checklist = this.taskData.checklist.filter(item => item.id !== itemId);
      this.recalculateChecklistProgress();
    }
  }

  /**
   * チェックリスト項目の完了状態を切り替え
   * イベント伝播を防止してカード選択を回避
   */
  toggleChecklistItem(item: ChecklistItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    item.completed = !item.completed;
    this.recalculateChecklistProgress();
  }

  /**
   * チェックリスト項目のインライン編集を開始
   */
  startEditingChecklistItem(item: ChecklistItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.originalEditText = item.text;
    this.editingItemId = item.id;
  }

  /**
   * チェックリスト項目の編集を確定・保存
   */
  saveEditingChecklistItem(item: ChecklistItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    item.text = item.text ? item.text.trim() : '';

    if (!item.text) {
      this.deleteChecklistItem(item.id);
    } else {
      this.recalculateChecklistProgress();
    }

    this.editingItemId = null;
    this.originalEditText = '';
  }

  /**
   * チェックリスト項目の編集をキャンセル
   */
  cancelEditingChecklistItem(item: ChecklistItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.originalEditText !== undefined) {
      item.text = this.originalEditText;
    }
    this.editingItemId = null;
    this.originalEditText = '';
  }

  /**
   * 完了したチェックリスト項目数を取得（テンプレート用）
   */
  getCompletedChecklistCount(): number {
    if (!this.taskData.checklist || this.taskData.checklist.length === 0) {
      return 0;
    }
    return this.taskData.checklist.filter(item => item.completed).length;
  }

  /**
   * チェックリスト項目総数を取得（テンプレート用）
   */
  getTotalChecklistCount(): number {
    return this.taskData.checklist ? this.taskData.checklist.length : 0;
  }

  /**
   * AIでサブタスク候補を生成
   * タイトルが入力されていることが前提
   */
  async generateSubtasksWithAi(): Promise<void> {
    if (!this.taskData.title || !this.taskData.title.trim()) {
      alert('タスク名を入力してからAI分解を実行してください。');
      return;
    }

    this.isGeneratingAi = true;

    try {
      const subtasks = await this.aiService.generateSubtasks(
        this.taskData.title,
        this.taskData.description
      );

      if (!this.taskData.checklist) {
        this.taskData.checklist = [];
      }

      for (const subtaskText of subtasks) {
        const newItem: ChecklistItem = {
          id: 'item-' + Date.now() + Math.random(),
          text: subtaskText,
          completed: false,
          addedAfterStart: false,
        };
        this.taskData.checklist.push(newItem);
      }

      this.recalculateChecklistProgress();
      alert(`✓ ${subtasks.length}個のサブタスクを追加しました！`);
    } catch (error) {
      console.error('AI サブタスク生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`エラーが発生しました:\n${errorMessage}`);
    } finally {
      this.isGeneratingAi = false;
    }
  }

  /**
   * フォーム送信（新規作成 or 更新）
   */
  onSubmit(): void {
    if (!this.taskData.title?.trim() || !this.taskData.parentId) {
      alert('タスク名と親課題を選択してください');
      return;
    }

    const parsedTags = this.parseTags(this.tagsInput);
    this.recalculateChecklistProgress();

    if (this.taskToEdit && this.taskToEdit.id) {
      // 既存タスク更新
      const updatedTask: Task = {
        ...this.taskToEdit,
        ...(this.taskData as Task),
        tags: parsedTags,
        checklist: this.taskData.checklist || [],
        progress: this.taskData.progress || 0,
        updatedAt: new Date().toISOString()
      };
      this.taskUpdated.emit(updatedTask);
    } else {
      // 新規タスク作成
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
        checklist: this.taskData.checklist || [],
        progress: this.taskData.progress || 0,
        createdAt: new Date().toISOString()
      };
      this.taskCreated.emit(newTask);
    }
    this.onClose();
  }

  /**
   * タスク削除
   */
  onDelete(): void {
    if (this.taskToEdit && confirm(`タスク「${this.taskToEdit.title}」を削除しますか？`)) {
      this.taskDeleted.emit(this.taskToEdit.id);
      this.onClose();
    }
  }

  /**
   * フォームを閉じる
   */
  onClose(): void {
    this.closePanel.emit();
  }

  // ========================================
  // Private ヘルパーメソッド
  // ========================================

  /**
   * フォームの初期化：編集モード or 新規作成モード
   */
  private populateForm(): void {
    const defaultParentId = this.projectId || (this.projects && this.projects.length > 0 ? this.projects[0].id : '');

    if (this.taskToEdit) {
      this.taskData = { ...this.taskToEdit };
      if (!this.taskData.parentId) {
        this.taskData.parentId = defaultParentId;
      }
      this.tagsInput = Array.isArray(this.taskToEdit.tags) ? this.taskToEdit.tags.join(', ') : '';
    } else {
      this.resetForm(defaultParentId);
    }

    this.isDescriptionOpen = !!(this.taskData.description && this.taskData.description.trim());
  }

  /**
   * フォームをリセット（新規作成時の初期状態に戻す）
   */
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
      checklist: [],
    };
    this.tagsInput = '';
    this.checklistInput = '';
    this.isDescriptionOpen = false;
  }

  /**
   * タグ入力文字列をパース（カンマ区切り）
   */
  private parseTags(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(tag => tag.length > 0);
  }

  /**
   * チェックリスト進捗率の再計算
   * チェックリストの完成度に基づいてタスク進捗率とステータスを自動連動
   */
  private recalculateChecklistProgress(): void {
    if (!this.taskData.checklist || this.taskData.checklist.length === 0) {
      // チェックリストなし: ステータスに基づいて進捗率を設定
      this.taskData.progress = this.taskData.status === 'done' ? 100 : 
                               (this.taskData.status === 'in-progress' ? 50 : 0);
      return;
    }

    // チェックリスト1件以上: 完成度で自動計算
    const completedCount = this.taskData.checklist.filter(item => item.completed).length;
    const totalCount = this.taskData.checklist.length;
    this.taskData.progress = Math.round((completedCount / totalCount) * 100);

    // ステータスを自動連動
    if (this.taskData.progress === 100) {
      this.taskData.status = 'done';
    } else if (completedCount > 0) {
      this.taskData.status = 'in-progress';
    } else {
      this.taskData.status = 'todo';
    }
  }
}
