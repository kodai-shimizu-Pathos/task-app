import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TaskDataService, SidePocketMemo } from '../../services/task-data';
import { ParentProject } from '../../models/project.model';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-side-pocket-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- A. 折り畳み状態 (細い縦バー表示) -->
    <div class="side-pocket-collapsed" *ngIf="isCollapsed" (click)="toggleCollapse()" title="サイドポケットを展開">
      <button class="expand-btn">◀</button>
      <div class="vertical-title">
        <span class="icon">📥</span>
        <span>サイドポケット</span>
        <span class="badge" *ngIf="memos.length > 0">{{ memos.length }}</span>
      </div>
    </div>

    <!-- B. 展開状態 (可変幅パネル) -->
    <div class="side-pocket-expanded" *ngIf="!isCollapsed" [style.width.px]="panelWidth">
      <!-- 1. 左端のドラッグリサイズバー -->
      <div 
        class="resize-handle" 
        (mousedown)="onResizeStart($event)"
        [class.active]="isResizing"
        title="ドラッグしてパネル幅を変更">
      </div>

      <!-- 2. パネルヘッダー -->
      <div class="panel-header">
        <div class="header-title">
          <span class="icon">📥</span>
          <h3>サイドポケット</h3>
          <span class="count-chip">{{ memos.length }}件</span>
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()" title="パネルを折りたたむ">▶</button>
      </div>

      <!-- 3. メモ一覧エリア -->
      <div class="panel-body">
        <!-- 空の状態のガイダンス -->
        <div class="empty-state" *ngIf="memos.length === 0">
          <div class="empty-icon">🎯</div>
          <p class="empty-title">未整理メモはありません</p>
          <p class="empty-desc">
            集中モード（PiP）や音声入力でキャプチャした思考がここにリアルタイムで溜まります。
          </p>
        </div>

        <!-- メモカード一覧 -->
        <div class="memo-card" *ngFor="let memo of memos; let i = index">
          <div class="memo-header">
            <span class="memo-time">⏰ {{ formatTime(memo.createdAt) }}</span>
            <button class="btn-delete-icon" (click)="onDeleteMemo(memo)" title="メモを削除">✕</button>
          </div>

          <p class="memo-content">{{ memo.content }}</p>

                    <!-- 昇格パイプラインアクション -->
          <div class="memo-actions">
            
            <!-- 1. 通常状態 (AI未実行) -->
            <ng-container *ngIf="!aiStates[memo.id]">
              <div class="btn-group-row">
                <button class="btn-action promote-task" (click)="onPromoteToTask(memo)">
                  🚀 手動タスク化
                </button>
                <button class="btn-action ai-predict-btn" (click)="onPredictProject(memo)" [disabled]="projects.length === 0">
                  🤖 AI分類
                </button>
              </div>

              <div class="promote-project-group" *ngIf="projects.length > 0">
                <select 
                  class="project-select" 
                  #projSelect 
                  (change)="onPromoteToProjectMemo(memo, projSelect.value); projSelect.value=''">
                  <option value="" disabled selected>📌 親課題メモに追加...</option>

                  <option *ngIf="selectedProject" [value]="selectedProject.id">
                    ★ {{ selectedProject.title }} (選択中)
                  </option>
                  <ng-container *ngFor="let proj of projects">
                    <option *ngIf="proj.id !== selectedProject?.id" [value]="proj.id">
                      {{ proj.title }}
                    </option>
                  </ng-container>
                </select>
              </div>
            </ng-container>

            <!-- 2. AI推測中 (ローディング) -->
            <div class="ai-loading" *ngIf="aiStates[memo.id]?.loading">
              <span class="spinner">⏳</span> Geminiが親課題を推測中...
            </div>

            <!-- 3. AI推測結果 (二段階承認UI) -->
            <div class="ai-result-box" *ngIf="aiStates[memo.id] && !aiStates[memo.id].loading">
              <!-- 推測成功時 -->
              <ng-container *ngIf="aiStates[memo.id].predictedProjectId">
                <div class="ai-header">
                  <span class="ai-badge">🤖 AI提案</span>
                  <span class="ai-reason">💡 {{ aiStates[memo.id].reason }}</span>
                </div>
                
                <div class="ai-field">
                  <label>親課題:</label>
                  <select class="ai-select" [(ngModel)]="aiStates[memo.id].predictedProjectId">
                    <option *ngFor="let proj of projects" [value]="proj.id">{{ proj.title }}</option>
                  </select>
                </div>

                <div class="ai-field">
                  <label>タスク名:</label>
                  <input type="text" class="ai-input" [(ngModel)]="aiStates[memo.id].taskTitle" />
                </div>

                <div class="ai-btn-group">
                  <button class="btn-approve" (click)="onApproveAiTask(memo)">✓ 承認してタスク化</button>
                  <button class="btn-cancel" (click)="onCancelAiPredict(memo.id)">✕</button>
                </div>
              </ng-container>

              <!-- 該当なし時 -->
              <ng-container *ngIf="!aiStates[memo.id].predictedProjectId">
                <div class="ai-header error">
                  <span>⚠️ 該当する親課題が見つかりませんでした</span>
                </div>
                <div class="ai-field">
                  <select class="ai-select" [(ngModel)]="aiStates[memo.id].predictedProjectId">
                    <option [value]="null" disabled selected>親課題を選択してください...</option>
                    <option *ngFor="let proj of projects" [value]="proj.id">{{ proj.title }}</option>
                  </select>
                </div>
                <div class="ai-btn-group">
                  <button class="btn-approve" [disabled]="!aiStates[memo.id].predictedProjectId" (click)="onApproveAiTask(memo)">
                    🚀 タスク化
                  </button>
                  <button class="btn-cancel" (click)="onCancelAiPredict(memo.id)">✕</button>
                </div>
              </ng-container>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      height: 100%;
      box-sizing: border-box;
      user-select: none;
    }

    /* 折り畳み状態の縦バー */
    .side-pocket-collapsed {
      width: 44px;
      height: 100%;
      background-color: var(--bg-master, #242832);
      border-left: 1px solid var(--border-color, #3B444E);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      gap: 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .side-pocket-collapsed:hover {
      background-color: var(--bg-card, #2D3139);
    }

    .expand-btn {
      background: none;
      border: none;
      color: var(--text-muted, #9CA3AF);
      font-size: 14px;
      cursor: pointer;
    }

    .vertical-title {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #E8EAEE);
      letter-spacing: 1px;
    }

    .badge {
      writing-mode: horizontal-tb;
      background-color: var(--accent-color, #2563EB);
      color: #ffffff;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
    }

    /* 展開状態の本体パネル */
    .side-pocket-expanded {
      position: relative;
      height: 100%;
      background-color: var(--bg-master, #242832);
      border-left: 1px solid var(--border-color, #3B444E);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    /* ドラッグリサイズハンドル */
    .resize-handle {
      position: absolute;
      left: -4px;
      top: 0;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      transition: background-color 0.15s;
    }

    .resize-handle:hover,
    .resize-handle.active {
      background-color: var(--accent-color, #2563EB);
    }

    /* パネルヘッダー */
    .panel-header {
      height: 48px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color, #3B444E);
      background-color: var(--bg-secondary, #2A2E38);
      flex-shrink: 0;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-title h3 {
      margin: 0;
      font-size: 14px;
      font-weight: bold;
      color: var(--text-primary, #E8EAEE);
    }

    .count-chip {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-color, #2563EB);
      background-color: rgba(37, 99, 235, 0.12);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid rgba(37, 99, 235, 0.3);
    }

    .collapse-btn {
      background: none;
      border: none;
      color: var(--text-muted, #9CA3AF);
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }

    .collapse-btn:hover {
      color: var(--text-primary, #ffffff);
      background-color: rgba(255, 255, 255, 0.08);
    }

    /* メモ一覧エリア */
    .panel-body {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* 空状態表示 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      text-align: center;
      color: var(--text-muted, #9CA3AF);
    }

    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0 0 6px 0;
      color: var(--text-primary, #E8EAEE);
    }

    .empty-desc {
      font-size: 11px;
      line-height: 1.5;
      margin: 0;
    }

    /* メモカード */
    .memo-card {
      background-color: var(--bg-card, #2D3139);
      border: 1px solid var(--border-color, #3B444E);
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: border-color 0.15s;
    }

    .memo-card:hover {
      border-color: rgba(37, 99, 235, 0.4);
    }

    .memo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .memo-time {
      font-size: 10px;
      color: var(--text-muted, #9CA3AF);
    }

    .btn-delete-icon {
      background: none;
      border: none;
      color: var(--text-muted, #9CA3AF);
      font-size: 12px;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
    }

    .btn-delete-icon:hover {
      color: var(--priority-high, #EF4444);
      background-color: rgba(239, 68, 68, 0.1);
    }

    .memo-content {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-primary, #E8EAEE);
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* アクションボタン群 */
    .memo-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border-color, #3B444E);
    }

    .btn-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 28px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 5px;
      border: none;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .promote-task {
      background-color: var(--accent-color, #2563EB);
      color: #ffffff;
    }

    .promote-task:hover {
      opacity: 0.9;
    }

    .project-select {
      width: 100%;
      height: 28px;
      padding: 0 8px;
      font-size: 11px;
      border-radius: 5px;
      border: 1px solid var(--border-color, #3B444E);
      background-color: var(--bg-secondary, #2A2E38);
      color: var(--text-primary, #E8EAEE);
      cursor: pointer;
      outline: none;
    }

    .project-select:focus {
      border-color: var(--accent-color, #2563EB);
    }
  `]
})
export class SidePocketPanelComponent implements OnInit, OnDestroy {
  private dataService = inject(TaskDataService);
  private cdr = inject(ChangeDetectorRef);
  private aiService = inject(AiService);

  @Input() projects: ParentProject[] = [];
  @Input() selectedProject: ParentProject | null = null;

  @Output() promoteToTask = new EventEmitter<SidePocketMemo>();
  @Output() promoteToProjectMemo = new EventEmitter<{ memo: SidePocketMemo; projectId: string }>();

  isCollapsed = false;
  panelWidth = 300; // 初期横幅 300px
  isResizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 300;

  memos: SidePocketMemo[] = [];
  private sub?: Subscription;

  ngOnInit(): void {
    // データサービスからサイドポケットメモをサブスクライブ
    this.sub = this.dataService.sidePocketMemos$.subscribe(memos => {
      this.memos = memos;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onDeleteMemo(memo: SidePocketMemo): void {
    this.dataService.deleteSidePocketMemo(memo.id);
  }

  onPromoteToTask(memo: SidePocketMemo): void {
    this.promoteToTask.emit(memo);
  }

  onPromoteToProjectMemo(memo: SidePocketMemo, projectId: string): void {
    if (!projectId) return;
    this.promoteToProjectMemo.emit({ memo, projectId });
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  }
  
  aiStates: {
    [memoId: string]: {
      loading: boolean;
      predictedProjectId: string | null;
      taskTitle: string;
      reason: string;
      error?: string;
    }
  } = {};

  async onPredictProject(memo: SidePocketMemo): Promise<void> {
    this.aiStates[memo.id] = {
      loading: true,
      predictedProjectId: null,
      taskTitle: memo.content,
      reason: ''
    };
    this.cdr.detectChanges();

    try {
      const result = await this.aiService.predictParentProject(memo.content, this.projects);
      this.aiStates[memo.id] = {
        loading: false,
        predictedProjectId: result.projectId,
        taskTitle: result.suggestedTaskTitle,
        reason: result.reason
      };
    } catch (err) {
      this.aiStates[memo.id] = {
        loading: false,
        predictedProjectId: null,
        taskTitle: memo.content,
        reason: '',
        error: 'AI推測に失敗しました'
      };
    }
    this.cdr.detectChanges();
  }


  // --- 二段階承認 ---
  onApproveAiTask(memo: SidePocketMemo): void {
    const state = this.aiStates[memo.id];
    if (!state || !state.predictedProjectId) return;

    this.dataService.addTask({
      title: state.taskTitle,
      parentId: state.predictedProjectId,
      status: 'todo',
      priority: 'medium',
      progress: 0,
      tags: [],
    });

    this.dataService.deleteSidePocketMemo(memo.id);
    delete this.aiStates[memo.id];
  }

  // --- AI推測のキャンセル ---
  onCancelAiPredict(memoId: string): void {
    delete this.aiStates[memoId];
    this.cdr.detectChanges();
  }

  // --- ドラッグリサイズ制御 ---
  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.panelWidth;
  }

  @HostListener('document:mousemove', ['\$event'])
  onResizing(event: MouseEvent): void {
    if (!this.isResizing) return;
    // 左方向への移動で幅増加
    const diff = this.resizeStartX - event.clientX;
    const newWidth = this.resizeStartWidth + diff;
    // 最小 240px 〜 最大 520px に制限
    this.panelWidth = Math.max(240, Math.min(520, newWidth));
    this.cdr.detectChanges();
  }

  @HostListener('document:mouseup')
  onResizeEnd(): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.cdr.detectChanges();
    }
  }
}