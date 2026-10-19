import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { KanbanColumn } from '../kanban-column/kanban-column';
import { Task, Status, PriorityLevel } from '../../models/task.model';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumn, DragDropModule, FormsModule],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.css',
})
export class KanbanBoard implements OnChanges {
  // ========================================
  // @Input / @Output
  // ========================================
  @Input() tasks: Task[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() addTask = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();

  // ========================================
  // フィルター・ソート状態
  // ========================================
  /** キーワード検索 */
  searchKeyword: string = '';

  /** 優先度フィルター */
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';

  /** タグフィルター */
  selectedTag: string = 'ALL';

  /** ソートキー */
  sortBy: 'createdAt' | 'deadline' | 'priority' = 'createdAt';

  /** ソート順序 */
  sortOrder: 'asc' | 'desc' = 'asc';

  /** 利用可能なタグ一覧 */
  availableTags: string[] = [];

  // ========================================
  // ライフサイクル
  // ========================================

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.updateAvailableTags();
    }
  }

  // ========================================
  // Public メソッド
  // ========================================

  /**
   * フィルター条件が変更されたときのハンドラ
   */
  onFilterChange(): void {
    console.log('=== [フィルター条件変更] ===');
    console.log('選択中のタグ (selectedTag):', this.selectedTag);
    console.log('受け取っている全タスク件数:', this.tasks ? this.tasks.length : 0);
    console.log('抽出されたタグ一覧:', this.availableTags);
    console.log('フィルター後のタスク件数:', this.filteredAndSortedTasks.length);
  }

  /**
   * タグ選択変更ハンドラ
   */
  onTagSelected(tag: string): void {
    this.selectedTag = tag;
  }

  /**
   * ソート順序の切り替え
   */
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  /**
   * フィルター条件を初期状態にリセット
   */
  resetFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTag = 'ALL';
    this.sortBy = 'createdAt';
    this.sortOrder = 'asc';
  }

  /**
   * タスク追加ボタンのハンドラ
   */
  onAddTask(): void {
    this.addTask.emit();
  }

  /**
   * タスクがドラッグで移動された時のハンドラ
   * 同一カラム内の順番変更 or 別カラムへの移動に対応
   */
  onTaskDropped(event: CdkDragDrop<Task[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      // 同一カラム内での順番入れ替え
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 別カラムへの移動
      let taskId: string | null = null;
      const itemData = event.item.data;

      // ドラッグデータからタスクIDを抽出
      if (typeof itemData === 'object' && itemData != null && itemData['id']) {
        taskId = itemData.id;
      } else if (typeof itemData === 'string') {
        taskId = itemData;
      } else {
        // previousContainerから復元を試みる
        const previousData = event.previousContainer.data;
        if (Array.isArray(previousData) && event.previousIndex >= 0 && previousData[event.previousIndex]) {
          const prevTask = previousData[event.previousIndex];
          if (prevTask && typeof prevTask === 'object' && prevTask.id) {
            taskId = prevTask.id;
          }
        }
      }

      if (!taskId) {
        console.error('更新対象のタスクIDが見つかりません:', itemData);
        return;
      }

      const taskIndex = this.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        console.error('タスクが配列に見つかりません:', taskId);
        return;
      }

      const task = this.tasks[taskIndex];

      // タスク情報を新しいステータスに合わせて更新
      const newProgress = targetStatus === 'done' ? 100 : (targetStatus === 'in-progress' ? 50 : 0);
      task.status = targetStatus;
      task.progress = newProgress;
      task.updatedAt = new Date().toISOString();

      this.tasks[taskIndex] = { ...task };
      this.taskUpdated.emit({ ...task });
    }
  }

  // ========================================
  // Getters
  // ========================================

  /**
   * フィルター＆ソート適用後の全タスクリスト
   */
  get filteredAndSortedTasks(): Task[] {
    let result = [...this.tasks];

    // 1. キーワード検索
    if (this.searchKeyword.trim()) {
      const kw = this.searchKeyword.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(kw) ||
        (t.description && t.description.toLowerCase().includes(kw))
      );
    }

    // 2. 優先度フィルター
    if (this.priorityFilter !== 'ALL') {
      result = result.filter(t => t.priority.toUpperCase() === this.priorityFilter);
    }

    // 3. タグフィルター
    if (this.selectedTag !== 'ALL') {
      const target = this.cleanTag(this.selectedTag);

      console.log('--- タグ判定デバッグ ---');
      console.log('検索ターゲット:', JSON.stringify(target));

      result = result.filter(t => {
        console.log(`チェック中タスク: "${t.title}", 優先度: "${t.priority}"`);

        if (!t.tags || !Array.isArray(t.tags)) return false;

        const isMatch = t.tags.some(tag => {
          const cleaned = this.cleanTag(tag);
          console.log(`  比較: タスク側のタグ ${JSON.stringify(cleaned)} vs ターゲット ${JSON.stringify(target)} -> 一致: ${cleaned === target}`);
          return cleaned === target;
        });

        return isMatch;
      });
    }

    // 4. ソート処理
    result.sort((a, b) => {
      let comparison = 0;

      if (this.sortBy === 'deadline') {
        // 締切日順
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (this.sortBy === 'priority') {
        // 優先度順（高 → 中 → 低）
        const weight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 , high: 3, medium: 2, low: 1 };
        const weightA = weight[a.priority] || 0;
        const weightB = weight[b.priority] || 0;
        comparison = weightB - weightA;
      } else {
        // 作成日時順
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeB - timeA;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }

  /**
   * Todo ステータスのタスク一覧
   */
  get todoTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'todo'
    );
  }

  /**
   * In Progress ステータスのタスク一覧
   */
  get inProgressTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'in-progress' || 
      this.normalizeStatus(task.status) === 'inprogress'
    );
  }

  /**
   * Done ステータスのタスク一覧
   */
  get doneTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'done'
    );
  }

  // ========================================
  // Private ヘルパーメソッド
  // ========================================

  /**
   * 利用可能なタグ一覧を更新
   */
  private updateAvailableTags(): void {
    if (!this.tasks || this.tasks.length === 0) {
      this.availableTags = [];
      return;
    }

    const tagSet = new Set<string>();
    this.tasks.forEach(task => {
      if (Array.isArray(task.tags)) {
        task.tags.forEach(tag => {
          const cleaned = tag.trim().replace(/^#/, '');
          if (cleaned) tagSet.add(cleaned);
        });
      }
    });
    this.availableTags = Array.from(tagSet);
  }

  /**
   * タグ文字列を正規化（小文字・トリム・#削除）
   */
  private cleanTag(tag: string): string {
    if (!tag) return '';
    return tag.trim().replace(/^#/, '').toLowerCase();
  }

  /**
   * ステータス文字列を正規化（小文字・ハイフン統一）
   */
  private normalizeStatus(status: string): string {
    if (!status) return '';
    return status.trim().toLowerCase().replace('_', '-');
  }
}
