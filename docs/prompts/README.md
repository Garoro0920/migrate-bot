# prompts/ — Agent プロンプト原本

> Last reviewed: 2026-04-26

このディレクトリには Migration Agent が使うプロンプトの原本を置く。
バージョン管理し、変更時は eval を通すこと（`docs/development.md` §3.4）。

---

## §1. ファイル命名規則

- `<stage>.md` または `<stage>-<variant>.md`
- 例: `analyze.md`, `migrate-default.md`, `migrate-retry.md`

## §2. 各プロンプトの先頭メタデータ

各プロンプトファイルの冒頭には以下のフロントマターを付ける。

```yaml
---
version: 0.1
stage: migrate
model: claude-sonnet-4-6
last_eval: <YYYY-MM-DD>
---
```

## §3. 構造（`docs/agent.md` §3.5 を参照）

各プロンプトは以下のセクションで構成する。

- Role: agent の役割
- Inputs: 期待される入力（変数名・型・意味）
- Constraints: 守るべきルール、禁止事項
- Output schema: 出力の形式（JSON schema や正規表現）
- Examples: Input → Output の具体例 2〜3 個
- Failure handling: 不確実な場合の挙動

## §4. 変更時の作法

1. プロンプトを編集、`version` をインクリメント
2. eval を実行（`pnpm eval`）
3. PR に eval 結果を添付
4. 既存スコアを下回る場合は明示的合意を取る
5. agent コードからは bundled prompt の SHA-256 hash をログに残す

## §5. プロンプトとモデルの紐付け

各プロンプトは特定のモデル想定で書かれている。モデルを変更するときは:

1. プロンプトを当該モデル向けに調整（system 指示、出力形式など）
2. eval を再実行、スコア比較
3. 結果が良ければマージ、悪ければ元のプロンプトに戻す

異なるモデル向けのバリアントは `<stage>-<model>.md` のように分けて保存可能。

---

## 関連ドキュメント

- agent 設計: `docs/agent.md`
- eval / 評価: `docs/development.md`
