import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentProject } from '../../models/project.model';

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
  scheduledStartDate = '';
  scheduledEndDate = '';
  deadline = '';
  
  // 🔴 relatedDocs から docLinks に変更
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
      this.scheduledStartDate = this.projectToEdit.scheduledStartDate || '';
      this.scheduledEndDate = this.projectToEdit.scheduledEndDate || '';
      this.deadline = this.projectToEdit.deadline || '';
      // 🔴 docLinks の読み込み
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
    this.docLinks = [];
    this.docTitle = '';
    this.docUrl = '';
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

    if (this.projectToEdit) {
      const updatedProject: ParentProject = {
        ...this.projectToEdit,
        title: this.title,
        description: this.description || undefined,
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        docLinks: this.docLinks, // 🔴 docLinks にセット
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
        tags: [],
        scheduledStartDate: this.scheduledStartDate || undefined,
        scheduledEndDate: this.scheduledEndDate || undefined,
        deadline: this.deadline || undefined,
        progressPercentage: 0,
        completedTaskCount: 0,
        totalTaskCount: 0,
        docLinks: this.docLinks, // 🔴 docLinks にセット
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