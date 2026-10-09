import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MainView ='kanban' | 'gantt' | 'calendar' | 'review';

@Component({
  selector: 'app-shell',
  imports: [CommonModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  /** 現在アクティブなメインビュー */
  @Input() activeView: MainView = 'kanban';

  /** 各種イベント通知 */
  @Output() viewChange = new EventEmitter<MainView>();
  @Output() toggleConcentrationMode = new EventEmitter<void>();
  @Output() openSettings = new EventEmitter<void>();

  onSelectView(view: MainView): void {
    this.viewChange.emit(view);
  }

  onToggleConcentrationMode(): void {
    this.toggleConcentrationMode.emit();
  }

  onOpenSettings(): void {
    this.openSettings.emit();
  }
}
