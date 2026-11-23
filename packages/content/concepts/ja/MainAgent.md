# MainAgent

## 定義

MainAgent は、Codex が非 agent team 状態における主幹リクエストチェーンです。ユーザーと Codex のやり取りのたびに一連の API リクエストが生成され、その中で MainAgent リクエストがコア会話チェーンを構成します。これらは完全な system prompt、ツール定義、メッセージ履歴を含みます。

## 識別方法

cc-viewer では、MainAgent は `req.mainAgent === true` で識別され、`interceptor.js` がリクエストキャプチャ時に自動的にマーキングします。

判定条件（すべて満たす）：
- リクエストボディに `system` フィールド（system prompt）が含まれる
- リクエストボディに `tools` 配列（ツール定義）が含まれる
- system prompt に "Codex" の特徴テキストが含まれる

## SubAgent との違い

| 特徴 | MainAgent | SubAgent |
|------|-----------|----------|
| system prompt | 完全な Codex メインプロンプト | 簡潔なタスク専用プロンプト |
| tools 配列 | 利用可能なすべてのツールを含む | 通常タスクに必要な少数のツールのみ |
| メッセージ履歴 | 完全な会話コンテキストを蓄積 | サブタスク関連のメッセージのみ |
