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

  // フィルター・ソート状態
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTags: string[] = []; // ★ 複数タグ選択対応（配列管理）
  sortBy: 'createdAt' | 'deadline' | 'priority' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'asc';

  availableTags: string[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.updateAvailableTags();
    }
  }

  // フィルター条件がアクティブか判定
  get isFilterActive(): boolean {
    return (
      this.searchKeyword.trim() !== '' ||
      this.priorityFilter !== 'ALL' ||
      this.selectedTags.length > 0 ||
      this.sortBy !== 'createdAt' ||
      this.sortOrder !== 'asc'
    );
  }

  /**
   * ★ タグ選択ハンドラ（トグル処理：未選択なら追加、選択済みなら解除）
   */
  onTagSelected(tag: string): void {
    const cleaned = this.cleanTag(tag);
    const index = this.selectedTags.findIndex(t => this.cleanTag(t) === cleaned);

    if (index >= 0) {
      this.selectedTags.splice(index, 1); // 選択解除
    } else {
      this.selectedTags.push(cleaned);   // 複数選択追加
    }
  }

  /**
   * 個別タグの解除
   */
  removeTagFilter(tag: string): void {
    const target = this.cleanTag(tag);
    this.selectedTags = this.selectedTags.filter(t => this.cleanTag(t) !== target);
  }

  /**
   * フィルター条件を全リセット
   */
  resetAllFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTags = [];
    this.sortBy = 'createdAt';
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

  /**
   * ★ フィルター＆ソート適用後のタスク一覧（複数タグのAND条件抽出）
   */
  get filteredAndSortedTasks(): Task[] {
    let result = [...this.tasks];

    // 1. 検索キーワード
    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      result = result.filter(
        t => t.title.toLowerCase().includes(kw) || (t.description && t.description.toLowerCase().includes(kw))
      );
    }

    // 2. 優先度
    if (this.priorityFilter !== 'ALL') {
      result = result.filter(t => (t.priority || '').toUpperCase() === this.priorityFilter);
    }

    // 3. 複数タグのAND判定（選択されたタグすべてを保持するタスクを抽出）
    if (this.selectedTags.length > 0) {
      result = result.filter(t => {
        if (!t.tags || t.tags.length === 0) return false;
        const taskTags = t.tags.map(tag => this.cleanTag(tag));
        return this.selectedTags.every(selected => taskTags.includes(this.cleanTag(selected)));
      });
    }

    // 4. ソート
    result.sort((a, b) => {
      let comparison = 0;
      if (this.sortBy === 'deadline') {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (this.sortBy === 'priority') {
        const weight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, high: 3, medium: 2, low: 1 };
        comparison = (weight[b.priority] || 0) - (weight[a.priority] || 0);
      } else {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeB - timeA;
      }
      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

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