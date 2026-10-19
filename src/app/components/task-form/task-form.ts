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
    checklist: [], // チェックリスト初期化
  };

  tagsInput: string = '';
  checklistInput: string = ''; // 新しいチェックリスト項目の入力値
  editingItemId: string | null = null; // インライン編集中の項目ID
  originalEditText: string = ''; // 編集前のテキストをバックアップ
  isGeneratingAi: boolean = false; // AI生成中フラグ

  isDescriptionOpen: boolean = false;

  constructor(private aiService: AiService) {}

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
    // 親課題IDのデフォルト値を設定
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

    this.isDescriptionOpen = !!(this.taskData.description && this.taskData.description.trim());
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
      checklist: [], // チェックリスト初期化
    };
    this.tagsInput = '';
    this.checklistInput = '';

    this.isDescriptionOpen = false;
  }

  private parseTags(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(tag => tag.length > 0);
  }

  // チェックリスト管理メソッド
  addChecklistItem(event?: Event): void {
    // Enterキー押下時はデフォルト動作を防止
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
    this.recalculateChecklistProgress(); // 追加後に進捗率を更新
  }

  deleteChecklistItem(itemId: string): void {
    if (this.taskData.checklist) {
      this.taskData.checklist = this.taskData.checklist.filter(item => item.id !== itemId);
      this.recalculateChecklistProgress(); // 削除後に進捗率を更新
    }
  }

  toggleChecklistItem(item: ChecklistItem, event?: Event): void {
    // イベントバブリング（二重発火）を防止
    if (event) {
      event.stopPropagation();
    }

    // チェック状態を反転
    item.completed = !item.completed;

    // 進捗率を再計算（ステータス自動連動を含む）
    this.recalculateChecklistProgress();
  }

  // チェックリスト項目のインライン編集を開始
  startEditingChecklistItem(item: ChecklistItem, event?: MouseEvent): void {
    // イベント伝播を完全に遮断
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    // 編集前のテキストをバックアップ
    this.originalEditText = item.text;
    this.editingItemId = item.id;
  }

  // チェックリスト項目の編集を確定・保存
  saveEditingChecklistItem(item: ChecklistItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // 入力されたテキストをトリムして上書き
    item.text = item.text ? item.text.trim() : '';

    if (!item.text) {
      this.deleteChecklistItem(item.id);
    } else {
      this.recalculateChecklistProgress();
    }

    // 編集モードを終了
    this.editingItemId = null;
    this.originalEditText = '';
  }

  // チェックリスト進捗率の再計算（完全同期版）
  private recalculateChecklistProgress(): void {
    if (!this.taskData.checklist || this.taskData.checklist.length === 0) {
      // チェックリストが0件の場合：既存のステータス連動
      this.taskData.progress = this.taskData.status === 'done' ? 100 : 
                               (this.taskData.status === 'in-progress' ? 50 : 0);
      return;
    }

    // チェックリスト1件以上の場合：達成数で自動計算
    const completedCount = this.taskData.checklist.filter(item => item.completed).length;
    const totalCount = this.taskData.checklist.length;
    this.taskData.progress = Math.round((completedCount / totalCount) * 100);

    // ステータスを自動連動
    if (this.taskData.progress === 100) {
      // すべて完了した場合 → done
      this.taskData.status = 'done';
    } else if (completedCount > 0) {
      // 未完了項目がある場合 → in-progress
      this.taskData.status = 'in-progress';
    } else {
      // 全て未完了の場合 → todo
      this.taskData.status = 'todo';
    }
  }

  // 進捗率の自動計算（旧メソッド互換性のため残す）
  private updateProgress(): void {
    this.recalculateChecklistProgress();
  }

  // テンプレート用：完了したチェックリスト項目数を取得
  getCompletedChecklistCount(): number {
    if (!this.taskData.checklist || this.taskData.checklist.length === 0) {
      return 0;
    }
    return this.taskData.checklist.filter(item => item.completed).length;
  }

  // テンプレート用：チェックリスト項目総数を取得
  getTotalChecklistCount(): number {
    return this.taskData.checklist ? this.taskData.checklist.length : 0;
  }

  /**
   * AI でサブタスク候補を生成
   */
  async generateSubtasksWithAi(): Promise<void> {
    // 検証：タイトルが入力されているか確認
    if (!this.taskData.title || !this.taskData.title.trim()) {
      alert('タスク名を入力してからAI分解を実行してください。');
      return;
    }

    this.isGeneratingAi = true;

    try {
      // AI Service を呼び出し
      const subtasks = await this.aiService.generateSubtasks(
        this.taskData.title,
        this.taskData.description
      );

      // 生成されたサブタスクをチェックリストに追加
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

      // 進捗率を再計算
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

  onSubmit(): void {
    if (!this.taskData.title?.trim() || !this.taskData.parentId) {
      alert('タスク名と親課題を選択してください');
      return;
    }

    const parsedTags = this.parseTags(this.tagsInput);

    // 進捗率の最終計算
    this.recalculateChecklistProgress();

    // 既存タスク更新処理
    if (this.taskToEdit && this.taskToEdit.id) {
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
        checklist: this.taskData.checklist || [],
        progress: this.taskData.progress || 0,
        createdAt: new Date().toISOString()
      };
      this.taskCreated.emit(newTask);
    }
    this.onClose();
  }

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