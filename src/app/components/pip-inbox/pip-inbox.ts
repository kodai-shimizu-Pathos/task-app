import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None, // Angularのスタイルカプセル化を解除
  template: `
    <div class="stealth-container">
      <div class="stealth-bar" [class.focused]="isFocused" [class.recording]="isRecording">
        <input
          type="text"
          [(ngModel)]="inputText"
          (keydown.enter)="onSubmit()"
          (focus)="isFocused = true"
          (blur)="isFocused = false"
          placeholder="Add to Inbox..."
          class="stealth-input"
          autofocus
        />

        <button
          type="button"
          class="stealth-mic"
          [class.active]="isRecording"
          (click)="toggleVoiceInput()"
          [title]="isRecording ? '音声認識中...' : '音声入力'"
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

  inputText = '';
  isRecording = false;
  isFocused = false;
  showToast = false;
  private recognition: any = null;

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

  ngOnDestroy(): void {
    if (this.recognition) {
      this.recognition.stop();
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
      this.recognition.continuous = false;
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

      this.recognition.onend = () => {
        this.isRecording = false;
        this.cdr.detectChanges();
      };

      this.recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error);
        this.isRecording = false;
        this.cdr.detectChanges();
      };
    }
  }

  toggleVoiceInput(): void {
    if (!this.recognition) {
      alert('お使いのブラウザは音声認識機能に対応していません。');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      this.recognition.start();
      this.isRecording = true;
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