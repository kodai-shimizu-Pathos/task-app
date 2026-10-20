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
  @Input() projectToEdit?: ParentProject | null = null;

  @Output() projectCreated = new EventEmitter<ParentProject>();
  @Output() projectUpdated = new EventEmitter<ParentProject>();
  @Output() projectDeleted = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  title = '';
  description = '';
  status = 'todo';
  priority = 'medium';
  scheduledStartDate = '';
  scheduledEndDate = '';
  deadline = '';
  tagsInput = ''; // ★ タグ入力用（カンマ区切り文字列）
  
  docTitle = '';
  docUrl = '';
  docLinks: { title: string; url: string }[] = [];

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectToEdit']) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (this.projectToEdit) {
      this.title = this.projectToEdit.title;
      this.description = this.projectToEdit.description || '';
      this.status = this.projectToEdit.status || 'todo';
      this.priority = this.projectToEdit.priority || 'medium';
      this.scheduledStartDate = this.projectToEdit.scheduledStartDate || '';
      this.scheduledEndDate = this.projectToEdit.scheduledEndDate || '';
      this.deadline = this.projectToEdit.deadline || '';
      // ★ タグの読み込み
      this.tagsInput = Array.isArray(this.projectToEdit.tags) ? this.projectToEdit.tags.join(', ') : '';
      this.docLinks = this.projectToEdit.docLinks ? [...this.projectToEdit.docLinks] : [];
    } else {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.title = '';
    this.description = '';
    this.scheduledStartDate = '';
    this.scheduledEndDate = '';
    this.deadline = '';
    this.tagsInput = ''; // ★ リセット
    this.docLinks = [];
    this.docTitle = '';
    this.docUrl = '';
  }

  // ★ カンマ区切りの文字列を配列に変換するヘルパー
  private parseTags(input: string): string[] {
    if (!input || !input.trim()) return [];
    return input.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(tag => tag.length > 0);
  }

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

  removeDoc(index: number): void {
    this.docLinks.splice(index, 1);
  }

  onSubmit(): void {
    if (!this.title.trim()) {
      alert('親課題名を入力してください');
      return;
    }

    const parsedTags = this.parseTags(this.tagsInput); // ★ 入力タグのパース

    if (this.projectToEdit) {
      const updatedProject: ParentProject = {
        ...this.projectToEdit,
        title: this.title,
        description: this.description || undefined,
        status: this.status as Status,
        priority: this.priority as PriorityLevel,
        tags: parsedTags, // ★ パースしたタグを反映
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        docLinks: this.docLinks,
        updatedAt: new Date().toISOString()
      };
      this.projectUpdated.emit(updatedProject);
    } else {
      const newProject: ParentProject = {
        id: `proj-${Date.now()}`,
        title: this.title,
        description: this.description || undefined,
        status: 'todo',
        priority: 'medium',
        tags: parsedTags, // ★ パースしたタグを反映
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

  onDelete(): void {
    if (this.projectToEdit && confirm(`親課題「${this.projectToEdit.title}」とそれに紐づく子タスクを削除してもよろしいですか？`)) {
      this.projectDeleted.emit(this.projectToEdit.id);
      this.onClose();
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }
}