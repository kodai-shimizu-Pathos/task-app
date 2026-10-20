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
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ParentProject } from '../models/project.model';
import { Task } from '../models/task.model';

/** サイドポケットメモのインターフェース */
export interface SidePocketMemo {
  id: string;
  content: string;
  createdAt: string;
  parentProjectId?: string;
}

/**
 * タスクデータ管理サービス
 * Firestore との連携による親課題、タスク、メモ、遅延ログの CRUD 処理
 */
@Injectable({
  providedIn: 'root'
})
export class TaskDataService {
  private firestore: Firestore = inject(Firestore);

  private projectsCollection = collection(this.firestore, 'projects');
  private tasksCollection = collection(this.firestore, 'tasks');
  private sidePocketCollection = collection(this.firestore, 'side_pocket_memos');
  private delayLogsCollection = collection(this.firestore, 'delay_logs');

  private delayLogs: DelayLog[] = [];

  /** 親課題のリアルタイム同期ストリーム */
  readonly projects$: Observable<ParentProject[]> =
    collectionData(this.projectsCollection, { idField: 'id' }) as Observable<ParentProject[]>;

  /** タスクのリアルタイム同期ストリーム */
  readonly tasks$: Observable<Task[]> =
    collectionData(this.tasksCollection, { idField: 'id' }) as Observable<Task[]>;

  /** サイドポケットメモのリアルタイム同期ストリーム（新着順） */
  readonly sidePocketMemos$: Observable<SidePocketMemo[]> = (
    collectionData(this.sidePocketCollection, { idField: 'id' }) as Observable<SidePocketMemo[]>
  ).pipe(
    map(memos => memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  );

  /** 遅延ログのリアルタイム同期ストリーム */
  readonly delayLogs$: Observable<DelayLog[]> =
    collectionData(this.delayLogsCollection, { idField: 'id' }) as Observable<DelayLog[]>;

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
    const newLog: DelayLog = {
      ...log,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    console.log('遅延ログをFirestoreに記録しました：', newLog);
    await addDoc(this.delayLogsCollection, newLog);
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
    const cleaned = JSON.parse(JSON.stringify(memo));
    const docRef = await addDoc(this.sidePocketCollection, cleaned);
    return docRef.id;
  }

  /**
   * サイドポケットメモを削除
   * @param id メモID
   */
  async deleteSidePocketMemo(id: string): Promise<void> {
    if (!id) return;
    const docRef = doc(this.firestore, `side_pocket_memos/${id}`);
    await deleteDoc(docRef);
  }

  /**
   * 親課題を追加
   * @param project 親課題データ（id 除く）
   * @returns 生成された親課題ID
   */
  async addProject(project: Omit<ParentProject, 'id'>): Promise<string> {
    const cleaned = JSON.parse(JSON.stringify(project));
    const docRef = await addDoc(this.projectsCollection, cleaned);
    return docRef.id;
  }

  /**
   * 親課題を更新
   * @param id 親課題ID
   * @param data 更新するデータ
   */
  async updateProject(id: string, data: Partial<ParentProject>): Promise<void> {
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `projects/${id}`);
    await updateDoc(docRef, cleaned);
  }

  /**
   * 親課題を削除
   * @param id 親課題ID
   */
  async deleteProject(id: string): Promise<void> {
    const docRef = doc(this.firestore, `projects/${id}`);
    await deleteDoc(docRef);
  }

  /**
   * タスクを追加
   * @param task タスクデータ（id 除く）
   * @returns 生成されたタスクID
   */
  async addTask(task: Omit<Task, 'id'>): Promise<string> {
    const cleaned = JSON.parse(JSON.stringify(task));
    const docRef = await addDoc(this.tasksCollection, cleaned);
    return docRef.id;
  }

  /**
   * タスクを更新
   * @param id タスクID
   * @param data 更新するデータ
   */
  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `tasks/${id}`);
    await updateDoc(docRef, cleaned);
  }

  /**
   * タスクを削除
   * @param id タスクID
   */
  async deleteTask(id: string): Promise<void> {
    const docRef = doc(this.firestore, `tasks/${id}`);
    await deleteDoc(docRef);
  }
}