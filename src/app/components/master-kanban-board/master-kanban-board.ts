import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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

  // タグ一覧プロパティ
  availableTags: string[] = [];

  // フィルター・ソート状態
  searchKeyword: string = '';
  priorityFilter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';
  selectedTag: string = 'ALL';
  sortBy: 'createdAt' | 'deadline' | 'priority' | 'progress' = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';

  // 親から projects データが渡された・更新された際にタグ一覧を再構築
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.updateAvailableTags();
    }
  }

  // タグ抽出処理
  private updateAvailableTags(): void {
    if (!this.projects || this.projects.length === 0) {
      this.availableTags = [];
      return;
    }

    const tagSet = new Set<string>();
    this.projects.forEach(project => {
      if (Array.isArray(project.tags)) {
        project.tags.forEach(tag => {
          const cleaned = tag.trim().replace(/^#/, '');
          if (cleaned) tagSet.add(cleaned);
        });
      }
    });
    this.availableTags = Array.from(tagSet);
  }

  private cleanTag(tag: string): string {
    if (!tag) return '';
    return tag.trim().replace(/^#/, '').toLowerCase();
  }

  private normalizeStatus(status: string): string {
    if (!status) return '';
    return status.trim().toLowerCase().replace('_', '-');
  }

  // フィルタリング・ソート済みの親課題リスト
  get filteredAndSortedProjects(): ParentProject[] {
    if (!this.projects) return [];
    let result = [...this.projects];

    // 1. キーワード検索（タイトル ＆ 概要・メモ）
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

    // 3. タグフィルター
    if (this.selectedTag !== 'ALL') {
      const target = this.cleanTag(this.selectedTag);
      result = result.filter(p => 
        p.tags && Array.isArray(p.tags) && p.tags.some(tag => this.cleanTag(tag) === target)
      );
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
        const weightA = weight[a.priority] || 0;
        const weightB = weight[b.priority] || 0;
        comparison = weightB - weightA;
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

  // 各ステータスごとの親課題フィルタリング
  get todoProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'todo');
  }

  get inProgressProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'in-progress' || this.normalizeStatus(p.status) === 'in_progress');
  }

  get doneProjects(): ParentProject[] {
    return this.filteredAndSortedProjects.filter(p => this.normalizeStatus(p.status) === 'done');
  }

  // フィルターリセット処理
  resetFilters(): void {
    this.searchKeyword = '';
    this.priorityFilter = 'ALL';
    this.selectedTag = 'ALL';
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
  }

  // ソート順切り替え処理
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  onSelectProject(project: ParentProject): void {
    this.selectProject.emit(project);
  }

  /**
   * 親課題カードがカラム間でドロップされた際のハンドラー
   * @param event CdkDragDrop イベント
   * @param targetStatus ドロップ先のステータス ('todo' | 'in-progress' | 'done')
   */
  onProjectDropped(event: CdkDragDrop<ParentProject[]>, targetStatus: Status): void {
    if (event.previousContainer === event.container) {
      // 同一カラム内での順番入れ替え
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // 1. ドラッグデータを取得
      let projectId: string | null = null;
      const itemData = event.item.data;

      // 分岐A：cdkDragDataからオブジェクトが取得できた場合
      if (typeof itemData === 'object' && itemData != null && itemData['id']) {
        projectId = itemData.id;
      }
      // 分岐B：cdkDragDataからID文字列が取得できた場合
      else if (typeof itemData === 'string') {
        projectId = itemData;
      }
      // 分岐C：previousContainerから復元を試みる
      else {
        const previousData = event.previousContainer.data;
        if (Array.isArray(previousData) && event.previousIndex >= 0 && previousData[event.previousIndex]) {
          const prevProject = previousData[event.previousIndex];
          if (prevProject && typeof prevProject === 'object' && prevProject.id) {
            projectId = prevProject.id;
          }
        }
      }

      // IDが取得できなかった場合はエラー
      if (!projectId) {
        console.error('更新対象の親課題IDが見つかりません:', itemData);
        return;
      }

      // 2. this.projects配列から親課題オブジェクトを取得・復元
      const projectIndex = this.projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) {
        console.error('親課題が配列に見つかりません:', projectId);
        return;
      }

      const project = this.projects[projectIndex];

      // 3. 親課題のプロパティを更新
      project.status = targetStatus;
      project.updatedAt = new Date().toISOString();

      // 4. 配列も更新
      this.projects[projectIndex] = { ...project };

      // 5. 親コンポーネントに更新された親課題を通知
      this.parentTaskUpdated.emit({ ...project });
    }
  }
}
