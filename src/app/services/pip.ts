import { Injectable, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { PipInboxComponent } from '../components/pip-inbox/pip-inbox';

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
  }
}

/**
 * Picture-in-Picture（PiP）サービス
 * Document Picture-in-Picture API を使用した集中モード（浮遊ウィンドウ）管理
 */
@Injectable({
  providedIn: 'root'
})
export class PipService {
  private pipWindow: Window | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  /**
   * ブラウザが Document Picture-in-Picture API に対応しているか確認
   * @returns 対応している場合は true
   */
  isSupported(): boolean {
    return 'documentPictureInPicture' in window;
  }

  /**
   * PiP ウィンドウのトグル（開く/閉じる）
   */
  async togglePip(): Promise<void> {
    if (this.pipWindow) {
      this.closePip();
      return;
    }

    if (!this.isSupported()) {
      alert('お使いのブラウザは Document Picture-in-Picture API に対応していません。');
      return;
    }

    try {
      // 1. PiP ウィンドウを生成（幅 320px、高さ 52px）
      this.pipWindow = await window.documentPictureInPicture!.requestWindow({
        width: 320,
        height: 52
      });

      const pipDoc = this.pipWindow.document;

      // 2. PiP ウィンドウへステルス CSS を注入（ダーク背景で統一）
      const styleEl = pipDoc.createElement('style');
      styleEl.textContent = `
        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        html, body {
          width: 100% !important;
          height: 100% !important;
          background-color: #111318 !important; /* 背景色と同化 */
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        app-pip-inbox {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* 外枠コンテナ */
        .stealth-container {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
          padding: 6px 10px !important;
          background-color: #111318 !important;
          position: relative !important;
        }

        /* 一体型ステルスバー */
        .stealth-bar {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          height: 38px !important;
          background-color: #202124 !important; /* 暗い背景と同化 */
          border: 1px solid #262A36 !important;
          border-radius: 8px !important;
          padding: 0 6px 0 12px !important;
          transition: all 0.2s ease !important;
        }

        .stealth-bar.focused {
          border-color: #4F46E5 !important;
          background-color: #1E222D !important;
        }

        .stealth-bar.recording {
          border-color: #EF4444 !important;
        }

        /* 入力フォーム (白背景・白枠の完全抹消) */
        .stealth-input {
          flex: 1 !important;
          width: 100% !important;
          height: 100% !important;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          color: #D1D5DB !important;
          font-size: 13px !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
        }

        .stealth-input::placeholder {
          color: #4B5563 !important; /* 沈んだダークグレー */
          font-size: 12px !important;
        }

        /* マイクボタン */
        .stealth-mic {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 28px !important;
          height: 28px !important;
          border: none !important;
          outline: none !important;
          background: transparent !important;
          color: #4B5563 !important;
          cursor: pointer !important;
          border-radius: 6px !important;
          margin-left: 4px !important;
          transition: all 0.15s ease !important;
        }

        .stealth-mic:hover {
          color: #9CA3AF !important;
          background-color: rgba(255, 255, 255, 0.05) !important;
        }

        .stealth-mic.active {
          color: #FFFFFF !important;
          background-color: #EF4444 !important;
        }

        /* トースト通知 */
        .stealth-toast {
          position: absolute !important;
          right: 14px !important;
          bottom: 2px !important;
          font-size: 9px !important;
          color: #10B981 !important;
          font-weight: 500 !important;
        }
      `;
      pipDoc.head.appendChild(styleEl);

      // 3. PiP ウィンドウにコンポーネントをマウント
      const componentRef = createComponent(PipInboxComponent, {
        environmentInjector: this.injector
      });

      this.appRef.attachView(componentRef.hostView);

      const hostElement = componentRef.location.nativeElement as HTMLElement;
      pipDoc.body.appendChild(hostElement);

      componentRef.changeDetectorRef.detectChanges();

      this.pipWindow.addEventListener('pagehide', () => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        this.pipWindow = null;
      });

    } catch (err) {
      console.error('PiPウィンドウ起動エラー:', err);
    }
  }

  /**
   * PiP ウィンドウを閉じる
   */
  closePip(): void {
    if (this.pipWindow) {
      this.pipWindow.close();
      this.pipWindow = null;
    }
  }
}