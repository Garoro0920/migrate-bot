# docs/ — 詳細ドキュメント

このディレクトリは migrate-bot の詳細仕様を保管する。
セッション開始時に必ず読むのは `CLAUDE.md`（プロジェクト憲章）と
`docs/status.md`（現在のフェーズ）の 2 つだけ。それ以外は **必要時に読む**。

## ファイル一覧

| ファイル | 内容 |
|---|---|
| `status.md` | 現在のフェーズ・進行中タスク・直近の判断 |
| `business.md` | ミッション、市場、顧客、収益モデル、横展開候補 |
| `architecture.md` | システム構成、技術スタック、データモデル、状態機械、リポジトリ構造、NFR |
| `agent.md` | Migration Agent の設計、移行スコープ、プロンプト戦略、codemod 連携 |
| `operations.md` | 自動運用方針、コスト管理、観測、インシデント対応、サポート、スコープ外 |
| `development.md` | DoD、テスト・eval、開発ルール、Git 規約、協業規約 |
| `security.md` | セキュリティ・プライバシー、キー管理、法令・規約 |
| `roadmap.md` | 開発フェーズ、完了基準、ローンチ前チェックリスト |
| `templates/` | PR 説明欄など再利用テンプレート |
| `decisions/` | Architecture Decision Records (ADR) |
| `prompts/` | Agent プロンプトの原本（バージョン管理） |

## 編集ルール

- 各 doc 冒頭に `Last reviewed: YYYY-MM-DD` を記載する
- 章番号（§1, §2, …）は安定 ID として振る。順序入れ替えのみで番号再利用しない
- 重要な変更は `docs/decisions/` に ADR として記録する
- 各 doc は 500 行を目安。超えたら更なる分割を検討
- `CLAUDE.md` で参照しているパスを変更するときは、両方を同 PR で更新する

## 一次情報の優先

本ディレクトリの記述と各サービスの公式 docs / リリースノートが矛盾した場合、
**公式情報を優先**し、本ディレクトリを更新する（憲章 §8）。
