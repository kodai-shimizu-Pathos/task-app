# 🤖 AIサブタスク自動分解機能 - セットアップガイド

## 概要

Gemini APIを活用した「AIサブタスク自動分解機能」が実装されました。タスク登録・編集画面のタイトル・概要からAIが最適なサブタスク案を推測し、チェックリストへ自動注入します。

---

## ✅ 実装完了

### 1. AiService の作成
- **ファイル**: `src/app/services/ai.service.ts`
- **機能**:
  - Gemini API 呼び出しメソッド `generateSubtasks(title, description)` 
  - JSON レスポンスのパース処理
  - エラーハンドリング

### 2. environment 設定の更新
- **ファイル**: 
  - `src/environments/environment.ts`
  - `src/environments/environment.development.ts`
- **追加**: `geminiApiKey` 設定値

### 3. TaskForm への AI 機能統合
- **ファイル**: `src/app/components/task-form/task-form.ts`
- **追加機能**:
  - `AiService` の DI（依存性注入）
  - `isGeneratingAi: boolean` フラグ
  - `generateSubtasksWithAi()` メソッド
  - 自動生成されたチェックリスト項目の追加
  - 進捗率の自動再計算

### 4. UI 更新
- **HTML** (`task-form.html`):
  - チェックリストヘッダーに「🤖 AIで分解」ボタンを配置
  - 生成中に「🤖 生成中...」へ表示変更
  - ボタン無効化

- **CSS** (`task-form.css`):
  - `.checklist-header`: ラベルとボタンを並置するフレックスレイアウト
  - `.btn-ai-decompose`: インディゴカラーで目立つボタンスタイル
  - `:disabled` 状態の視覚化

---

## 🔑 Gemini API キーの設定

### 必須ステップ

1. **Google AI Studio から API キーを取得**
   - [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
   - 「Create API Key」をクリック

2. **環境ファイルに設定**

   ```typescript
   // src/environments/environment.ts
   export const environment = {
     production: false,
     firebase: { /* ... */ },
     geminiApiKey: "YOUR_ACTUAL_API_KEY_HERE" // ここに API キーを貼り付け
   };

   // src/environments/environment.development.ts（開発環境用）
   export const environment = {
     production: false,
     firebase: { /* ... */ },
     geminiApiKey: "YOUR_ACTUAL_API_KEY_HERE" // 開発環境用 API キー
   };
   ```

3. **セキュリティの考慮**
   - 本番環境では、API キーをフロントエンドに直接埋め込まないでください
   - バックエンドプロキシを使用することを推奨します
   - `.gitignore` に環境ファイルを追加してください

---

## 📖 使用方法

### ユーザー操作フロー

1. タスク登録・編集画面を開く
2. **タスク名** を入力（必須）
3. **説明** を入力（オプション、より詳細な分解が可能）
4. チェックリストセクションの **「🤖 AIで分解」** ボタンをクリック
5. 数秒待機（「生成中...」表示）
6. 自動生成されたサブタスク（3～5件）がチェックリストに追加される
7. 必要に応じて、手動でサブタスクを追加・編集・削除

### 自動機能

- ✅ **進捗率自動計算**: チェックリスト追加時に `progress` を再計算
- ✅ **ステータス自動連動**: 
  - 完了数に応じて `status` を自動更新
  - 全て完了 → `done`
  - 一部完了 → `in-progress`
  - 全て未完了 → `todo`

---

## 🔧 プロンプト例

### 生成される AI プロンプト

```
タスク「ログイン画面の実装」（詳細: React コンポーネント、OAuth 認証、2要素認証対応）
を達成するために必要な具体的なサブタスクを3〜5件の日本語文字列配列
（JSON配列形式: ["手順1", "手順2"]）で返してください。
余計な解説文やMarkdown装飾は含めず、純粋なJSON配列のみを返してください。
```

### Gemini の応答例

```json
[
  "認証フロー設計とUI/UX仕様の作成",
  "ログインフォームコンポーネントの実装",
  "OAuth 認証システムの統合",
  "2要素認証(2FA)ロジックの実装",
  "エラーハンドリングとテストの実施"
]
```

---

## ⚠️ エラーハンドリング

### よくあるエラーと対応

| エラー | 原因 | 対応 |
|--------|------|------|
| `Gemini API キーが設定されていません` | API キーが `environment.ts` に設定されていない | 環境ファイルにキーを追加 |
| `タスク名を入力してからAI分解を実行してください` | タイトル入力なしでボタン押下 | タスク名を入力してから実行 |
| `Gemini API エラー: 429` | API レート制限 | 少し待機してから再試行 |
| `レスポンスのパースに失敗しました` | JSON フォーマットが不正 | API キーと設定を確認 |

---

## 📋 チェックリスト

実装が完全であることを確認するには：

- [ ] `src/app/services/ai.service.ts` が作成されている
- [ ] `src/environments/environment.ts` に `geminiApiKey` が追加されている
- [ ] `src/environments/environment.development.ts` に `geminiApiKey` が追加されている
- [ ] `task-form.ts` で `AiService` が DI されている
- [ ] `task-form.ts` に `generateSubtasksWithAi()` メソッドがある
- [ ] `task-form.html` に「🤖 AIで分解」ボタンがある
- [ ] `task-form.css` に `.btn-ai-decompose` スタイルがある
- [ ] ビルド時に TypeScript コンパイルエラーがない

---

## 🚀 開発時のテスト

### ローカルテスト方法

```bash
# 1. プロジェクトをビルド
npm run build

# 2. dev サーバーを起動
ng serve

# 3. ブラウザで http://localhost:4200 にアクセス
# 4. 新規タスク作成または編集画面を開く
# 5. タスク名を入力して「🤖 AIで分解」ボタンをクリック
```

### デバッグ時のコンソール出力

- `console.log()` で API リクエスト・レスポンスを確認
- ブラウザの Network タブで Gemini API への HTTP リクエストを監視
- `alert()` メッセージでエラー内容を確認

---

## 📞 サポート

実装に関する質問や問題が発生した場合：

1. **TypeScript コンパイルエラー**: 型定義を確認してください
2. **API エラー**: 環境ファイルの API キーを確認してください
3. **JSON パースエラー**: Gemini のレスポンス形式を確認してください

---

## 🔐 本番環境への移行

本番環境で使用する場合：

1. **API キーの管理**:
   - 環境変数 (`process.env`, `$ENV` など) を使用
   - バックエンド API プロキシの実装
   - API ゲートウェイ（Firebase Functions など）の活用

2. **レート制限対応**:
   - キャッシング機構の実装
   - バックエンドでのキー管理
   - ユーザーごとのクォータ設定

3. **監視・ログ**:
   - API 使用量の追跡
   - エラーログの記録
   - パフォーマンスメトリクスの取得

---

**実装完了日**: 2026-10-16  
**バージョン**: 1.0.0
