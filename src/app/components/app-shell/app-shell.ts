import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

/** メイン表示ビューのタイプ */
export type MainView = 'tasks' | 'review';

/**
 * アプリケーションシェルコンポーネント
 * 上部ナビゲーション、ビュー切り替え、認証機能を提供
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  authService = inject(AuthService);

  @Input() activeView: MainView = 'tasks';

  @Output() viewChange = new EventEmitter<MainView>();
  @Output() toggleConcentrationMode = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();
  @Output() openLoginModal = new EventEmitter<void>();

  /**
   * ビュー選択時の処理
   */
  onSelectView(view: MainView): void {
    this.viewChange.emit(view);
  }

  /**
   * 集中モード切り替えのイベント発行
   */
  onToggleConcentrationMode(): void {
    this.toggleConcentrationMode.emit();
  }

  /**
   * ログアウト処理
   */
  async onLogout(): Promise<void> {
    if (confirm('ログアウトしますか？')) {
      await this.authService.logout();
    }
  }
}

