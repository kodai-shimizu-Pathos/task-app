import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.html',
  styleUrl: './login-modal.css',
})
export class LoginModalComponent {
  private authService = inject(AuthService);

  @Output() closeModal = new EventEmitter<void>();

  isSignUp = false; // ログイン ↔ 新規登録の切替
  email = '';
  password = '';
  errorMessage = '';

  // Google ログイン
  async onGoogleLogin(): Promise<void> {
    try {
      this.errorMessage = '';
      await this.authService.loginWithGoogle();
      this.closeModal.emit();
    } catch (err: any) {
      this.errorMessage = 'Googleログインに失敗しました: ' + err.message;
    }
  }

  // Email/Password ログイン または 新規登録
  async onSubmitEmail(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'メールアドレスとパスワードを入力してください';
      return;
    }

    try {
      this.errorMessage = '';
      if (this.isSignUp) {
        await this.authService.registerWithEmail(this.email, this.password);
      } else {
        await this.authService.loginWithEmail(this.email, this.password);
      }
      this.closeModal.emit();
    } catch (err: any) {
      this.errorMessage = '認証に失敗しました: ' + err.message;
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }
}