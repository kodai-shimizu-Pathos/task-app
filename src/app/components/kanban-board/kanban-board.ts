import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { KanbanColumn } from '../kanban-column/kanban-column';
import { Task, Status } from '../../models/task.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumn, DragDropModule, FormsModule],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.css',
})
export class KanbanBoard implements OnChanges {
  @Input() tasks: Task[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() addTask = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<Task>();

  // フィルター・ソート状態（デフォルト：最終期限の昇順）
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTags: string[] = [];
  sortBy: 'createdAt' | 'deadline' | 'scheduledEndDate' | 'priority' = 'deadline';
  sortOrder: 'asc' | 'desc' = 'asc';

  availableTags: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.updateAvailableTags();
    }
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

  onTagSelected(tag: string): void {
    const cleaned = this.cleanTag(tag);
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

  resetAllFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTags = [];
    this.sortBy = 'deadline';
    this.sortOrder = 'asc';
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  onAddTask(status?: Status): void {
    this.addTask.emit();
  }

  onTaskDropped(event: CdkDragDrop<Task[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.item.data as Task;
      if (task) {
        task.status = targetStatus;
        task.updatedAt = new Date().toISOString();
        this.taskUpdated.emit({ ...task });
      }
    }
  }

  // 多段階ソート比較メソッド
  private compareTasks(a: Task, b: Task): number {
    const getWeight = (p?: string) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 }[p?.toUpperCase() || ''] || 0);
    const parseDate = (d?: string) => (d ? new Date(d.replace(/-/g, '/')).getTime() : Infinity);

    // 1. 完了予定日順
    if (this.sortBy === 'scheduledEndDate') {
      const dateA = parseDate(a.scheduledEndDate);
      const dateB = parseDate(b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;

      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority); // 同日の場合は優先度高順
    }

    // 2. 最終期限順
    if (this.sortBy === 'deadline') {
      const dateA = parseDate(a.deadline || a.scheduledEndDate);
      const dateB = parseDate(b.deadline || b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;

      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority); // 同日の場合は優先度高順
    }

    // 3. 優先度順
    if (this.sortBy === 'priority') {
      let diff = getWeight(b.priority) - getWeight(a.priority);
      if (this.sortOrder === 'desc') diff = -diff;

      if (diff !== 0) return diff;
      // 同優先度の場合は期限が近い順
      return parseDate(a.deadline || a.scheduledEndDate) - parseDate(b.deadline || b.scheduledEndDate);
    }

    // 4. 作成日順
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return this.sortOrder === 'asc' ? tA - tB : tB - tA;
  }

  get filteredAndSortedTasks(): Task[] {
    let result = [...this.tasks];

    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      result = result.filter(
        t => t.title.toLowerCase().includes(kw) || (t.description && t.description.toLowerCase().includes(kw))
      );
    }

    if (this.priorityFilter !== 'ALL') {
      result = result.filter(t => (t.priority || '').toUpperCase() === this.priorityFilter);
    }

    if (this.selectedTags.length > 0) {
      result = result.filter(t => {
        if (!t.tags || t.tags.length === 0) return false;
        const taskTags = t.tags.map(tag => this.cleanTag(tag));
        return this.selectedTags.every(selected => taskTags.includes(this.cleanTag(selected)));
      });
    }

    result.sort((a, b) => this.compareTasks(a, b));
    return result;
  }

  get todoTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'todo');
  }

  get inProgressTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'in-progress' || (t.status as string) === 'inprogress');
  }

  get doneTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'done');
  }

  private updateAvailableTags(): void {
    if (!this.tasks) return;
    const set = new Set<string>();
    this.tasks.forEach(t => t.tags?.forEach(tag => set.add(this.cleanTag(tag))));
    this.availableTags = Array.from(set);
  }

  private cleanTag(tag: string): string {
    return (tag || '').trim().replace(/^#/, '').toLowerCase();
  }
}