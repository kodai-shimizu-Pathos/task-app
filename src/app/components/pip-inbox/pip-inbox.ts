import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskDataService } from '../../services/task-data';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Component({
  selector: 'app-pip-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="stealth-container">
      <div class="stealth-bar" [class.focused]="isFocused" [class.recording]="isRecording">
        <input
          type="text"
          [(ngModel)]="inputText"
          (keydown)="onInputKeyDown($event)"
          (focus)="isFocused = true"
          (blur)="isFocused = false"
          [placeholder]="isRecording ? '🎤 録音中... [無音で自動送信 / Spaceキーで即時送信]' : 'Add to Inbox...'"
          class="stealth-input"
          autofocus
        />

        <button
          type="button"
          class="stealth-mic"
          [class.active]="isRecording"
          (click)="toggleVoiceInput()"
          [title]="isRecording ? 'タップで停止＆送信' : '1クリックで音声入力開始'"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
        </button>
      </div>

      <div class="stealth-toast" *ngIf="showToast">
        ✓ Saved to Side Pocket
      </div>
    </div>
  `
})
export class PipInboxComponent implements OnInit, OnDestroy {
  private dataService = inject(TaskDataService);
  private cdr = inject(ChangeDetectorRef);
  private el = inject(ElementRef);

  inputText = '';
  isRecording = false;
  isFocused = false;
  showToast = false;
  
  private recognition: any = null;
  private targetWindow: Window | null = null;

  ngOnInit(): void {
    this.initSpeechRecognition();
    this.setupPipWindowEvents();
  }

  ngOnDestroy(): void {
    this.cleanupPipWindowEvents();
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // PiPサブウィンドウのキーイベント登録
  private setupPipWindowEvents(): void {
    const doc = this.el.nativeElement.ownerDocument;
    this.targetWindow = doc ? (doc.defaultView || window) : window;

    if (this.targetWindow) {
      this.targetWindow.addEventListener('keydown', this.handleKeyDown);
    }
  }

  private cleanupPipWindowEvents(): void {
    if (this.targetWindow) {
      this.targetWindow.removeEventListener('keydown', this.handleKeyDown);
      this.targetWindow = null;
    }
  }

  // ★ ② パターン2：録音中に Space 1回押し または Enter で即時確定・送信
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isRecording && (event.code === 'Space' || event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      this.stopAndSubmit();
    }
  };

  // 通常テキスト入力時の Enter 送信
  onInputKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isRecording) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  onSubmit(): void {
    const trimmed = this.inputText.trim();
    if (!trimmed) return;

    this.dataService.addSidePocketMemo({
      content: trimmed,
      createdAt: new Date().toISOString()
    });

    this.inputText = '';
    this.triggerToast();
  }

  private initSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false; // 無音検知で自発的にonendを呼ぶ設定
      this.recognition.interimResults = true;
      this.recognition.lang = 'ja-JP';

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        this.inputText = transcript;
        this.cdr.detectChanges();
      };

      // ★ ① パターン1：喋り終わり（無音検知）で自動停止＆送信
      this.recognition.onend = () => {
        this.isRecording = false;
        if (this.inputText.trim()) {
          this.onSubmit();
        }
        this.cdr.detectChanges();
      };

      this.recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error);
        this.isRecording = false;
        this.cdr.detectChanges();
      };
    }
  }

  // 手動即時送信処理
  private stopAndSubmit(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop(); // stopを呼ぶとonendが発火して自動的にonSubmitされる
    }
  }

  toggleVoiceInput(): void {
    if (!this.recognition) {
      alert('お使いのブラウザは音声認識機能に対応していません。');
      return;
    }

    if (this.isRecording) {
      this.stopAndSubmit();
    } else {
      this.inputText = '';
      this.isRecording = true;
      this.recognition.start();
      this.cdr.detectChanges();
    }
  }

  private triggerToast(): void {
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToast = false;
      this.cdr.detectChanges();
    }, 1500);
  }
}