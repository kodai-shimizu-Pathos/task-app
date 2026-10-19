import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  User, 
  user, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);

  // ログイン状態を監視する Observable (未ログイン時は null)
  readonly user$: Observable<User | null> = user(this.auth);

  // 現在のユーザーIDを取得
  get currentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }

  // Googleログイン
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  // Email/Password ログイン
  async loginWithEmail(email: string, pass: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, pass);
  }

  // Email/Password 新規登録
  async registerWithEmail(email: string, pass: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, pass);
  }

  // ログアウト
  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}