import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export type MainView = 'tasks' | 'review';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  authService = inject(AuthService); // ★ AuthService を注入

  @Input() activeView: MainView = 'tasks';

  @Output() viewChange = new EventEmitter<MainView>();
  @Output() toggleConcentrationMode = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() openLoginModal = new EventEmitter<void>(); // ★ ログインモーダル呼び出し用

  onSelectView(view: MainView): void {
    this.viewChange.emit(view);
  }

  onToggleConcentrationMode(): void {
    this.toggleConcentrationMode.emit();
  }

  // ログアウト処理
  async onLogout(): Promise<void> {
    if (confirm('ログアウトしますか？')) {
      await this.authService.logout();
    }
  }
}
