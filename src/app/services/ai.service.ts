import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ParentProject } from '../models/project.model';
import { DelayLog, DELAY_REASON_LABELS } from '../models/delay-log.model';

/** AI レビューのトーン設定 */
export type ReviewTone = 'sympathetic' | 'strict' | 'objective';

/**
 * AI サービス
 * Google Gemini API を使用したタスク分析、提案、ウィークリーレビュー生成
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly apiKey = environment.geminiApiKey;
  private readonly apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  constructor() {}

  /**
   * タスク完成後のサブタスク候補を自動生成
   * @param title タスクのタイトル
   * @param description タスクの詳細説明（オプション）
   * @returns サブタスク候補の文字列配列
   * @throws APIキーが未設定またはAPI呼び出しに失敗した場合
   */
  async generateSubtasks(title: string, description?: string): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Gemini API キーが設定されていません。environment.ts を確認してください。');
    }

    if (!title || !title.trim()) {
      throw new Error('タスクのタイトルは必須です。');
    }

    const prompt = this.buildPrompt(title, description);

    try {
      const url = `${this.apiEndpoint}?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Gemini API エラーレスポンス:', responseText);
        throw new Error(`Gemini API エラー (${response.status}): ${response.statusText}`);
      }

      const data = JSON.parse(responseText);
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('Gemini APIからのレスポンスが無効です。');
      }

      return this.parseSubtasksJson(textContent);
    } catch (error) {
      console.error('AiService.generateSubtasks エラー:', error);
      throw error;
    }
  }

  /**
   * サイドポケットのメモから最適な親課題を自動推測
   * @param memoContent メモの内容
   * @param projects 既存の親課題リスト
   * @returns 推測される親課題ID、提案タイトル、選定理由
   */
  async predictParentProject(
    memoContent: string,
    projects: ParentProject[]
  ): Promise<{ projectId: string | null; suggestedTaskTitle: string; reason: string }> {
    if (!this.apiKey) {
      throw new Error('Gemini API キーが設定されていません。');
    }

    if (!memoContent || !memoContent.trim()) {
      throw new Error('メモの内容が空です。');
    }

    if (!projects || projects.length === 0) {
      return { projectId: null, suggestedTaskTitle: memoContent, reason: '親課題が存在しません。' };
    }

    const projectsSummary = projects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description || ''
    }));

    const prompt = `未整理のメモ「${memoContent}」を、以下の既存親課題リストの中から最も関連性の高い親課題に割り当ててください。

親課題リスト:
${JSON.stringify(projectsSummary, null, 2)}

レスポンスは以下の JSON オブジェクト形式のみで返してください（余計な解説文やMarkdown装飾は不可）。
関連性が高い親課題がある場合:
{"projectId": "該当する親課題のid", "suggestedTaskTitle": "推測される整理されたタスク名", "reason": "選定理由"}

どの親課題にも該当しない場合:
{"projectId": null, "suggestedTaskTitle": "${memoContent}", "reason": "該当する親課題が見つかりませんでした"}`;

    try {
      const url = `${this.apiEndpoint}?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Gemini API エラーレスポンス:', responseText);
        throw new Error(`Gemini API エラー (${response.status}): ${response.statusText}`);
      }

      const data = JSON.parse(responseText);
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('Gemini APIからのレスポンスが無効です。');
      }

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSONが見つかりませんでした。');
      }

      const parsed = JSON.parse(jsonMatch);
      return {
        projectId: parsed.projectId || null,
        suggestedTaskTitle: parsed.suggestedTaskTitle || memoContent,
        reason: parsed.reason || ''
      };
    } catch (error) {
      console.error('AiService.predictParentProject エラー:', error);
      throw error;
    }
  }

  /**
   * Gemini API 用プロンプトを構築
   * @param title タスクのタイトル
   * @param description タスクの説明（オプション）
   * @returns フォーマットされたプロンプト文字列
   * @private
   */
  private buildPrompt(title: string, description?: string): string {
    const descriptionPart = description ? ` (詳細: ${description})` : '';
    return `タスク「${title}」${descriptionPart} を分解した具体的なサブタスクを3〜5件作成してください。

【出力フォーマット】
必ず以下の純粋な JSON 配列形式のみで出力してください（説明文やMarkdown装飾は含めないでください）。
["サブタスク1", "サブタスク2", "サブタスク3"]`;
  }

  /**
   * Gemini レスポンスから JSON 配列をパース
   * @param responseText Gemini API のレスポンステキスト
   * @returns パースされたサブタスク配列
   * @throws JSON パースに失敗した場合
   * @private
   */
  private parseSubtasksJson(responseText: string): any[] {
    let jsonString = responseText.trim();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
  
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('JSONのパースに失敗しました');
    }
  
    if (!Array.isArray(parsed)) {
      throw new Error('配列形式のJSONではありません');
    }
  
    // ChecklistItem 型の定義に合わせて text プロパティに文字列をセットする
    return parsed.map(item => {
      if (typeof item === 'string') {
        return item; // task-form.ts 側の generateSubtasksWithAi で text: subtaskText に変換されます
      }
      
      if (typeof item === 'object' && item !== null) {
        // text, title, name のいずれかから文字列を取得
        return item.text || item.title || item.name || item.taskName || '無題のサブタスク';
      }
  
      return String(item);
    });
  }

  /**
   * API 呼び出しのリトライ処理（指数バックオフ対応）
   * @param url リクエストURL
   * @param options Fetch オプション
   * @param retries リトライ回数（デフォルト 3）
   * @param delay 初期待機時間（ミリ秒、デフォルト 2000）
   * @returns Fetch レスポンス
   * @throws リトライ上限に達した場合
   * @private
   */
  private async fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);

      // 503 (UNAVAILABLE) の場合は一時的な混雑なので指定時間待ってリトライ
      if (response.status === 503 && i < retries - 1) {
        console.warn(`Gemini API 503エラー。${delay / 1000}秒後に再試行します... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
        continue;
      }

      return response;
    }
    throw new Error('Gemini API リトライ上限に達しました');
  }

  /**
   * 過去1週間の成果と遅延ログを基にウィークリーレビューを自動生成
   * @param completedTaskCount 完了したタスク数
   * @param delayLogs 遅延ログの配列
   * @param tone レビューのトーン（共感的/厳密/客観的）
   * @returns 生成されたレビュー文字列（Markdown フォーマット）
   * @throws API キーが未設定またはAPI呼び出しに失敗した場合
   */
  async generateWeeklyReview(
    completedTaskCount: number,
    delayLogs: DelayLog[],
    tone: ReviewTone = 'sympathetic'
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API キーが設定されていません。');
    }

    // 遅延理由ごとの集計
    const reasonCounts: Record<string, number> = {};
    delayLogs.forEach(log => {
      const label = DELAY_REASON_LABELS[log.reason]?.label || log.reason;
      reasonCounts[label] = (reasonCounts[label] || 0) + 1;
    });

    const toneInstructionMap: Record<ReviewTone, string> = {
      sympathetic: 'ユーザーに徹底的に寄り添い、頑張りを褒め、失敗や遅延にも共感しながら前向きな改善策をアドバイスする親しみやすい口調',
      strict: '甘えを許さず、データと事実に基づいて課題を鋭く指摘し、次週の目標達成に向けた改善策を求めるストイックでプロフェッショナルな口調',
      objective: '感情を挟まず、完了数と遅延要因のデータを客観的・構造的に分析し、効率化に向けたロジカルな改善アクションを提示する口調'
    };

    const prompt = `あなたはユーザーのタスク管理と目標達成を支えるAIパートナーです。
  過去1週間の作業実績データを基に、振り返りレビューと来週へのアドバイスを作成してください。

  【今週の実績データ】
  ・1週間の完了タスク数: ${completedTaskCount} 件
  ・遅延理由ログの内訳:
  ${Object.keys(reasonCounts).length > 0 
    ? Object.entries(reasonCounts).map(([reason, count]) => `  - \\({reason}: \\){count}件`).join('\n')
    : '  - 遅延ログなし（非常に順調）'}

  【指示事項】
  ・トーン＆マナー: ${toneInstructionMap[tone]}
  ・構成:
    1. 今週の成果と頑張りに対する評価 (2〜3行)
    2. 遅延要因データの傾向分析とボトルネックの指摘 (2〜3行)
    3. 来週に向けた具体的なアクションアドバイス (2〜3行)
  ・Markdown装飾（見出しや箇条書き）を使って読みやすくフォーマットしてください。`;

    try {
      const url = `${this.apiEndpoint}?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Gemini API エラー (${response.status}): ${response.statusText}`);
      }

      const data = JSON.parse(responseText);
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('Gemini APIからのレビュー生成レスポンスが無効です。');
      }

      return textContent;
    } catch (error) {
      console.error('AiService.generateWeeklyReview エラー:', error);
      throw error;
    }
  }
}