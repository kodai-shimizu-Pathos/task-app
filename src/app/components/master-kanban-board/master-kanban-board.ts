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
  @Output() openNewProjectForm = new EventEmitter<void>(); // ★ 新規親課題作成イベント

  // フィルター・ソート状態（デフォルト：最終期限の昇順）
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTags: string[] = [];
  sortBy: 'createdAt' | 'deadline' | 'scheduledEndDate' | 'priority' | 'progress' = 'deadline';
  sortOrder: 'asc' | 'desc' = 'asc';

  availableTags: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.updateAvailableTags();
    }
  }

  onOpenNewProjectForm(): void {
    this.openNewProjectForm.emit();
  }

  get isFilterActive(): boolean {
    return (
      this.searchKeyword.trim() !== '' ||
      this.priorityFilter !== 'ALL' ||
      this.selectedTags.length > 0 ||
      this.sortBy !== 'deadline' ||
      this.sortOrder !== 'asc'
    );
  }

  onTagSelected(tagInput: string | any): void {
    const rawTag = typeof tagInput === 'string' ? tagInput : (tagInput?.detail || '');
    if (!rawTag) return;

    const cleaned = this.cleanTag(rawTag);
    const index = this.selectedTags.findIndex(t => this.cleanTag(t) === cleaned);

    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(cleaned);
    }
  }

  removeTagFilter(tag: string): void {
    const target = this.cleanTag(tag);
    this.selectedTags = this.selectedTags.filter(t => this.cleanTag(t) !== target);
  }

  resetFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTags = [];
    this.sortBy = 'deadline';
    this.sortOrder = 'asc';
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  private compareProjects(a: ParentProject, b: ParentProject): number {
    const getWeight = (p?: string) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[p?.toUpperCase() || ''] || 0);
    const parseDate = (d?: string) => (d ? new Date(d.replace(/-/g, '/')).getTime() : Infinity);

    if (this.sortBy === 'scheduledEndDate') {
      const dateA = parseDate(a.scheduledEndDate);
      const dateB = parseDate(b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority);
    }

    if (this.sortBy === 'deadline') {
      const dateA = parseDate(a.deadline || a.scheduledEndDate);
      const dateB = parseDate(b.deadline || b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority);
    }

    if (this.sortBy === 'priority') {
      let diff = getWeight(b.priority) - getWeight(a.priority);
      if (this.sortOrder === 'desc') diff = -diff;
      if (diff !== 0) return diff;
      return parseDate(a.deadline || a.scheduledEndDate) - parseDate(b.deadline || b.scheduledEndDate);
    }

    if (this.sortBy === 'progress') {
      const diff = (a.progressPercentage || 0) - (b.progressPercentage || 0);
      return this.sortOrder === 'asc' ? diff : -diff;
    }

    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return this.sortOrder === 'asc' ? tA - tB : tB - tA;
  }

  get filteredAndSortedProjects(): ParentProject[] {
    if (!this.projects) return [];
    let result = [...this.projects];

    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      result = result.filter(p => 
        p.title.toLowerCase().includes(kw) || 
        (p.description && p.description.toLowerCase().includes(kw))
      );
    }

    if (this.priorityFilter !== 'ALL') {
      result = result.filter(p => p.priority && p.priority.toUpperCase() === this.priorityFilter);
    }

    if (this.selectedTags.length > 0) {
      result = result.filter(p => {
        if (!p.tags || p.tags.length === 0) return false;
        const projectTags = p.tags.map(tag => this.cleanTag(tag));
        return this.selectedTags.every(selected => projectTags.includes(this.cleanTag(selected)));
      });
    }

    result.sort((a, b) => this.compareProjects(a, b));
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