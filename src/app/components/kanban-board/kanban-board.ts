import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { KanbanColumn } from '../kanban-column/kanban-column';
import { Task, Status } from '../../models/task.model';

/**
 * カンバンボードコンポーネント
 * タスクを「未着手」「進行中」「完了」の 3 ステータスに分類表示
 * ドラッグ&ドロップ、検索、フィルター、ソート機能を提供
 */
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

  // === フィルター・ソート状態 ===
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTags: string[] = [];
  sortBy: 'createdAt' | 'deadline' | 'scheduledEndDate' | 'priority' = 'deadline';
  sortOrder: 'asc' | 'desc' = 'asc';

  availableTags: string[] = [];

  /**
   * 入力プロパティ変更時の処理
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.updateAvailableTags();
    }
  }

  /**
   * フィルター・ソートが有効かを判定
   */
  get isFilterActive(): boolean {
    return (
      this.searchKeyword.trim() !== '' ||
      this.priorityFilter !== 'ALL' ||
      this.selectedTags.length > 0 ||
      this.sortBy !== 'deadline' ||
      this.sortOrder !== 'asc'
    );
  }

  /**
   * タグの選択/解除を切り替え
   */
  onTagSelected(tag: string): void {
    const cleaned = this.cleanTag(tag);
    const index = this.selectedTags.findIndex(t => this.cleanTag(t) === cleaned);

    if (index >= 0) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(cleaned);
    }
  }

  /**
   * 指定タグをフィルターから削除
   */
  removeTagFilter(tag: string): void {
    const target = this.cleanTag(tag);
    this.selectedTags = this.selectedTags.filter(t => this.cleanTag(t) !== target);
  }

  /**
   * すべてのフィルター・ソート設定をリセット
   */
  resetAllFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTags = [];
    this.sortBy = 'deadline';
    this.sortOrder = 'asc';
  }

  /**
   * ソート順序を切り替え
   */
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  /**
   * タスク追加イベントを発行
   */
  onAddTask(status?: Status): void {
    this.addTask.emit();
  }

  /**
   * タスク移動時の処理（ドラッグ&ドロップ）
   */
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
   * 多段階ソート比較メソッド
   * @param a 比較対象タスク A
   * @param b 比較対象タスク B
   * @returns 比較結果（-1, 0, 1）
   * @private
   */
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
      return getWeight(b.priority) - getWeight(a.priority);
    }

    // 2. 最終期限順
    if (this.sortBy === 'deadline') {
      const dateA = parseDate(a.deadline || a.scheduledEndDate);
      const dateB = parseDate(b.deadline || b.scheduledEndDate);
      let diff = dateA - dateB;
      if (this.sortOrder === 'desc') diff = -diff;

      if (diff !== 0) return diff;
      return getWeight(b.priority) - getWeight(a.priority);
    }

    // 3. 優先度順
    if (this.sortBy === 'priority') {
      let diff = getWeight(b.priority) - getWeight(a.priority);
      if (this.sortOrder === 'desc') diff = -diff;

      if (diff !== 0) return diff;
      return parseDate(a.deadline || a.scheduledEndDate) - parseDate(b.deadline || b.scheduledEndDate);
    }

    // 4. 作成日順
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return this.sortOrder === 'asc' ? tA - tB : tB - tA;
  }

  /**
   * フィルター・ソートが適用された最終的なタスク一覧
   */
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

  /**
   * 「未着手」ステータスのタスク一覧
   */
  get todoTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'todo');
  }

  /**
   * 「進行中」ステータスのタスク一覧
   */
  get inProgressTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'in-progress' || (t.status as string) === 'inprogress');
  }

  /**
   * 「完了」ステータスのタスク一覧
   */
  get doneTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(t => t.status === 'done');
  }

  /**
   * 利用可能なタグを更新
   * @private
   */
  private updateAvailableTags(): void {
    if (!this.tasks) return;
    const set = new Set<string>();
    this.tasks.forEach(t => t.tags?.forEach(tag => set.add(this.cleanTag(tag))));
    this.availableTags = Array.from(set);
  }

  /**
   * タグ文字列をクリーニング（ハッシュ記号削除、小文字化）
   * @param tag タグ文字列
   * @returns クリーニング済みタグ
   * @private
   */
  private cleanTag(tag: string): string {
    return (tag || '').trim().replace(/^#/, '').toLowerCase();
  }
}
