import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ParentProject } from '../models/project.model';
import { Task } from '../models/task.model';
import { DelayLog } from '../models/delay-log.model';

export interface SidePocketMemo {
  id: string;
  userId: string; // ★追加
  content: string;
  createdAt: string;
  parentProjectId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskDataService {
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService);

  private projectsCollection = collection(this.firestore, 'projects');
  private tasksCollection = collection(this.firestore, 'tasks');
  private sidePocketCollection = collection(this.firestore, 'side_pocket_memos');
  private delayLogsCollection = collection(this.firestore, 'delay_logs');

  private delayLogs: DelayLog[] = [];

  // 過去指定日数の遅延ログを取得
  getRecentDelayLogs(days: number = 7): DelayLog[] {
    const now = new Date();
    const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return this.delayLogs.filter(log => new Date(log.createdAt) >= pastDate);
  }

  // ユーザーの認証状態に応じて、自分のデータのみフィルタリング取得
  readonly projects$: Observable<ParentProject[]> = this.authService.user$.pipe(
    switchMap(u => {
      if (!u) return of([]);
      const q = query(this.projectsCollection, where('userId', '==', u.uid));
      return collectionData(q, { idField: 'id' }) as Observable<ParentProject[]>;
    })
  );

  readonly tasks$: Observable<Task[]> = this.authService.user$.pipe(
    switchMap(u => {
      if (!u) return of([]);
      const q = query(this.tasksCollection, where('userId', '==', u.uid));
      return collectionData(q, { idField: 'id' }) as Observable<Task[]>;
    })
  );

  readonly sidePocketMemos$: Observable<SidePocketMemo[]> = this.authService.user$.pipe(
    switchMap(u => {
      if (!u) return of([]);
      const q = query(this.sidePocketCollection, where('userId', '==', u.uid));
      return (collectionData(q, { idField: 'id' }) as Observable<SidePocketMemo[]>).pipe(
        map(memos => memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      );
    })
  );

  // --- データ追加時に userId を自動付与 ---

  async addProject(project: Omit<ParentProject, 'id' | 'userId'>): Promise<string> {
    const uid = this.authService.currentUserId;
    if (!uid) throw new Error('未認証ユーザーは追加できません');

    const newProject = { ...project, userId: uid };
    const cleaned = JSON.parse(JSON.stringify(newProject));
    const docRef = await addDoc(this.projectsCollection, cleaned);
    return docRef.id;
  }

  async addTask(task: Omit<Task, 'id' | 'userId'>): Promise<string> {
    const uid = this.authService.currentUserId;
    if (!uid) throw new Error('未認証ユーザーは追加できません');

    const newTask = { ...task, userId: uid };
    const cleaned = JSON.parse(JSON.stringify(newTask));
    const docRef = await addDoc(this.tasksCollection, cleaned);
    return docRef.id;
  }

  async addSidePocketMemo(memo: { content: string; createdAt: string; parentProjectId?: string }): Promise<string> {
    const uid = this.authService.currentUserId;
    if (!uid) throw new Error('未認証ユーザーは追加できません');

    const newMemo = { ...memo, userId: uid };
    const cleaned = JSON.parse(JSON.stringify(newMemo));
    const docRef = await addDoc(this.sidePocketCollection, cleaned);
    return docRef.id;
  }

  async addDelayLog(log: Omit<DelayLog, 'id' | 'createdAt'>): Promise<void> {
    const uid = this.authService.currentUserId;
    if (!uid) throw new Error('未認証ユーザーは追加できません');

    const newLog = {
      ...log,
      userId: uid,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    await addDoc(this.delayLogsCollection, newLog);
  }

  // --- 更新・削除の既存処理 ---
  async updateProject(id: string, data: Partial<ParentProject>): Promise<void> {
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `projects/${id}`);
    await updateDoc(docRef, cleaned);
  }

  async deleteProject(id: string): Promise<void> {
    const docRef = doc(this.firestore, `projects/${id}`);
    await deleteDoc(docRef);
  }

  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    const cleaned = JSON.parse(JSON.stringify(data));
    delete cleaned.id;
    const docRef = doc(this.firestore, `tasks/${id}`);
    await updateDoc(docRef, cleaned);
  }

  async deleteTask(id: string): Promise<void> {
    const docRef = doc(this.firestore, `tasks/${id}`);
    await deleteDoc(docRef);
  }

  async deleteSidePocketMemo(id: string): Promise<void> {
    if (!id) return;
    const docRef = doc(this.firestore, `side_pocket_memos/${id}`);
    await deleteDoc(docRef);
  }

  // --- データの取得 ---
  getProjects(): Observable<ParentProject[]> {
    return this.projects$;
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  getSidePocketMemos(): Observable<SidePocketMemo[]> {
    return this.sidePocketMemos$;
  }
}