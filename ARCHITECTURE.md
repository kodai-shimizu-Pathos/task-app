# 📊 アーキテクチャ概要

## システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ユーザーインターフェース                    │
│                      (task-form.html / CSS)                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ タスク作成・編集画面                                        │   │
│  │                                                             │   │
│  │ ┌──────────────────────────┐                              │   │
│  │ │ タスク名入力             │                              │   │
│  │ │ "ログイン画面実装"       │                              │   │
│  │ └──────────────────────────┘                              │   │
│  │                                                             │   │
│  │ ┌──────────────────────────┐                              │   │
│  │ │ 説明入力                 │                              │   │
│  │ │ "React・OAuth対応..."     │                              │   │
│  │ └──────────────────────────┘                              │   │
│  │                                                             │   │
│  │ ┌──────────────────────────┐  ┌──────────────────┐        │   │
│  │ │ 🤖 AIで分解              │  │ ＋ 追加          │        │   │
│  │ └──────────────────────────┘  └──────────────────┘        │   │
│  │            │                                              │   │
│  │            ▼ onClick                                       │   │
│  │ ┌──────────────────────────┐                              │   │
│  │ │ 🤖 生成中...             │  (ローディング状態)          │   │
│  │ │ [disabled]               │                              │   │
│  │ └──────────────────────────┘                              │   │
│  │                                                             │   │
│  │ チェックリスト表示領域                                    │   │
│  │ ┌─────────────────────────────────────────────────────┐   │   │
│  │ │ ☐ 認証フロー設計とUI/UX仕様の作成                     │   │   │
│  │ │ ☐ ログインフォームコンポーネントの実装                │   │   │
│  │ │ ☐ OAuth 認証システムの統合                           │   │   │
│  │ │ ☐ 2要素認証(2FA)ロジックの実装                      │   │   │
│  │ │ ☐ エラーハンドリングとテストの実施                    │   │   │
│  │ │                                                       │   │   │
│  │ │ 進捗: 0 / 5 (0%)                                    │   │   │
│  │ └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ generateSubtasksWithAi()
         │ (task-form.ts)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ロジックレイヤー                                │
│                  (TaskForm Component)                              │
│                                                                     │
│  1. 入力値検証                                                      │
│  2. ローディング状態管理 (isGeneratingAi)                         │
│  3. AiService.generateSubtasks() を呼び出し                       │
│  4. 取得したサブタスク配列をChecklistItemに変換                  │
│  5. 既存チェックリストに追加                                      │
│  6. 進捗率自動再計算 (recalculateChecklistProgress)             │
│  7. 成功/失敗メッセージを表示                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ generateSubtasks(title, description)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      サービスレイヤー                               │
│                   (AiService)                                      │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 1. プロンプト構成                                              │ │
│  │    "タスク『${title}』（詳細: ${description}）を..."            │ │
│  │                                                               │ │
│  │ 2. Gemini API へリクエスト送信                                │ │
│  │    POST https://generativelanguage.googleapis.com/...        │ │
│  │    Header: Content-Type: application/json                    │ │
│  │    Body: { contents: [{ parts: [{ text: prompt }] }] }      │ │
│  │                                                               │ │
│  │ 3. レスポンス受信                                              │ │
│  │    ```json                                                    │ │
│  │    {                                                          │ │
│  │      "candidates": [{                                         │ │
│  │        "content": {                                           │ │
│  │          "parts": [{                                          │ │
│  │            "text": "[\"手順1\", \"手順2\", \"手順3\"]"      │ │
│  │          }]                                                   │ │
│  │        }                                                      │ │
│  │      }]                                                       │ │
│  │    }                                                          │ │
│  │    ```                                                        │ │
│  │                                                               │ │
│  │ 4. JSON パース                                                │ │
│  │    - 正規表現で JSON 配列を抽出: /\[[\s\S]*\]/             │ │
│  │    - JSON.parse() で解析                                    │ │
│  │    - 文字列配列にフィルタ                                    │ │
│  │                                                               │ │
│  │ 5. エラーハンドリング                                         │ │
│  │    - API キー未設定 → throw Error                           │ │
│  │    - レスポンスエラー → throw Error                         │ │
│  │    - JSON パース失敗 → throw Error                          │ │
│  │                                                               │ │
│  │ 6. 結果を配列 string[] で返却                                 │ │
│  │    ["手順1", "手順2", "手順3", ...]                         │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ fetch() - HTTP Request
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    外部API (Gemini)                                │
│                                                                     │
│  Google Generative AI API                                          │
│  Model: gemini-1.5-flash                                          │
│                                                                     │
│  入力: プロンプト（タスク分解指示）                                │
│  処理: LLM による自然言語処理                                      │
│  出力: JSON 形式のサブタスク配列                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## データフロー図

```
User Input (タスク名・説明)
    │
    ▼
┌───────────────────────────┐
│ task-form.ts              │
│ generateSubtasksWithAi()  │
└───────────┬───────────────┘
            │
            ├─ 入力値検証
            │
            ├─ isGeneratingAi = true
            │  (UI更新: ボタン無効化)
            │
            └─ aiService.generateSubtasks()
               │
               ▼
            ┌──────────────────────────────┐
            │ AiService.generateSubtasks() │
            └──────┬───────────────────────┘
                   │
                   ├─ buildPrompt()
                   │  └─ プロンプト文字列生成
                   │
                   ├─ fetch() API呼び出し
                   │  └─ Gemini API
                   │
                   ├─ レスポンスチェック
                   │
                   ├─ parseSubtasksJson()
                   │  ├─ 正規表現で JSON 抽出
                   │  ├─ JSON.parse()
                   │  └─ 文字列配列に変換
                   │
                   └─ return string[]
                      │
                      ▼
               ["手順1", "手順2", ...]
                      │
                      ▼
            ┌──────────────────────────────┐
            │ task-form.ts                 │
            │ generateSubtasksWithAi()結果 │
            └──────┬───────────────────────┘
                   │
                   ├─ ChecklistItem[] に変換
                   │
                   ├─ taskData.checklist に追加
                   │
                   ├─ recalculateChecklistProgress()
                   │  ├─ 進捗率計算
                   │  └─ ステータス自動連動
                   │
                   ├─ isGeneratingAi = false
                   │  (UI更新: ボタン有効化)
                   │
                   └─ alert() 完了通知
                      │
                      ▼
                   UI 更新完了
```

---

## モジュール依存関係

```
┌────────────────────────────┐
│    TaskForm Component      │
│ (task-form.ts)             │
└──────────────┬─────────────┘
               │ @Input, @Output
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌──────────────┐  ┌──────────────┐
│ TaskDataSvc  │  │ AiService    │
│              │  │ (新規)       │
│ - addTask()  │  │ - generate   │
│ - updateTask │  │   Subtasks() │
└──────────────┘  └────┬─────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Environment Config   │
            │ - firebase           │
            │ - geminiApiKey       │
            └──────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ External APIs        │
            │ - Gemini API         │
            │ - Firebase           │
            └──────────────────────┘
```

---

## クラス図

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AiService (services/ai.service.ts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Injectable({ providedIn: 'root' })
┌─────────────────────────────────────┐
│         AiService                   │
├─────────────────────────────────────┤
│ - apiKey: string (readonly)         │
│ - apiEndpoint: string (readonly)    │
├─────────────────────────────────────┤
│ + generateSubtasks(                 │
│     title: string,                  │
│     description?: string            │
│   ): Promise<string[]>              │
│                                     │
│ - buildPrompt(                      │
│     title: string,                  │
│     description?: string            │
│   ): string                         │
│                                     │
│ - parseSubtasksJson(                │
│     responseText: string            │
│   ): string[]                       │
└─────────────────────────────────────┘

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TaskForm Component (components/task-form/)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Component({...})
┌──────────────────────────────────────────┐
│         TaskForm                         │
├──────────────────────────────────────────┤
│ @Input                                   │
│  - projectId: string                    │
│  - projects: ParentProject[]            │
│  - taskToEdit?: Task                    │
│                                         │
│ @Output                                  │
│  - taskCreated: EventEmitter<Task>      │
│  - taskUpdated: EventEmitter<Task>      │
│  - taskDeleted: EventEmitter<string>    │
│  - closePanel: EventEmitter<void>       │
│                                         │
│ Properties                               │
│  - taskData: Partial<Task>              │
│  - isGeneratingAi: boolean ← 新規       │
│  - aiService: AiService ← DI注入        │
├──────────────────────────────────────────┤
│ + generateSubtasksWithAi(): void        │
│   ↓ 追加メソッド                        │
│ + recalculateChecklistProgress(): void  │
│ + onSubmit(): void                      │
│ + onDelete(): void                      │
│ + onClose(): void                       │
└──────────────────────────────────────────┘

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ChecklistItem (models/task.model.ts)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  addedAfterStart?: boolean
}
```

---

## イベントシーケンス図

```
User              UI             TaskForm        AiService       Gemini API
 │                 │                 │                │                │
 │  click "🤖AIで分解"                │                │                │
 ├────────────────>│                 │                │                │
 │                 │ generateSub()   │                │                │
 │                 ├────────────────>│                │                │
 │                 │  isGeneratingAi=true             │                │
 │                 │ UI: "生成中..."  │                │                │
 │                 │ [disabled]       │                │                │
 │                 │<────────────────┤                │                │
 │ ◀───────────────┤                 │                │                │
 │  "生成中..."表示  │                 │                │                │
 │                 │                 │ generateSub()  │                │
 │                 │                 ├───────────────>│                │
 │                 │                 │                │ buildPrompt()  │
 │                 │                 │                │ fetch POST     │
 │                 │                 │                ├───────────────>│
 │                 │                 │                │                │
 │                 │                 │                │ (AI処理中)     │
 │                 │                 │                │ "3〜5個の       │
 │                 │                 │                │  手順..."      │
 │                 │                 │                │                │
 │                 │                 │  JSON応答      │                │
 │                 │                 │<───────────────┤                │
 │                 │                 │                │                │
 │                 │                 │ parseJson()    │                │
 │                 │                 │ ["手順1"...]   │                │
 │                 │                 │ return string[]│                │
 │                 │<───────────────┤                │                │
 │                 │                 │                │                │
 │                 │ ChecklistItem[] │                │                │
 │                 │ に変換・追加     │                │                │
 │                 │                 │                │                │
 │                 │ progress再計算   │                │                │
 │                 │ status自動連動   │                │                │
 │                 │                 │                │                │
 │                 │ isGeneratingAi=false             │                │
 │                 │ alert "✓追加完了"                 │                │
 │                 │<────────────────┤                │                │
 │ ◀───────────────┤                 │                │                │
 │  "✓完了" message │                 │                │                │
 │  チェックリスト  │                 │                │                │
 │  5項目表示      │                 │                │                │
```

---

## 状態遷移図

```
TaskForm 状態遷移

       ┌─────────────────┐
       │                 │
       │   初期状態       │
       │                 │
       │ isGeneratingAi  │
       │ = false         │
       └────────┬────────┘
                │
    ユーザーが「🤖AIで分解」を
    クリック
                │
                ▼
       ┌─────────────────┐
       │                 │
       │  生成中状態      │
       │                 │
       │ isGeneratingAi  │
       │ = true          │
       │ ボタン無効化    │
       │ "生成中..."表示  │
       └────────┬────────┘
                │
     API呼び出し中...
     (3〜5秒待機)
                │
                ├──→ ┌─────────────────┐
                │    │                 │
                │    │  エラー状態     │
                │    │                 │
                │    │ alert表示       │
                │    │ エラーメッセージ │
                │    └────────┬────────┘
                │             │
                │     ユーザーが OK
                │      クリック
                │             │
                │             ▼
                │    ┌─────────────────┐
                │    │                 │
                └───>│  初期状態に戻す │
                     │                 │
                     │ isGeneratingAi  │
                     │ = false         │
                     └─────────────────┘
                             ▲
                             │
                ┌────────────┘
                │
                ▼
       ┌─────────────────────┐
       │                     │
       │  成功状態            │
       │                     │
       │ サブタスク追加      │
       │ 進捗率再計算         │
       │ alert "✓追加完了"   │
       │ isGeneratingAi=false│
       │ ボタン有効化        │
       └─────────────────────┘
```

---

## ファイル構造と責務

```
src/
├── app/
│   ├── services/
│   │   ├── ai.service.ts ← 🔹 新規
│   │   │   ├─ Gemini API との通信
│   │   │   ├─ プロンプト構成
│   │   │   └─ JSON パース処理
│   │   │
│   │   └── task-data.ts
│   │       └─ Firebase との同期
│   │
│   ├── components/
│   │   └── task-form/
│   │       ├── task-form.ts ← 🔹 修正
│   │       │   ├─ AiService DI注入
│   │       │   ├─ generateSubtasksWithAi()
│   │       │   └─ UI状態管理
│   │       │
│   │       ├── task-form.html ← 🔹 修正
│   │       │   ├─ AIボタン追加
│   │       │   └─ UI更新
│   │       │
│   │       └── task-form.css ← 🔹 修正
│   │           └─ ボタンスタイル
│   │
│   └── models/
│       └── task.model.ts
│           └─ ChecklistItem interface
│
└── environments/
    ├── environment.ts ← 🔹 修正
    │   └─ geminiApiKey 設定
    │
    └── environment.development.ts ← 🔹 修正
        └─ geminiApiKey 設定

🔹 = 実装・修正対象
```

