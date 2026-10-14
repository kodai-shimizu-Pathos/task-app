import { Injectable, inject, Injector } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ParentProject } from '../models/project.model';
import { Task } from '../models/task.model';

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

  constructor() {
    // Injection context が確立されている状態で初期化
    this.projectsCollection = collection(this.firestore, 'projects');
    this.tasksCollection = collection(this.firestore, 'tasks');
    this.projects$ = collectionData(this.projectsCollection, { idField: 'id' }) as Observable<ParentProject[]>;
    this.tasks$ = collectionData(this.tasksCollection, { idField: 'id' }) as Observable<Task[]>;
  }

  getProjects(): Observable<ParentProject[]> {
    return this.projects$;
  }

  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  // --- CRUD処理 ---
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