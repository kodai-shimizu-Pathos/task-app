import { Injectable, inject } from '@angular/core';
import { DelayLog } from '../models/delay-log.model';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  addDoc,
  updateDoc,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, of, switchMap } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ParentProject } from '../models/project.model';
import { Task } from '../models/task.model';
import { AuthService } from './auth.service';

/** サイドポケットメモのインターフェース */
export interface SidePocketMemo {
  id: string;
  content: string;
  createdAt: string;
  parentProjectId?: string;
}

/**
 * デモ用ダミーデータ（未ログイン時に表示）
 * 本日の基準日: 2026年10月20日前後
 */
const DEMO_PROJECTS: ParentProject[] = [
  {
    id: 'demo_project_1',
    userId: 'demo',
    title: '🚀 BeSideFlow AI 開発フェーズ1',
    description: 'カンバン・ガントチャートおよびAI分析ダッシュボードの構築',
    priority: 'high',
    tags: ['フロントエンド', 'AI'],
    status: 'in-progress',
    scheduledStartDate: '2026-10-01',
    scheduledEndDate: '2026-10-15', // 完了予定超過中（オレンジアラート）
    deadline: '2026-10-28',
    totalTaskCount: 4,
    completedTaskCount: 2,
    progressPercentage: 50,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_project_2',
    userId: 'demo',
    title: '⚠️ 【期限超過】旧システムデータ移行',
    description: '旧DBデータのクレンジングおよび移行作業',
    priority: 'high',
    tags: ['データベース', '緊急'],
    status: 'in-progress',
    scheduledStartDate: '2026-10-01',
    scheduledEndDate: '2026-10-12',
    deadline: '2026-10-17', // ★ 最終期限超過（赤色アラート発生中）
    totalTaskCount: 3,
    completedTaskCount: 1,
    progressPercentage: 33,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_project_3',
    userId: 'demo',
    title: '📱 モバイル版UI＆PiP連携強化',
    description: '集中モード(Picture-in-Picture)とモバイルレイアウトの最適化',
    priority: 'medium',
    tags: ['UI/UX', 'モバイル'],
    status: 'in-progress',
    scheduledStartDate: '2026-10-10',
    scheduledEndDate: '2026-11-25',
    deadline: '2026-11-25',
    totalTaskCount: 2,
    completedTaskCount: 0,
    progressPercentage: 0,
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_project_4',
    userId: 'demo',
    title: '🔒 基盤セキュリティ＆Firestore監査ログ',
    description: '認証ルールの強化とセキュリティ監査',
    priority: 'low',
    tags: ['セキュリティ', 'インフラ'],
    status: 'done',
    scheduledStartDate: '2026-10-05',
    scheduledEndDate: '2026-10-18',
    deadline: '2026-10-18',
    totalTaskCount: 2,
    completedTaskCount: 2,
    progressPercentage: 100,
    createdAt: '2026-10-05T08:00:00Z',
    updatedAt: '2026-10-18T18:00:00Z'
  }
];

const DEMO_TASKS: Task[] = [
  // --- 親課題1配下 ---
  {
    id: 'demo_task_1',
    userId: 'demo',
    title: '2カラムAIレビューダッシュボード構築',
    status: 'done',
    priority: 'high',
    progress: 100,
    tags: ['AI', 'UI'],
    parentId: 'demo_project_1',
    description: '過去7日間の分析・傾向グラフ表示',
    scheduledStartDate: '2026-10-01',
    scheduledEndDate: '2026-10-10',
    deadline: '2026-10-10',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-10T17:00:00Z'
  },
  {
    id: 'demo_task_2',
    userId: 'demo',
    title: '週次集計プロンプト・AI要約エンジンの調整',
    status: 'done',
    priority: 'high',
    progress: 100,
    tags: ['AI', 'API'],
    parentId: 'demo_project_1',
    description: 'Gemini API連携とレスポンス整形',
    scheduledStartDate: '2026-10-05',
    scheduledEndDate: '2026-10-16',
    deadline: '2026-10-16',
    createdAt: '2026-10-05T11:00:00Z',
    updatedAt: '2026-10-16T15:00:00Z'
  },
  {
    id: 'demo_task_3',
    userId: 'demo',
    title: 'インタラクティブガイドツアーコンポーネント開発',
    status: 'in-progress',
    priority: 'high',
    progress: 75,
    tags: ['フロントエンド'],
    parentId: 'demo_project_1',
    description: 'スポットライト型機能ガイドの実装',
    scheduledStartDate: '2026-10-05',
    scheduledEndDate: '2026-10-15', // ★ 完了予定超過（オレンジ枠線＆黄色完了予定バッジ）
    deadline: '2026-10-28',
    createdAt: '2026-10-05T09:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_task_4',
    userId: 'demo',
    title: '総合パフォーマンステスト＆E2E検証',
    status: 'todo',
    priority: 'low',
    progress: 0,
    tags: ['テスト'],
    parentId: 'demo_project_1',
    description: '全画面動作の結合テスト',
    scheduledStartDate: '2026-11-01',
    scheduledEndDate: '2026-11-10',
    deadline: '2026-11-10',
    createdAt: '2026-10-18T14:00:00Z',
    updatedAt: '2026-10-18T14:00:00Z'
  },

  // --- 親課題2配下（遅延・期限超過メイン） ---
  {
    id: 'demo_task_5',
    userId: 'demo',
    title: '旧マイグレーションスクリプトの作成',
    status: 'done',
    priority: 'high',
    progress: 100,
    tags: ['DB'],
    parentId: 'demo_project_2',
    description: 'データ変換バッチ処理',
    scheduledStartDate: '2026-10-01',
    scheduledEndDate: '2026-10-08',
    deadline: '2026-10-08',
    createdAt: '2026-10-01T09:30:00Z',
    updatedAt: '2026-10-08T16:00:00Z'
  },
  {
    id: 'demo_task_6',
    userId: 'demo',
    title: '旧データベースのインデックス再構築・データ抽出',
    status: 'in-progress',
    priority: 'high',
    progress: 40,
    tags: ['DB', '緊急'],
    parentId: 'demo_project_2',
    description: 'データクレンジング作業の遅延',
    scheduledStartDate: '2026-10-01',
    scheduledEndDate: '2026-10-12', // 完了予定超過
    deadline: '2026-10-17', // ★ 最終期限超過（赤色枠線＆赤色最終期限バッジ）
    createdAt: '2026-10-01T13:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_task_7',
    userId: 'demo',
    title: '新DBへの整合性チェックとデータ流し込み',
    status: 'todo',
    priority: 'medium',
    progress: 0,
    tags: ['検証'],
    parentId: 'demo_project_2',
    description: '移行後の確認テスト',
    scheduledStartDate: '2026-10-22',
    scheduledEndDate: '2026-11-05',
    deadline: '2026-11-05',
    createdAt: '2026-10-19T10:00:00Z',
    updatedAt: '2026-10-19T10:00:00Z'
  },

  // --- 親課題3配下 ---
  {
    id: 'demo_task_8',
    userId: 'demo',
    title: 'Picture-in-Picture 小窓UIレイアウト設計',
    status: 'in-progress',
    priority: 'medium',
    progress: 50,
    tags: ['PiP', 'UI'],
    parentId: 'demo_project_3',
    description: '最前面操作小窓のデザイン調整',
    scheduledStartDate: '2026-10-15',
    scheduledEndDate: '2026-11-01',
    deadline: '2026-11-01',
    createdAt: '2026-10-15T09:30:00Z',
    updatedAt: '2026-10-20T00:00:00Z'
  },
  {
    id: 'demo_task_9',
    userId: 'demo',
    title: 'モバイルブラウザ表示のレスポンシブ最適化',
    status: 'todo',
    priority: 'low',
    progress: 0,
    tags: ['CSS', 'モバイル'],
    parentId: 'demo_project_3',
    description: 'スマートフォン画面幅での検証',
    scheduledStartDate: '2026-11-05',
    scheduledEndDate: '2026-11-20',
    deadline: '2026-11-20',
    createdAt: '2026-10-19T10:00:00Z',
    updatedAt: '2026-10-19T10:00:00Z'
  }
];

const DEMO_DELAY_LOGS: DelayLog[] = [
  {
    id: 'demo_log_1',
    taskId: 'demo_task_3',
    taskTitle: 'ガイドツアーコンポーネント開発',
    previousDueDate: '2026-10-15',
    newDueDate: '2026-10-28',
    reason: 'estimation',
    createdAt: '2026-10-16T11:00:00Z'
  },
  {
    id: 'demo_log_2',
    taskId: 'demo_task_6',
    taskTitle: '旧データベースのインデックス再構築・データ抽出',
    previousDueDate: '2026-10-12',
    newDueDate: '2026-10-17',
    reason: 'external',
    createdAt: '2026-10-15T14:30:00Z'
  },
  {
    id: 'demo_log_3',
    taskId: 'demo_project_1',
    taskTitle: '📁 BeSideFlow AI 開発フェーズ1',
    previousDueDate: '2026-10-20',
    newDueDate: '2026-10-28',
    reason: 'interruption',
    createdAt: '2026-10-18T09:15:00Z'
  }
];

const DEMO_SIDE_POCKET_MEMOS: SidePocketMemo[] = [
  {
    id: 'demo_memo_1',
    content: 'PiPモードのドラッグ追従性能の改善案をまとめる',
    createdAt: '2026-10-19T16:20:00Z'
  },
  {
    id: 'demo_memo_2',
    content: 'Gemini APIのレスポンスタイムログを集計して可視化する',
    createdAt: '2026-10-20T08:45:00Z'
  }
];

/**
 * タスクデータ管理サービス
 * 認証状態に応じてFirestoreまたはデモデータを切り替え
 * Firestore との連携による親課題、タスク、メモ、遅延ログの CRUD 処理
 */
@Injectable({
  providedIn: 'root'
})
export class TaskDataService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);

  private delayLogs: DelayLog[] = [];
  private inMemoryProjects: BehaviorSubject<ParentProject[]> = new BehaviorSubject<ParentProject[]>([]);
  private inMemoryTasks: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
  private inMemoryMemos: BehaviorSubject<SidePocketMemo[]> = new BehaviorSubject<SidePocketMemo[]>([]);

  /** 認証状態に応じた親課題のリアルタイム同期ストリーム */
  readonly projects$: Observable<ParentProject[]> = this.authService.user$.pipe(
    switchMap(user => {
      if (!user) {
        // 未ログイン時: デモデータを返す
        return of(DEMO_PROJECTS);
      }
      // ログイン時: Firestore から取得
      const projectsCollection = collection(this.firestore, `users/${user.uid}/projects`);
      return collectionData(projectsCollection, { idField: 'id' }) as Observable<ParentProject[]>;
    }),
    startWith([])
  );

  /** 認証状態に応じたタスクのリアルタイム同期ストリーム */
  readonly tasks$: Observable<Task[]> = this.authService.user$.pipe(
    switchMap(user => {
      if (!user) {
        // 未ログイン時: デモデータを返す
        return of(DEMO_TASKS);
      }
      // ログイン時: Firestore から取得
      const tasksCollection = collection(this.firestore, `users/${user.uid}/tasks`);
      return collectionData(tasksCollection, { idField: 'id' }) as Observable<Task[]>;
    }),
    startWith([])
  );

  /** 認証状態に応じたサイドポケットメモのリアルタイム同期ストリーム（新着順） */
  readonly sidePocketMemos$: Observable<SidePocketMemo[]> = this.authService.user$.pipe(
    switchMap(user => {
      if (!user) {
        // 未ログイン時: 空配列を返す
        return of([]);
      }
      // ログイン時: Firestore から取得
      const sidePocketCollection = collection(this.firestore, `users/${user.uid}/side_pocket_memos`);
      return (
        collectionData(sidePocketCollection, { idField: 'id' }) as Observable<SidePocketMemo[]>
      ).pipe(
        map(memos => memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      );
    }),
    startWith([])
  );

  /** 認証状態に応じた遅延ログのリアルタイム同期ストリーム */
  readonly delayLogs$: Observable<DelayLog[]> = this.authService.user$.pipe(
    switchMap(user => {
      if (!user) {
        // 未ログイン時: デモデータを返す
        return of(DEMO_DELAY_LOGS);
      }
      // ログイン時: Firestore から取得
      const delayLogsCollection = collection(this.firestore, `users/${user.uid}/delay_logs`);
      return collectionData(delayLogsCollection, { idField: 'id' }) as Observable<DelayLog[]>;
    }),
    startWith([])
  );

  constructor() {
    this.delayLogs$.subscribe(logs => {
      this.delayLogs = logs;
    });
  }

  /**
   * 全親課題を取得
   * @returns 親課題のリアルタイムストリーム
   */
  getProjects(): Observable<ParentProject[]> {
    return this.projects$;
  }

  /**
   * 全タスクを取得
   * @returns タスクのリアルタイムストリーム
   */
  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  /**
   * 全サイドポケットメモを取得
   * @returns メモのリアルタイムストリーム（新着順）
   */
  getSidePocketMemos(): Observable<SidePocketMemo[]> {
    return this.sidePocketMemos$;
  }

  /**
   * 遅延ログを Firestore に追加
   * @param log 遅延ログデータ（id, createdAt 除く）
   */
  async addDelayLog(log: Omit<DelayLog, 'id' | 'createdAt'>): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時はメモリに保持するだけ
    if (!currentUser) {
      console.log('未ログイン状態のため、遅延ログはメモリに保持されます：', log);
      return;
    }

    const newLog: DelayLog = {
      ...log,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    console.log('遅延ログをFirestoreに記録しました：', newLog);
    const delayLogsCollection = collection(this.firestore, `users/${currentUser}/delay_logs`);
    await addDoc(delayLogsCollection, newLog);
  }

  /**
   * 過去N日間の遅延ログを取得
   * @param days 過去の日数（デフォルト 7）
   * @returns 該当する遅延ログの配列
   */
  getRecentDelayLogs(days: number = 7): DelayLog[] {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return this.delayLogs.filter(log => new Date(log.createdAt) >= pastDate);
  }

  /**
   * サイドポケットメモを追加
   * @param memo メモデータ
   * @returns 生成されたメモID
   */
  async addSidePocketMemo(memo: { content: string; createdAt: string; parentProjectId?: string }): Promise<string> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリに保持
    if (!currentUser) {
      const newMemoId = `memo_${Date.now()}`;
      const newMemo: SidePocketMemo = {
        id: newMemoId,
        ...memo
      };
      const currentMemos = this.inMemoryMemos.value;
      this.inMemoryMemos.next([...currentMemos, newMemo]);
      console.log('未ログイン状態のため、メモはメモリに保持されます：', newMemo);
      return newMemoId;
    }

    // ログイン時：Firestore に保存
    const cleaned = JSON.parse(JSON.stringify(memo));
    const sidePocketCollection = collection(this.firestore, `users/${currentUser}/side_pocket_memos`);
    const docRef = await addDoc(sidePocketCollection, cleaned);
    return docRef.id;
  }

  /**
   * サイドポケットメモを削除
   * @param id メモID
   */
  async deleteSidePocketMemo(id: string): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    if (!id) return;

    // 未ログイン時：メモリから削除
    if (!currentUser) {
      const currentMemos = this.inMemoryMemos.value;
      this.inMemoryMemos.next(currentMemos.filter(m => m.id !== id));
      console.log('未ログイン状態のため、メモをメモリから削除しました：', id);
      return;
    }

    // ログイン時：Firestore から削除
    const docRef = doc(this.firestore, `users/${currentUser}/side_pocket_memos/${id}`);
    await deleteDoc(docRef);
  }

  /**
   * 親課題を追加
   * @param project 親課題データ（id 除く）
   * @returns 生成された親課題ID
   */
  async addProject(project: Omit<ParentProject, 'id'>): Promise<string> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリに保持
    if (!currentUser) {
      const newProjectId = `project_${Date.now()}`;
      const newProject: ParentProject = {
        id: newProjectId,
        userId: 'guest',
        ...project
      };
      const currentProjects = this.inMemoryProjects.value;
      this.inMemoryProjects.next([...currentProjects, newProject]);
      console.log('未ログイン状態のため、親課題はメモリに保持されます：', newProject);
      return newProjectId;
    }

    // ログイン時：Firestore に保存
    const cleaned = JSON.parse(JSON.stringify(project));
    cleaned.userId = currentUser;
    const projectsCollection = collection(this.firestore, `users/${currentUser}/projects`);
    const docRef = await addDoc(projectsCollection, cleaned);
    return docRef.id;
  }

  /**
   * 親課題を更新
   * @param id 親課題ID
   * @param data 更新するデータ
   */
  async updateProject(id: string, data: Partial<ParentProject>): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリを更新
    if (!currentUser) {
      const currentProjects = this.inMemoryProjects.value;
      const index = currentProjects.findIndex(p => p.id === id);
      if (index !== -1) {
        currentProjects[index] = { ...currentProjects[index], ...data };
        this.inMemoryProjects.next([...currentProjects]);
      }
      console.log('未ログイン状態のため、親課題をメモリ内で更新しました：', id);
      return;
    }

    // ログイン時：Firestore を更新
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `users/${currentUser}/projects/${id}`);
    await updateDoc(docRef, cleaned);
  }

  /**
   * 親課題を削除
   * @param id 親課題ID
   */
  async deleteProject(id: string): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリから削除
    if (!currentUser) {
      const currentProjects = this.inMemoryProjects.value;
      this.inMemoryProjects.next(currentProjects.filter(p => p.id !== id));
      console.log('未ログイン状態のため、親課題をメモリから削除しました：', id);
      return;
    }

    // ログイン時：Firestore から削除
    const docRef = doc(this.firestore, `users/${currentUser}/projects/${id}`);
    await deleteDoc(docRef);
  }

  /**
   * タスクを追加
   * @param task タスクデータ（id 除く）
   * @returns 生成されたタスクID
   */
  async addTask(task: Omit<Task, 'id'>): Promise<string> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリに保持
    if (!currentUser) {
      const newTaskId = `task_${Date.now()}`;
      const newTask: Task = {
        id: newTaskId,
        userId: 'guest',
        ...task
      };
      const currentTasks = this.inMemoryTasks.value;
      this.inMemoryTasks.next([...currentTasks, newTask]);
      console.log('未ログイン状態のため、タスクはメモリに保持されます：', newTask);
      return newTaskId;
    }

    // ログイン時：Firestore に保存
    const cleaned = JSON.parse(JSON.stringify(task));
    cleaned.userId = currentUser;
    const tasksCollection = collection(this.firestore, `users/${currentUser}/tasks`);
    const docRef = await addDoc(tasksCollection, cleaned);
    return docRef.id;
  }

  /**
   * タスクを更新
   * @param id タスクID
   * @param data 更新するデータ
   */
  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリを更新
    if (!currentUser) {
      const currentTasks = this.inMemoryTasks.value;
      const index = currentTasks.findIndex(t => t.id === id);
      if (index !== -1) {
        currentTasks[index] = { ...currentTasks[index], ...data };
        this.inMemoryTasks.next([...currentTasks]);
      }
      console.log('未ログイン状態のため、タスクをメモリ内で更新しました：', id);
      return;
    }

    // ログイン時：Firestore を更新
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `users/${currentUser}/tasks/${id}`);
    await updateDoc(docRef, cleaned);
  }

  /**
   * タスクを削除
   * @param id タスクID
   */
  async deleteTask(id: string): Promise<void> {
    const currentUser = this.authService.currentUserId;
    
    // 未ログイン時：メモリから削除
    if (!currentUser) {
      const currentTasks = this.inMemoryTasks.value;
      this.inMemoryTasks.next(currentTasks.filter(t => t.id !== id));
      console.log('未ログイン状態のため、タスクをメモリから削除しました：', id);
      return;
    }

    // ログイン時：Firestore から削除
    const docRef = doc(this.firestore, `users/${currentUser}/tasks/${id}`);
    await deleteDoc(docRef);
  }
}
