# development.md — 開発ルール・テスト・eval・協業

> Last reviewed: 2026-04-26
> 関連: 憲章 §6、`docs/agent.md`、`docs/operations.md`

---

## §1. Definition of Done

### §1.1 機能の DoD（社内）

1. ユニットテストが書かれ green
2. 型エラーゼロ（`pnpm typecheck`）
3. リンタ green（`pnpm lint`）
4. 関連ドキュメント（`README.md`, `docs/*.md` 等）を更新
5. 必要なら `CLAUDE.md` を更新
6. PR 説明欄に変更理由・代替案検討の経緯・テスト方法を記載
7. 動作確認チェックリストを operator に提示

### §1.2 リリース可能性のチェック

- 全 E2E シナリオが手動で再現確認済
- `docs/roadmap.md` のローンチ前チェックリスト準拠
- セキュリティ観点（`docs/security.md`）の自己レビュー済

### §1.3 顧客成果物の品質基準

- 生成 PR は **draft で作成**、CI green まで ready for review にしない
- 顧客の `main` / `master` への直接 push は絶対禁止
- 移行で導入した依存関係は `package.json` に明記、lock file も更新
- PR 説明欄は `docs/templates/pr-description.md` のテンプレートに従う

---

## §2. テスト戦略

### §2.1 テストピラミッド

- **Unit (大半)**: 個別関数・モジュールのテスト。Vitest
- **Integration (中)**: パッケージ境界のテスト（DB アクセス、API 呼び出しモック）
- **E2E (少)**: Dashboard E2E は Playwright（Phase 3 以降）
- **Eval (専用)**: agent 出力の品質測定。§3

### §2.2 CI

- 全 PR で `pnpm typecheck && pnpm test && pnpm lint` を実行
- 失敗時はマージ不可
- main へのマージのみ自動デプロイ（dev 環境）

### §2.3 コードレビュー観点

- 設計の妥当性（複雑度、責務分離）
- セキュリティ（PII 流出、権限境界）
- パフォーマンス（N+1、不必要な巨大コンテキスト）
- テスト網羅性
- 命名と可読性
- 依存関係の妥当性（過剰な追加、ライセンス）

---

## §3. Agent の評価 (Eval)

最も重要な品質指標は「agent が良い PR を生成するか」。

### §3.1 Golden corpus

- 既知の Next.js Pages Router プロジェクト 10〜30 件をテスト対象として固定
- 各プロジェクトに「期待する移行結果」を定義（テストが通ること、特定パターンが
  正しく変換されていること等）
- 候補リスト:
  - `vercel/next.js` の examples 群（小規模）
  - `vercel/commerce` の旧版（中規模）
  - 自作 sample 数件（特定パターン狙い）

### §3.2 Eval ハーネス

`packages/eval` に評価用 CLI を実装。

```
pnpm eval                   # 全 corpus に対して agent を実行
pnpm eval --case <name>     # 特定ケースのみ
pnpm eval --baseline <ver>  # 指定バージョンとの比較
```

各案件で測定:
- CI green 達成率
- 生成 PR の差分サイズ
- トークン消費量・コスト
- 既知パターンの正答率

結果は `eval_runs` テーブルに記録、時系列で品質推移を可視化。

### §3.3 Eval ケースの仕様

各ケースは `packages/eval/cases/<id>/` に格納:

```
cases/<id>/
├── repo/                # 移行前のリポジトリ snapshot
├── expected/            # 期待される変更内容（パターンチェック用）
└── case.yaml            # ケース定義
```

`case.yaml` の例:

```yaml
id: blog-starter-typescript
description: vercel/next.js の examples/blog-starter (TypeScript)
plan: small
expected:
  ci_green: true
  patterns:
    - all_pages_have_metadata
    - no_getServerSideProps_remaining
    - no_use_client_in_server_components
budget:
  tokens_input: 200000
  tokens_output: 30000
  cost_usd: 5
```

### §3.4 プロンプト変更時のゲート

- `docs/prompts/` を変更する PR は **eval を必ず実行**し、結果を PR に貼る
- 既存スコアを下回る変更はマージ不可（明示的な合意がない限り）

### §3.5 安全性 eval

- 敵対的入力（コメント内 prompt injection、巨大ファイル、循環依存）への耐性
- 専用ケースとして 5 件以上を維持
- ケース命名規則: `adversarial-<種類>-<番号>`

---

## §4. 開発ルール

### §4.1 進行

- 各 PR は 300 行以下を目安。例外時は分割を検討
- コミット前に `pnpm typecheck && pnpm test && pnpm lint` を必ず通す
- 機能追加には対応するテストを Vitest で書く
- 1 つの関心事ずつ commit する

### §4.2 コード

- TypeScript strict mode、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 有効
- 副作用は境界（HTTP handler / job worker / agent runner）に集約
- 純粋関数を優先、副作用関数は接尾辞や命名で明示
- コメントは最小限。意図は識別子で表現
- Why が非自明な箇所のみコメントを残す
- ファイルパスは line 番号付きで言及（`src/foo.ts:42`）
- マジックナンバーは定数化、env から読むものは型付きで
- `any` 禁止、`unknown` でガード

### §4.3 Git

- main は protected、PR 経由でのみマージ
- コミットメッセージは Conventional Commits（feat/fix/chore/docs/refactor/test）
- destructive 操作（`git reset --hard`、`push --force`）は operator の明示許可なく実行しない
- 1 PR = 1 機能。リファクタとビジネス変更を混ぜない
- PR 説明欄: 変更目的 / アプローチ / テスト方法 / リスク / ロールバック手順
- マージコンフリクト解決時は履歴の追跡可能性を優先（rebase か merge かは case-by-case）

### §4.4 依存関係

- 新規依存追加時は理由を PR 説明に書く
- メンテされていない（過去 1 年更新なし）パッケージは原則採用しない
- ライセンスは MIT / Apache-2.0 / BSD 系を優先、GPL 系は要確認

---

## §5. ユーザとの作業協定

Claude Code と operator の協業ルール。

### §5.1 セッション開始

憲章 §1 のプロトコルに従う。1〜3 行で着手内容を宣言してから動き出す。

### §5.2 報告・連絡・相談

- 大きな設計判断は**実装前に**選択肢と推奨を提示し、operator の合意を取る
- 実装中に方針転換が必要な事象を発見したら、止まって報告する
- 完了報告は「何をやったか / 何が動くか / 何をやってないか / 次に何をやるか」で構造化

### §5.3 質問の作法

- 質問時は **選択肢を提示**する（「A or B、推奨は X、理由は…」）
- yes/no では決められない事項は**判断材料を整理**してから問う
- 同じ質問を繰り返さない（過去のやり取りは memory・本書に残す）

### §5.4 自走する範囲

- 憲章 §6 に該当しない判断は自走でよい
- 実装の細部・命名・ファイル分割は agent の裁量
- リファクタは「動作を変えない」前提で随時行ってよい（ただし PR は分ける）

### §5.5 進捗の可視化

- TodoWrite で現在のタスクと進捗を常に最新化
- 1 タスク完了ごとに即座にチェック
- 長時間タスクの途中経過は短く報告

### §5.6 失敗の扱い

- 失敗を隠さない。再現手順とログを共有
- 「動いた」と報告する前に**実際に動かして確認**する
- 「たぶん動く」「動くはず」は禁句

---

## 関連ドキュメント

- 憲章: `CLAUDE.md`
- agent 設計: `docs/agent.md`
- 運用: `docs/operations.md`
- ADR: `docs/decisions/`
