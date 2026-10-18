# 🚀 クイックスタートガイド

## 30秒で始める AIサブタスク自動分解機能

### ステップ 1: Gemini API キーを取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) を開く
2. **「Create API Key」** をクリック
3. API キーをコピー

### ステップ 2: environment.ts を編集

```typescript
// src/environments/environment.ts (12行目)
export const environment = {
    production: false,
    firebase: { /* ... */ },
    geminiApiKey: "YOUR_GEMINI_API_KEY_HERE" // ← ここに貼り付け
};
```

同様に `src/environments/environment.development.ts` も更新

### ステップ 3: テスト

```bash
ng serve
```

ブラウザで `http://localhost:4200` を開く

### ステップ 4: 使用

1. 新規タスク作成画面を開く
2. **タスク名** を入力（例: "ログイン画面実装"）
3. **説明** を入力（オプション）
4. **「🤖 AIで分解」** ボタンをクリック
5. 自動生成されたサブタスクを確認 ✅

---

## 📁 実装済みファイル一覧

```
✅ src/app/services/ai.service.ts
✅ src/environments/environment.ts
✅ src/environments/environment.development.ts
✅ src/app/components/task-form/task-form.ts
✅ src/app/components/task-form/task-form.html
✅ src/app/components/task-form/task-form.css
```

---

## 🔍 コード位置速見表

| 機能 | ファイル | 行番号 |
|------|---------|-------|
| AI Service クラス | ai.service.ts | 1-120 |
| 非同期メソッド | ai.service.ts | 18-71 |
| JSON パース | ai.service.ts | 85-117 |
| DI 注入 | task-form.ts | 44 |
| AI ボタン | task-form.html | 80-87 |
| ボタンクリック | task-form.ts | 229-276 |
| スタイル定義 | task-form.css | 221-275 |

---

## ✨ 実装ハイライト

### ✅ 完全に型安全

- TypeScript で全て実装
- `Promise<string[]>` で型定義
- エラーハンドリング完備

### ✅ 自動化機能

- 進捗率自動計算
- ステータス自動連動
- UI状態自動管理

### ✅ ユーザーフレンドリー

- 直感的なボタンUI
- ローディング表示
- エラーアラート

---

## 🎯 次のステップ

### 本番環境への移行時

- [ ] API キーをバックエンドに移動
- [ ] レート制限を設定
- [ ] キャッシング機構を実装
- [ ] ログ・監視を設定

### 機能拡張時

- [ ] 複数言語サポート
- [ ] サブタスク数のカスタマイズ
- [ ] AI モデルの選択
- [ ] 履歴管理機能

---

**質問やトラブルは、`AI_SUBTASK_FEATURE_SETUP.md` と `IMPLEMENTATION_REPORT.md` を参照してください！**
