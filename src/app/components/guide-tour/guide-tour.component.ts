import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ガイドツアーのステップ定義
 */
export interface GuideTourStep {
  stepNumber: number;
  dataSelector: string;      // data-tour="step-X" の値
  title: string;             // 絵文字付きタイトル
  description: string;       // 説明文
}

/**
 * スポットライトのターゲット情報
 */
interface SpotlightTarget {
  element: HTMLElement;
  rect: DOMRect;
}

@Component({
  selector: 'app-guide-tour',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guide-tour.component.html',
  styleUrl: './guide-tour.component.css'
})
export class GuideTourComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isOpen = false;
  @Output() closeRequested = new EventEmitter<void>();

  @ViewChild('spotlightOverlay') spotlightOverlay?: ElementRef<HTMLDivElement>;
  @ViewChild('popoverCard') popoverCard?: ElementRef<HTMLDivElement>;

  /**
   * ガイドツアーの全ステップ
   */
  steps: GuideTourStep[] = [
    {
      stepNumber: 1,
      dataSelector: 'step-1',
      title: '📁 画面切り替え',
      description: '課題管理（カンバン/ガントチャート等）と、AIが過去7日間の実績を分析する「AIウィークリーレビュー」をいつでもワンクリックで切り替えられます。'
    },
    {
      stepNumber: 2,
      dataSelector: 'step-2',
      title: '📊 カンバン ↔ ガントチャート',
      description: 'プロジェクトのタスクをカンバンボードとガントチャートでリアルタイムに表示切替が可能です。'
    },
    {
      stepNumber: 3,
      dataSelector: 'step-3',
      title: '💡 未整理メモのAI自動整理',
      description: 'ふと思い浮かんだアイデアやタスクを即座にメモ。AIが既存の適切な親課題を自動推測してスマートに割り当てます。'
    },
    {
      stepNumber: 4,
      dataSelector: 'step-4',
      title: '🎯 集中モード (PiP機能)',
      description: '最前面の小窓（Picture-in-Picture）を起動！他の作業中も常にタスクを確認・操作できます。\n※ PC版 Google Chrome / Microsoft Edge にてお試しいただけます。'
    }
  ];

  /**
   * 現在のステップインデックス（0ベース）
   */
  currentStepIndex = 0;

  /**
   * 現在のスポットライトターゲット
   */
  spotlightTarget: SpotlightTarget | null = null;

  /**
   * ポップオーバーの位置情報
   */
  popoverPosition: { top: number; left: number } | null = null;

  /**
   * クリップパスの値
   */
  clipPathValue: string = '';

  /**
   * リサイズ・スクロール時の再計算タイマー
   */
  private resizeObserver: ResizeObserver | null = null;
  private scrollListener: (() => void) | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // キーボード操作のリスナー登録
    // @HostListener で処理するため、ここでは不要
  }

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.updateSpotlight();
      this.setupResizeObserver();
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.cleanupResizeObserver();
  }

  /**
   * isOpen の変更を検知してスポットライトを更新
   */
  ngOnChanges(): void {
    if (this.isOpen) {
      // 次フレームで要素が DOM に反映されるのを待つ
      setTimeout(() => {
        this.updateSpotlight();
        this.setupResizeObserver();
      }, 0);
    } else {
      this.cleanupResizeObserver();
    }
  }

  /**
   * スポットライトとポップオーバーの位置を更新
   */
  private updateSpotlight(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    // ターゲット要素を取得
    let targetElement = document.querySelector(
      `[data-tour="${currentStep.dataSelector}"]`
    ) as HTMLElement;

    // Step 3 の場合、サイドポケットが展開していなければ展開する
    if (currentStep.stepNumber === 3 && !targetElement) {
      const collapsedBar = document.querySelector('.side-pocket-collapsed') as HTMLElement;
      if (collapsedBar) {
        // サイドポケットを展開（折り畳みバーをクリック）
        collapsedBar.click();
        // アニメーション完了後に再試行
        setTimeout(() => {
          this.updateSpotlight();
        }, 350);
        return;
      }
    }

    if (!targetElement) {
      console.warn(`Target element not found: data-tour="${currentStep.dataSelector}"`);
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    this.spotlightTarget = { element: targetElement, rect };

    // クリップパス（スポットライト）の計算
    this.updateClipPath(rect);

    // ポップオーバーの位置計算
    this.calculatePopoverPosition(rect);

    this.cdr.detectChanges();
  }

  /**
   * クリップパスを計算して更新
   */
  private updateClipPath(rect: DOMRect): void {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const padding = 8; // スポットライト周辺のパディング
    const top = rect.top - padding;
    const left = rect.left - padding;
    const right = left + rect.width + padding * 2;
    const bottom = top + rect.height + padding * 2;

    // clip-path で外側を暗くするポリゴンを定義
    this.clipPathValue = `polygon(
      0 0, 
      0 100%, 
      100% 100%, 
      100% 0, 
      0 0, 
      ${left}px ${top}px, 
      ${right}px ${top}px, 
      ${right}px ${bottom}px, 
      ${left}px ${bottom}px, 
      ${left}px ${top}px
    )`;
  }

  /**
   * ポップオーバーの位置を計算
   * 画面外はみ出し防止 + 右端ターゲット時の自動反転対応
   */
  private calculatePopoverPosition(targetRect: DOMRect): void {
    const popoverWidth = 320; // ポップオーバーカードの幅（CSS と一致させる）
    const popoverHeight = 280; // ポップオーバーカードの高さ（推定）
    const margin = 16; // ターゲットからのマージン

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let top: number;
    let left: number;

    // ============================================
    // 水平位置（left）の計算
    // ============================================
    // ターゲットの右端が画面幅の70%を超えている場合（右端ターゲット）
    // → 吹き出しを左側に配置
    if (targetRect.right > windowWidth * 0.7) {
      // 左側配置：ターゲットの左から吹き出しを配置
      left = targetRect.left - popoverWidth - margin;
    } else {
      // 中央揃え（デフォルト）
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    }

    // ============================================
    // 垂直位置（top）の計算
    // ============================================
    // デフォルト：ターゲットの下側
    top = targetRect.top + targetRect.height + margin;

    // 下部が画面外の場合は上にシフト
    if (top + popoverHeight > windowHeight) {
      top = targetRect.top - popoverHeight - margin;
    }

    // ============================================
    // クランピング処理：画面枠内に強制
    // ============================================
    left = Math.max(16, Math.min(left, windowWidth - popoverWidth - 16));
    top = Math.max(16, Math.min(top, windowHeight - popoverHeight - 16));

    this.popoverPosition = { top, left };
  }

  /**
   * ResizeObserver でターゲット要素・ウィンドウサイズ変更を監視
   */
  private setupResizeObserver(): void {
    if (!this.spotlightTarget?.element) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateSpotlight();
    });

    this.resizeObserver.observe(this.spotlightTarget.element);

    // ウィンドウリサイズも監視
    if (!this.scrollListener) {
      this.scrollListener = () => {
        this.updateSpotlight();
      };
      window.addEventListener('scroll', this.scrollListener, true);
      window.addEventListener('resize', this.scrollListener);
    }
  }

  /**
   * ResizeObserver とイベントリスナーをクリーンアップ
   */
  private cleanupResizeObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener, true);
      window.removeEventListener('resize', this.scrollListener);
      this.scrollListener = null;
    }
  }

  /**
   * 次のステップへ進む
   */
  goToNextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      // アニメーション後にスポットライトを更新
      setTimeout(() => {
        this.updateSpotlight();
      }, 0);
    } else {
      // 最終ステップの次は閉じる
      this.closeTour();
    }
  }

  /**
   * 前のステップへ戻る
   */
  goToPreviousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      // アニメーション後にスポットライトを更新
      setTimeout(() => {
        this.updateSpotlight();
      }, 0);
    }
  }

  /**
   * ツアーを閉じる
   */
  closeTour(): void {
    this.closeRequested.emit();
    this.cleanupResizeObserver();
  }

  /**
   * 現在のステップ数を取得（1ベース）
   */
  get currentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  /**
   * 総ステップ数を取得
   */
  get totalSteps(): number {
    return this.steps.length;
  }

  /**
   * 現在のステップ情報を取得
   */
  get currentStep(): GuideTourStep {
    return this.steps[this.currentStepIndex];
  }

  /**
   * 最後のステップかどうかを判定
   */
  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  /**
   * Escキーで閉じる
   */
  @HostListener('document:keydown.escape')
  onKeyDown(): void {
    if (this.isOpen) {
      this.closeTour();
    }
  }
}
