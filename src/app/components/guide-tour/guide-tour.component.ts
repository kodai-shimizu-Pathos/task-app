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
  AfterViewInit,
  OnChanges,
  SimpleChanges
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
export class GuideTourComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() isOpen = false;
  @Output() closeRequested = new EventEmitter<void>();

  @ViewChild('spotlightOverlay') spotlightOverlay?: ElementRef<HTMLDivElement>;
  @ViewChild('popoverCard') popoverCard?: ElementRef<HTMLDivElement>;

  /**
   * ガイドツアーの全ステップ（インプット ➔ ストック/整理の順に最適化）
   */
  steps: GuideTourStep[] = [
    {
      stepNumber: 1,
      dataSelector: 'step-1',
      title: '📁 メインビュー切替',
      description: '日常のタスクを管理する「課題管理」と、過去7日間の実績をAIが分析する「AIウィークリーレビュー（β版）」をワンクリックで切り替えられます。'
    },
    {
      stepNumber: 2,
      dataSelector: 'step-2',
      title: '📊 3つの表示モード（カンバン / ガント / リスト）',
      description: 'カンバンやガントチャートで「課題ごとの進捗や計画」を視覚的に把握し、リストで「課題を横断した優先処理順」を一覧チェック！目的に合わせてスムーズに切り替えられます。'
    },
    {
      stepNumber: 3,
      dataSelector: 'step-4', // 集中モードボタンへスポットライト
      title: '🎯 集中モード (PiP機能)',
      description: '最前面に常駐するメモ入力用の小窓（Picture-in-Picture）を起動！他のアプリでの作業中も思考を中断せずメモを入力でき、内容は即座に「サイドポケット」へ送られます。\n※ PC版 Google Chrome / Microsoft Edge 等に対応'
    },
    {
      stepNumber: 4,
      dataSelector: 'step-3', // サイドポケットパネルへスポットライト
      title: '💡 サイドポケットメモ',
      description: '集中モードや手動で書き留めたメモが集まる場所。溜まったメモは後からタスクへ昇格させたり、親課題のメモとして簡単に整理・活用できます。'
    }
  ];

  currentStepIndex = 0;
  spotlightTarget: SpotlightTarget | null = null;
  popoverPosition: { top: number; left: number } | null = null;
  clipPathValue: string = '';

  private resizeObserver: ResizeObserver | null = null;
  private scrollListener: (() => void) | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

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

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isOpen) {
      setTimeout(() => {
        this.updateSpotlight();
        this.setupResizeObserver();
      }, 0);
    } else {
      this.cleanupResizeObserver();
    }
  }

  private updateSpotlight(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    let targetElement = document.querySelector(
      `[data-tour="${currentStep.dataSelector}"]`
    ) as HTMLElement;

    // サイドポケット（Step 4）の場合、折り畳まれていれば展開する
    if (currentStep.stepNumber === 4 && !targetElement) {
      const collapsedBar = document.querySelector('.side-pocket-collapsed') as HTMLElement;
      if (collapsedBar) {
        collapsedBar.click();
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

    this.updateClipPath(rect);
    this.calculatePopoverPosition(rect);

    this.cdr.detectChanges();
  }

  private updateClipPath(rect: DOMRect): void {
    const padding = 8;
    const top = rect.top - padding;
    const left = rect.left - padding;
    const right = left + rect.width + padding * 2;
    const bottom = top + rect.height + padding * 2;

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

  private calculatePopoverPosition(targetRect: DOMRect): void {
    const popoverWidth = 320;
    const popoverHeight = 280;
    const margin = 16;

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    let top: number;
    let left: number;

    if (targetRect.right > windowWidth * 0.7) {
      left = targetRect.left - popoverWidth - margin;
    } else {
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    }

    top = targetRect.top + targetRect.height + margin;

    if (top + popoverHeight > windowHeight) {
      top = targetRect.top - popoverHeight - margin;
    }

    left = Math.max(16, Math.min(left, windowWidth - popoverWidth - 16));
    top = Math.max(16, Math.min(top, windowHeight - popoverHeight - 16));

    this.popoverPosition = { top, left };
  }

  private setupResizeObserver(): void {
    if (!this.spotlightTarget?.element) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateSpotlight();
    });

    this.resizeObserver.observe(this.spotlightTarget.element);

    if (!this.scrollListener) {
      this.scrollListener = () => {
        this.updateSpotlight();
      };
      window.addEventListener('scroll', this.scrollListener, true);
      window.addEventListener('resize', this.scrollListener);
    }
  }

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

  goToNextStep(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      setTimeout(() => {
        this.updateSpotlight();
      }, 0);
    } else {
      this.closeTour();
    }
  }

  goToPreviousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      setTimeout(() => {
        this.updateSpotlight();
      }, 0);
    }
  }

  closeTour(): void {
    this.closeRequested.emit();
    this.cleanupResizeObserver();
  }

  get currentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  get currentStep(): GuideTourStep {
    return this.steps[this.currentStepIndex];
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  @HostListener('document:keydown.escape')
  onKeyDown(): void {
    if (this.isOpen) {
      this.closeTour();
    }
  }
}