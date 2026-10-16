import { Injectable, inject } from '@angular/core';
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

// サイドポケットメモの型定義
export interface SidePocketMemo {
  id: string;
  content: string;
  createdAt: string;
  parentProjectId?: string; // オプション：特定の親課題に関連付ける場合
}

@Injectable({
  providedIn: 'root'
})
export class TaskDataService {
  private firestore: Firestore = inject(Firestore);

  // コレクション参照の宣言
  private projectsCollection = collection(this.firestore, 'projects');
  private tasksCollection = collection(this.firestore, 'tasks');
  private sidePocketCollection = collection(this.firestore, 'side_pocket_memos');

  // Observable の宣言 (Firestoreとのリアルタイム同期)
  readonly projects$: Observable<ParentProject[]> = 
    collectionData(this.projectsCollection, { idField: 'id' }) as Observable<ParentProject[]>;
  readonly tasks$: Observable<Task[]> = 
    collectionData(this.tasksCollection, { idField: 'id' }) as Observable<Task[]>;
  readonly sidePocketMemos$: Observable<SidePocketMemo[]> = (
    collectionData(this.sidePocketCollection, { idField: 'id' }) as Observable<SidePocketMemo[]>
  ).pipe(
    map(memos => memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  );

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

  // --- SidePocket CRUD処理 (Firestore永続化) ---
  async addSidePocketMemo(memo: { content: string; createdAt: string; parentProjectId?: string }): Promise<string> {
    const cleaned = JSON.parse(JSON.stringify(memo));
    const docRef = await addDoc(this.sidePocketCollection, cleaned);
    return docRef.id;
  }

  async deleteSidePocketMemo(id: string): Promise<void> {
    if (!id) return;
    const docRef = doc(this.firestore, `side_pocket_memos/${id}`);
    await deleteDoc(docRef);
  }

  // --- Project CRUD処理 ---
  async addProject(project: Omit<ParentProject, 'id'>): Promise<string> {
    const cleaned = JSON.parse(JSON.stringify(project));
    const docRef = await addDoc(this.projectsCollection, cleaned);
    return docRef.id;
  }

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

  // --- Task CRUD処理 ---
  async addTask(task: Omit<Task, 'id'>): Promise<string> {
    const cleaned = JSON.parse(JSON.stringify(task));
    const docRef = await addDoc(this.tasksCollection, cleaned);
    return docRef.id;
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
}