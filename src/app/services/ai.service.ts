import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly apiKey = environment.geminiApiKey;
  private readonly apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor() {}

  /**
   * Gemini APIを呼び出してサブタスク候補を生成
   * @param title タスクのタイトル
   * @param description タスクの詳細説明（オプション）
   * @returns サブタスク文字列の配列
   */
  async generateSubtasks(title: string, description?: string): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Gemini API キーが設定されていません。environment.ts を確認してください。');
    }

    if (!title || !title.trim()) {
      throw new Error('タスクのタイトルは必須です。');
    }

    // プロンプト構成
    const prompt = this.buildPrompt(title, description);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API エラー:', errorData);
        throw new Error(`Gemini API エラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // レスポンスからテキストを抽出
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('Gemini APIからのレスポンスが無効です。');
      }

      // JSON配列をパース
      const subtasks = this.parseSubtasksJson(textContent);
      return subtasks;
    } catch (error) {
      console.error('AiService.generateSubtasks エラー:', error);
      throw error;
    }
  }

  /**
   * プロンプトを組み立てる
   */
  private buildPrompt(title: string, description?: string): string {
    const descriptionPart = description ? `詳細: ${description}` : '詳細: なし';
    
    return `タスク「${title}」（${descriptionPart}）を達成するために必要な具体的なサブタスクを3〜5件の日本語文字列配列（JSON配列形式: ["手順1", "手順2"]）で返してください。余計な解説文やMarkdown装飾は含めず、純粋なJSON配列のみを返してください。`;
  }

  /**
   * Gemini のレスポンスから JSON 配列をパースして抽出
   */
  private parseSubtasksJson(responseText: string): string[] {
    try {
      // JSON配列パターンを正規表現で抽出
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('レスポンスに JSON 配列が見つかりません。');
      }

      const jsonString = jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      // 配列であることを確認
      if (!Array.isArray(parsed)) {
        throw new Error('パース結果が配列ではありません。');
      }

      // 文字列配列であることを確認し、フィルタリング
      const subtasks = parsed
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);

      if (subtasks.length === 0) {
        throw new Error('有効なサブタスクが抽出できませんでした。');
      }

      return subtasks;
    } catch (error) {
      console.error('JSON パース エラー:', error, 'レスポンス:', responseText);
      throw new Error(`レスポンスのパースに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
