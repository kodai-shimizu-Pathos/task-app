import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ProjectCard } from '../project-card/project-card';
import { ParentProject } from '../../models/project.model';
import { Status } from '../../models/task.model';

@Component({
  selector: 'app-master-kanban-board',
  standalone: true,
  imports: [CommonModule, ProjectCard, DragDropModule, FormsModule],
  templateUrl: './master-kanban-board.html',
  styleUrl: './master-kanban-board.css',
})
export class MasterKanbanBoard implements OnChanges {
  @Input() projects: ParentProject[] = [];
  @Output() selectProject = new EventEmitter<ParentProject>();
  @Output() parentTaskUpdated = new EventEmitter<ParentProject>();

  // フィルター・ソート状態
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTags: string[] = []; // ★ 複数タグ選択（配列管理）
  sortBy: 'createdAt' | 'deadline' | 'priority' | 'progress' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  availableTags: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.updateAvailableTags();
    }
  }

  // フィルター条件が初期状態から変更されているか判定
  get isFilterActive(): boolean {
    return (
      this.searchKeyword.trim() !== '' ||
      this.priorityFilter !== 'ALL' ||
      this.selectedTags.length > 0 ||
      this.sortBy !== 'createdAt' ||
      this.sortOrder !== 'desc'
    );
  }

  // カード上のタグ押下時のトグル処理（AND検索）
  onTagSelected(tagInput: string | any): void {
    const rawTag = typeof tagInput === 'string' ? tagInput : (tagInput?.detail || '');
    if (!rawTag) return;

    const cleaned = this.cleanTag(rawTag);
    const index = this.selectedTags.findIndex(t => this.cleanTag(t) === cleaned);

    if (index >= 0) {
      this.selectedTags.splice(index, 1); // 選択解除
    } else {
      this.selectedTags.push(cleaned);   // 選択追加
    }
  }

  // 個別タグの解除
  removeTagFilter(tag: string): void {
    const target = this.cleanTag(tag);
    this.selectedTags = this.selectedTags.filter(t => this.cleanTag(t) !== target);
  }

  // フィルター全リセット
  resetFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTags = [];
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  get filteredAndSortedProjects(): ParentProject[] {
    if (!this.projects) return [];
    let result = [...this.projects];

    // 1. キーワード検索
    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      result = result.filter(p => 
        p.title.toLowerCase().includes(kw) || 
        (p.description && p.description.toLowerCase().includes(kw))
      );
    }

    // 2. 優先度フィルター
    if (this.priorityFilter !== 'ALL') {
      result = result.filter(p => p.priority && p.priority.toUpperCase() === this.priorityFilter);
    }

    // 3. 複数タグAND判定
    if (this.selectedTags.length > 0) {
      result = result.filter(p => {
        if (!p.tags || p.tags.length === 0) return false;
        const projectTags = p.tags.map(tag => this.cleanTag(tag));
        return this.selectedTags.every(selected => projectTags.includes(this.cleanTag(selected)));
      });
    }

    // 4. ソート処理
    result.sort((a, b) => {
      let comparison = 0;
      if (this.sortBy === 'deadline') {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (this.sortBy === 'priority') {
        const weight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, high: 3, medium: 2, low: 1 };
        comparison = (weight[b.priority] || 0) - (weight[a.priority] || 0);
      } else if (this.sortBy === 'progress') {
        comparison = (a.progressPercentage || 0) - (b.progressPercentage || 0);
      } else {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeA - timeB;
      }
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  get todoProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'todo');
  }

  get inProgressProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'in-progress' || this.normalizeStatus(p.status) === 'in_progress');
  }

  get doneProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'done');
  }

  private updateAvailableTags(): void {
    if (!this.projects) return;
    const set = new Set<string>();
    this.projects.forEach(p => p.tags?.forEach(tag => set.add(this.cleanTag(tag))));
    this.availableTags = Array.from(set);
  }

  private cleanTag(tag: string): string {
    return (tag || '').trim().replace(/^#/, '').toLowerCase();
  }

  private normalizeStatus(status: string): string {
    if (!status) return '';
    return status.trim().toLowerCase().replace('_', '-');
  }

  onSelectProject(project: ParentProject): void {
    this.selectProject.emit(project);
  }

  onProjectDropped(event: CdkDragDrop<ParentProject[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      let projectId: string | null = null;
      const itemData = event.item.data;

      if (typeof itemData === 'object' && itemData != null && itemData['id']) {
        projectId = itemData.id;
      } else if (typeof itemData === 'string') {
        projectId = itemData;
      } else {
        const previousData = event.previousContainer.data;
        if (Array.isArray(previousData) && event.previousIndex >= 0 && previousData[event.previousIndex]) {
          const prevProject = previousData[event.previousIndex];
          if (prevProject && typeof prevProject === 'object' && prevProject.id) {
            projectId = prevProject.id;
          }
        }
      }

      if (!projectId) return;

      const projectIndex = this.projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const project = this.projects[projectIndex];
      project.status = targetStatus;
      project.updatedAt = new Date().toISOString();

      this.projects[projectIndex] = { ...project };
      this.parentTaskUpdated.emit({ ...project });
    }
  }
}