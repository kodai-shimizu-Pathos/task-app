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
  // 全タスクの配列を受け取る
  @Input() tasks: Task[] = [];

  @Output() selectTask = new EventEmitter<Task>();
  @Output() addTask = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();

  // タグ一覧のプロパティ
  availableTags: string[] = [];

  // --- フィルター・ソート状態プロパティ ---
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTag: string = 'ALL';
  sortBy: 'createdAt' | 'deadline' | 'priority' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'asc';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks']) {
      this.updateAvailableTags();
    }
  }

  // --- タグ一覧の抽出処理 ---
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

  // タグ選択変更時のデバッグログ用メソッド
  onFilterChange(): void {
    console.log('=== [フィルター条件変更] ===');
    console.log('選択中のタグ (selectedTag):', this.selectedTag);
    console.log('受け取っている全タスク件数:', this.tasks ? this.tasks.length : 0);
    console.log('抽出されたタグ一覧:', this.availableTags);
    console.log('フィルター後のタスク件数:', this.filteredAndSortedTasks.length);
  }

  private cleanTag(tag: string): string {
    if (!tag) return '';
    return tag.trim().replace(/^#/, '').toLowerCase();
  }

  // --- フィルタリング＆ソート適用後の全タスクリスト ---
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
      console.log('検索ターゲット:', JSON.stringify(target)); // 文字列を厳密に出力

      result = result.filter(t => {
        // タスクが優先度など他の条件を通過してここまで届いているか確認
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
    result.sort((a,b) => {
      let comparison = 0;

      if (this.sortBy === 'deadline') {
        // 締切日順
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        comparison = dateA - dateB;
      } else if (this.sortBy === 'priority') {
        // 優先度順
        const weight: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 , high: 3, medium: 2, low: 1 };
        const weightA = weight[a.priority] || 0;
        const weightB = weight[b.priority] || 0;
        comparison = weightB - weightA; // 高優先度順を標準とする
      } else {
        // 作成日時順
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = timeB - timeA;
      }

      return this.sortOrder ==='asc' ? comparison : -comparison;
    });

    return result;
  }

  // ステータス文字列を安全に正規化するヘルパー
  private normalizeStatus(status: string): string {
    if (!status) return '';
    return status.trim().toLowerCase().replace('_', '-');
  }

  get todoTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'todo'
    );
  }

  get inProgressTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'in-progress' || 
      this.normalizeStatus(task.status) === 'inprogress'
    );
  }

  get doneTasks(): Task[] {
    return this.filteredAndSortedTasks.filter(task => 
      this.normalizeStatus(task.status) === 'done'
    );
  }

  // --- ボタン操作などで呼び出される処理 ---
  // 昇順と降順をボタンで切り替える
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  // フィルター条件を初期状態にリセット
  resetFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTag = 'ALL';
    this.sortBy = 'createdAt';
    this.sortOrder = 'asc';
  }
  
  onTaskDropped(event: CdkDragDrop<Task[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      // 同一カラム内での順番入れ替え
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 1. ドラッグデータを取得
      let taskId: string | null = null;
      const itemData = event.item.data;

      // 分岐A：cdkDragDataからオブジェクトが取得できた場合
      if (typeof itemData === 'object' && itemData != null && itemData['id']) {
        taskId = itemData.id;
      }
      // 分岐B：cdkDragDataからID文字列が取得できた場合
      else if (typeof itemData === 'string') {
        taskId = itemData;
      }
      // 分岐C：previousContainerから復元を試みる
      else {
        const previousData = event.previousContainer.data;
        if (Array.isArray(previousData) && event.previousIndex >= 0 && previousData[event.previousIndex]) {
          const prevTask = previousData[event.previousIndex];
          if (prevTask && typeof prevTask === 'object' && prevTask.id) {
            taskId = prevTask.id;
          }
        }
      }

      // IDが取得できなかった場合はエラー
      if (!taskId) {
        console.error('更新対象のタスクIDが見つかりません:', itemData);
        return;
      }

      // 2. this.tasks配列からタスクオブジェクトを取得・復元
      const taskIndex = this.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        console.error('タスクが配列に見つかりません:', taskId);
        return;
      }

      const task = this.tasks[taskIndex];

      // 3. タスクのプロパティを更新
      const newProgress = targetStatus === 'done' ? 100 : (targetStatus === 'in-progress' ? 50 : 0);
      task.status = targetStatus;
      task.progress = newProgress;
      task.updatedAt = new Date().toISOString();

      // 4. 配列も更新
      this.tasks[taskIndex] = { ...task };

      // 5. 親コンポーネントに更新されたタスクを通知
      this.taskUpdated.emit({ ...task });
    } 
  }

  onAddTask(): void {
    this.addTask.emit();
  }
}
