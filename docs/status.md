# status.md — 現在のフェーズ・進行中タスク

> Last updated: 2026-04-26

各セッション開始時に Claude Code が読み、終了時に必要なら更新する。
履歴を残したい場合はコミットメッセージで充分（このファイルは最新状態のみ保持）。

---

## 現在のフェーズ

**Phase 1: ローカル PoC（完了基準到達）**

詳細 → `docs/roadmap.md` §1.2

注: Phase 0 は ADR-0002 により skip。市場検証は社会人化以降に再評価予定。

## 進行中タスク

なし（Phase 1 §1.2 完了基準を満たした状態。Phase 2 着手前に operator 確認待ち）

## 直近の重要判断

- 2026-04-26: 単一 CLAUDE.md を分割構成に再編（v0.5）
- 2026-04-26: ADR-0002 により Phase 0 を skip、Phase 1 に直行
- 2026-04-26: モノレポ初期化 + agent/cli 骨格 (`f9ed516`)
- 2026-04-26: Analyze 段階実装 (`681f3b9`)、API コスト累計トラッキング実装 (`5b4e49c`)
- 2026-04-26: MODEL_PRICING 公式検証、Opus 4.7 を $5/$25 に訂正 (`0c141bc`)
- 2026-04-26: `.env.local` 自動読込 + project root 起点パス解決 (`aea4ed1`)
- 2026-04-26: Plan 段階 deterministic 実装 (`7416f0a`)
- 2026-04-26: Migrate 段階実装、tool use + Sonnet/Opus リトライ (`75504b6`)
- 2026-04-26: Verify 段階実装、CommandRunner DI (`c07e235`)
- 2026-04-26: source 削除 + 衝突検知 (`5d847ab`)
- 2026-04-26: API route の /index 削減バグ修正 (`08f239c`)
- 2026-04-26: Windows での verify shell:true / corepack フォールバック (`2c6494a`)
- **2026-04-26: `vercel/next.js` の `examples/with-typescript` で end-to-end pipeline 成功**:
  - 5/5 タスク変換成功、0 failed
  - `pnpm install` + `tsc --noEmit` + `next build` がすべて pass
  - 累計コスト約 $0.13（fixture 試行 + 実 example 2 回 = analyze ~$0.008、migrate ~$0.12）
  - **Phase 1 §1.2 「出力 branch で `next build` と型検査が通る」要件達成**

## Phase 1 §1.2 の完了状況

- [x] モノレポ初期化（pnpm + Turborepo）
- [x] `packages/agent` に Analyze + Plan + Migrate + Verify 実装
- [x] `apps/cli` に `pnpm migrate <repo-path>` 実装
- [x] 検証対象:
  - [x] `vercel/next.js` の `examples/with-typescript`（5 ファイル）→ pass
  - [ ] `vercel/next.js` の `examples/blog-starter`（次セッション、追加検証）
  - [ ] 自作の中規模 sample repo（30〜100 ファイル）（追加検証）
- [x] **出力 branch で `next build` と型検査が通る**（with-typescript で達成）
- [ ] 1 ジョブのトークン使用量・所要時間・コストを計測しレポート（部分達成、フォーマル文書化が残）
- [ ] `docs/business.md` §4.1 のコスト想定値を実測ベースで再評価（次セッション）

## 既知の制約・将来の宿題

- `pages/_document.tsx + _app.tsx` の同一 target 衝突: 後発タスク skip + manual merge 余地。fixture と with-typescript には _document.tsx がないため未検証
- LLM が path alias (`@/...`) を使うと tsconfig 設定との整合性が必要。with-typescript には alias 設定済で問題なかったが、未設定 repo では破綻しうる
- Migrate のプロンプト (`docs/prompts/migrate.md` v0.1) は eval ハーネスを通していない（`docs/development.md` §3.4 のゲートは Phase 5 以降の運用で本格適用）

## コスト実測データポイント

ADR-0002 §1.1 の kill criteria（$30 / $80）監視に向けた基準値。

| 対象 | ファイル数 | analyze | migrate | 合計 |
|---|---|---|---|---|
| 自作 fixture (4 files) | 4 | $0.0014 | $0.0265 | $0.0279 |
| with-typescript (5 files) | 5 | $0.0026 | $0.0461 | $0.0487 |

線形に近い (1 ファイル ~$0.01)。Small プラン上限 100 files で extrapolate すると ~$1。
business.md §4.1 の Small 上限 $20 想定はかなり保守的（20 倍マージン）。
詳細評価は中規模 sample repo の検証後に。

## 次に着手すべきこと

選択肢（operator 確認待ち）:
1. **Phase 1 残検証の追加**: `examples/blog-starter` や中規模 sample で 2〜3 件目検証、`docs/business.md` §4.1 の正式更新
2. **Phase 2 着手準備**: GitHub App 登録、Cloudflare Workers + Hono、Drizzle + D1 設計（`docs/roadmap.md` §1.3）
3. **PoC の OSS 公開検討**: ADR-0002 §1.4 の市場シグナル取得（GitHub star / issue / discussion 観察）

## 開発コマンド

要件: Node.js 22 LTS、corepack 有効化済み、`.env.local` に `ANTHROPIC_API_KEY`。

PowerShell:

```powershell
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test

# pipeline 実行 (analyze + plan + migrate + verify は別コマンド)
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts migrate <repo-path>
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts verify <working-dir>
corepack pnpm --filter '@migrate-bot/cli' exec tsx src/index.ts stats
```

## 関連リンク

- 憲章: `CLAUDE.md`
- ロードマップ: `docs/roadmap.md` §1.2
- ADR-0002（Phase 0 skip 判断）: `docs/decisions/0002-skip-phase-0.md`
- agent 設計: `docs/agent.md`
- アーキテクチャ: `docs/architecture.md`
