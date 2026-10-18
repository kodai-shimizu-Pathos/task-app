import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { ParentProject } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly apiKey = environment.geminiApiKey;
  private readonly apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  constructor() {}

  /**
   * サブタスク候補の自動生成
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
   * 未整理メモの自動親課題推測
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
   * プロンプト構成 (明確にフォーマットを指定)
   */
  private buildPrompt(title: string, description?: string): string {
    const descriptionPart = description ? ` (詳細: ${description})` : '';
    return `タスク「${title}」${descriptionPart} を分解した具体的なサブタスクを3〜5件作成してください。

【出力フォーマット】
必ず以下の純粋な JSON 配列形式のみで出力してください（説明文やMarkdown装飾は含めないでください）。
["サブタスク1", "サブタスク2", "サブタスク3"]`;
  }

  /**
   * 堅牢な JSON 配列パース (フォールバック付き)
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

  private async fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      const response = await fetch(url, options);
      
      // 503 (UNAVAILABLE) の場合は一時的な混雑なので指定時間待ってリトライ
      if (response.status === 503 && i < retries - 1) {
        console.warn(`Gemini API 503エラー。${delay / 1000}秒後に再試行します... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // 待機時間を少しずつ伸ばす（指数バックオフ）
        continue;
      }
      
      return response;
    }
    throw new Error('Gemini API リトライ上限に達しました');
  }
}