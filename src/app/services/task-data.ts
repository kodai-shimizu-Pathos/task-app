import { Injectable, inject, Injector } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
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
  private injector: Injector = inject(Injector);

  // コレクション参照の宣言
  private projectsCollection!: any;
  private tasksCollection!: any;

  // Observable の宣言
  readonly projects$!: Observable<ParentProject[]>;
  readonly tasks$!: Observable<Task[]>;

// TaskDataService 内の確認・追加メソッド
private sidePocketSubject = new BehaviorSubject<SidePocketMemo[]>([]);
public sidePocketMemos$ = this.sidePocketSubject.asObservable();

addSidePocketMemo(memo: { content: string; createdAt: string }): void {
  const newMemo: SidePocketMemo = {
    id: `memo-${Date.now()}`,
    ...memo
  };
  const current = this.sidePocketSubject.getValue();
  this.sidePocketSubject.next([newMemo, ...current]);
}

deleteSidePocketMemo(id: string): void {
  const current = this.sidePocketSubject.getValue();
  this.sidePocketSubject.next(current.filter(m => m.id !== id));
}

  constructor() {
    // Injection context が確立されている状態で初期化
    this.projectsCollection = collection(this.firestore, 'projects');
    this.tasksCollection = collection(this.firestore, 'tasks');
    this.projects$ = collectionData(this.projectsCollection, { idField: 'id' }) as Observable<ParentProject[]>;
    this.tasks$ = collectionData(this.tasksCollection, { idField: 'id' }) as Observable<Task[]>;
  }

  // --- データの取得 ---
  getProjects(): Observable<ParentProject[]> {
    return this.projects$;
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
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
    return new Promise((resolve, reject) => {
      try {
        const docRef = doc(this.firestore, `projects/${id}`);
        updateDoc(docRef, cleaned).then(() => resolve()).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
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
    return new Promise((resolve, reject) => {
      try {
        const docRef = doc(this.firestore, `tasks/${id}`);
        updateDoc(docRef, cleaned).then(() => resolve()).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async deleteTask(id: string): Promise<void> {
    const docRef = doc(this.firestore, `tasks/${id}`);
    await deleteDoc(docRef);
  }
}