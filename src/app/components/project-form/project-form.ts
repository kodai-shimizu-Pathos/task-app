import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentProject } from '../../models/project.model';
import { Status, PriorityLevel } from '../../models/task.model';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-form.html',
  styleUrl: './project-form.css',
})
export class ProjectForm implements OnInit, OnChanges {
  // ========================================
  // @Input / @Output
  // ========================================
  @Input() projectToEdit?: ParentProject | null = null;

  @Output() projectCreated = new EventEmitter<ParentProject>();
  @Output() projectUpdated = new EventEmitter<ParentProject>();
  @Output() projectDeleted = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  // ========================================
  // フォーム状態
  // ========================================
  title = '';
  description = '';
  status = 'todo';
  priority = 'medium';
  scheduledStartDate = '';
  scheduledEndDate = '';
  deadline = '';
  
  /** ドキュメントリンク一覧 */
  docLinks: { title: string; url: string }[] = [];

  /** 新規ドキュメント追加時の入力フィールド */
  docTitle = '';
  docUrl = '';

  // ========================================
  // ライフサイクル
  // ========================================

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectToEdit']) {
      this.populateForm();
    }
  }

  // ========================================
  // Public メソッド
  // ========================================

  /**
   * ドキュメントリンクを追加
   */
  addDoc(): void {
    if (this.docTitle.trim() && this.docUrl.trim()) {
      this.docLinks.push({
        title: this.docTitle.trim(),
        url: this.docUrl.trim()
      });
      this.docTitle = '';
      this.docUrl = '';
    }
  }

  /**
   * ドキュメントリンクを削除
   */
  removeDoc(index: number): void {
    this.docLinks.splice(index, 1);
  }

  /**
   * フォーム送信（新規作成 or 更新）
   */
  onSubmit(): void {
    if (!this.title.trim()) {
      alert('親課題名を入力してください');
      return;
    }

    if (this.projectToEdit) {
      // 既存親課題更新
      const updatedProject: ParentProject = {
        ...this.projectToEdit,
        title: this.title,
        description: this.description || undefined,
        status: this.status as Status,
        priority: this.priority as PriorityLevel,
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        docLinks: this.docLinks,
        updatedAt: new Date().toISOString()
      };
      this.projectUpdated.emit(updatedProject);
    } else {
      // 新規親課題作成
      const newProject: ParentProject = {
        id: `proj-${Date.now()}`,
        title: this.title,
        description: this.description || undefined,
        status: 'todo',
        priority: 'medium',
        tags: [],
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        progressPercentage: 0,
        completedTaskCount: 0,
        totalTaskCount: 0,
        docLinks: this.docLinks,
        createdAt: new Date().toISOString()
      };
      this.projectCreated.emit(newProject);
    }
    this.onClose();
  }

  /**
   * 親課題削除
   */
  onDelete(): void {
    if (this.projectToEdit && confirm(`親課題「${this.projectToEdit.title}」とそれに紐づく子タスクを削除してもよろしいですか？`)) {
      this.projectDeleted.emit(this.projectToEdit.id);
      this.onClose();
    }
  }

  /**
   * フォームを閉じる
   */
  onClose(): void {
    this.closeModal.emit();
  }

  // ========================================
  // Private ヘルパーメソッド
  // ========================================

  /**
   * フォームの初期化：編集モード or 新規作成モード
   */
  private populateForm(): void {
    if (this.projectToEdit) {
      this.title = this.projectToEdit.title;
      this.description = this.projectToEdit.description || '';
      this.status = this.projectToEdit.status || 'todo';
      this.priority = this.projectToEdit.priority || 'medium';
      this.scheduledStartDate = this.projectToEdit.scheduledStartDate || '';
      this.scheduledEndDate = this.projectToEdit.scheduledEndDate || '';
      this.deadline = this.projectToEdit.deadline || '';
      this.docLinks = this.projectToEdit.docLinks ? [...this.projectToEdit.docLinks] : [];
    } else {
      this.resetForm();
    }
  }

  /**
   * フォームをリセット（新規作成時の初期状態に戻す）
   */
  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.scheduledStartDate = '';
    this.scheduledEndDate = '';
    this.deadline = '';
    this.docLinks = [];
    this.docTitle = '';
    this.docUrl = '';
  }
}
