# architecture.md — システム設計

> Last reviewed: 2026-04-26
> 関連: 憲章 §1（ドキュメントマップ）、`docs/operations.md`、`docs/agent.md`

---

## §1. システム構成

### §1.1 構成図

```
[Customer] ─install/pay──┐                       ┌── alert ─[Operator]
                         ▼                       │
                  [GitHub Webhook]                │
                  [Stripe Webhook]                │
                         │                       │
                         ▼                       │
              ┌──────────────────────┐           │
              │ Cloudflare Workers   │  always-on
              │ (Hono)               │  - signature verify
              │                      │  - enqueue
              └──────────┬───────────┘           │
                         │                       │
                         ▼                       │
              ┌──────────────────────┐           │
              │ Cloudflare Queues    │           │
              └──────────┬───────────┘           │
                         │ pull                  │
                         ▼                       │
              ┌──────────────────────┐           │
              │ Worker (consumer)    │           │
              │ - launch Fly Machine │           │
              └──────────┬───────────┘           │
                         │ Machine API           │
                         ▼                       │
              ┌──────────────────────┐           │
              │ Fly.io Machine       │  per-job, ephemeral
              │ ┌──────────────────┐ │           │
              │ │ Job Runner (Node)│ │           │
              │ │ ├ Migration Agent│ │           │
              │ │ ├ git/pnpm/tsc   │ │           │
              │ │ └ writes to D1   │ │           │
              │ └──────────────────┘ │           │
              └──────┬───────────────┘           │
                     │                           │
                     ├──► Anthropic API          │
                     ├──► GitHub API             │
                     ├──► D1 (job state)         │
                     └──► Sentry / Logs ─────────┘
```

### §1.2 コンポーネント分離の原則

- **Webhook 受信層 (Workers)**: 軽い検証 → キュー投入のみ。常時稼働
- **Job 実行層 (Fly.io Machine)**: オンデマンド起動・終了。1 job = 1 machine
- **永続層 (D1 → 必要に応じ Postgres)**: installation、job 状態、支払履歴
- **観測層 (Sentry, Logs, Anthropic Usage API)**: 異常検知のみ

### §1.3 設計判断とその理由

#### Cloudflare Workers 単独でジョブを走らせない理由

- Workers は CPU 時間に上限がある（プラン依存。実装時に最新値を確認）
- 移行ジョブは数分〜1 時間の長時間処理であり、単一インスタンスで完結させたい
- Durable Objects + 分割実行も可能だが、状態管理が複雑化しコストが読みにくい
- → 受信層と実行層を分離し、長時間処理は Fly.io Machine に任せる

#### Fly.io Machines を採用する理由

- start-on-demand（必要時起動・ジョブ終了で停止）で従量課金しやすい
- Docker イメージで完全な環境を制御可能（Node, git, pnpm, テストランナー）
- 1 リポジトリ 1 マシンで隔離（顧客間のデータ漏洩リスクを排除）
- 代替候補: Modal, Railway, GCP Cloud Run Jobs。Phase 2 で再評価する

#### Hono を採用する理由

- Workers / Node の両方で動く（受信層と consumer worker でコード共有可能）
- 軽量・型安全・middleware の表現力が十分

#### Drizzle を採用する理由

- SQL に近く、生成 SQL を確認しやすい（agent が SQL を読めることが重要）
- D1 / Postgres 両対応で、後の移行が容易

---

## §2. 非機能要件 (NFR / SLO)

### §2.1 性能目標

| 指標 | 目標値 | 測定方法 |
|---|---|---|
| Webhook 応答時間 | P95 < 200ms | Cloudflare Analytics |
| キュー投入から Job 開始までの遅延 | P95 < 1 分 | job_events 差分 |
| 1 ジョブの平均所要時間 (Medium) | P95 < 30 分 | jobs テーブル |
| Dashboard 初期表示 | P95 < 1 秒 | Vercel Analytics |

### §2.2 可用性目標

| サービス | 目標 |
|---|---|
| Webhook 受信 | 99.9% (Workers SLA に依存) |
| Dashboard | 99.5% |
| Job 実行 | ベストエフォート（Anthropic / GitHub に依存） |

### §2.3 復旧目標 (RTO / RPO)

| 事象 | RTO | RPO |
|---|---|---|
| D1 障害 | 4 時間 | 24 時間（日次バックアップ前提） |
| Workers 障害 | Cloudflare の復旧に依存 | 0（受信したイベントは Queues に永続化） |
| Fly.io 障害 | 1 時間（別リージョンでの再起動） | 進行中ジョブは再実行（冪等） |

詳細な復旧手順は `docs/operations.md` §3 のランブック。

---

## §3. 技術スタック

開発開始時点で以下に決定済み。逸脱は事前に operator へ確認すること。
**実装時は必ず最新版を確認**（憲章 §4.2）。

### §3.1 言語・ランタイム

- TypeScript（strict mode、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 有効）
- Node.js 22 LTS（Fly.io 側）/ Workers ランタイム（Cloudflare 側）
- パッケージマネージャ: pnpm

### §3.2 バックエンド

| 用途 | 採用 | 備考 |
|---|---|---|
| Web フレームワーク | Hono | Workers / Node 両対応 |
| ORM | Drizzle | D1 / Postgres 両対応 |
| キュー | Cloudflare Queues | D1 と統合容易、安価 |
| Job ランナー | Fly.io Machines | 必要時起動・停止 |
| GitHub 連携 | `@octokit/app` + `@octokit/webhooks` | 公式 |
| 課金 | Stripe（Checkout + Webhook） | テスト環境で先行検証 |
| メール | Resend | API 設計が単純、開発者向けに評判が良い |

### §3.3 エージェント

- SDK: `@anthropic-ai/claude-agent-sdk`（最新版）
- モデル戦略:
  - **既定**: `claude-sonnet-4-6`
  - **難箇所のリトライ**: `claude-opus-4-7`
  - **分類・要約**: `claude-haiku-4-5-20251001`
- 詳細 → `docs/agent.md`

### §3.4 フロントエンド

- Landing + Dashboard: Next.js（App Router、最新安定版）+ Tailwind + shadcn/ui
- ホスティング: Vercel（Hobby → 収益発生後 Pro）

### §3.5 観測・監視

- エラー: Sentry
- ログ: Cloudflare Logs / Logpush → R2
- コスト: Anthropic Usage API を 1 時間毎に取得 → 閾値超過で Slack 通知
- 可用性: UptimeRobot（Workers のヘルスチェック）

### §3.6 開発ツール

- モノレポ: Turborepo
- テスト: Vitest（unit）+ Playwright（dashboard E2E）
- リンタ: Biome（高速、ESLint + Prettier の代替）
- CI: GitHub Actions
- IaC: 導入しない（Cloudflare/Fly/Vercel の dashboard と
  wrangler.toml/fly.toml で十分）

---

## §4. リポジトリ構成（モノレポ）

```
migrate-bot/
├── apps/
│   ├── api/              # Cloudflare Workers (Hono): webhook受信・dashboard API
│   ├── web/              # Next.js: landing + dashboard
│   ├── runner/           # Fly.io Machine 上で動く job runner (Node)
│   └── cli/              # 開発・運用用 CLI
├── packages/
│   ├── agent/            # Claude Agent SDK ベースの migration agent
│   ├── db/               # Drizzle schema + migrations
│   ├── shared/           # 型定義・共通ユーティリティ
│   └── eval/             # agent 評価フレームワーク
├── docs/                 # 詳細ドキュメント（本ファイル含む）
├── CLAUDE.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .github/workflows/
```

各 app/package には個別の `README.md` を置き、目的と起動方法を明記する。
新しい app/package 追加時は Turborepo の依存グラフを確認し、循環依存を作らない。

---

## §5. データモデル

### §5.1 主要テーブル

型定義の真実の源は `packages/db/src/schema.ts`。以下はスケッチ。

#### installations
- `id` (uuid, PK)
- `githubInstallationId` (int, unique)
- `accountLogin` (text)
- `createdAt` (timestamp)
- `revokedAt` (timestamp, nullable)

#### customers
- `id` (uuid, PK)
- `email` (text, unique)
- `stripeCustomerId` (text, unique)
- `createdAt` (timestamp)

#### jobs
- `id` (uuid, PK)
- `installationId` (uuid, FK)
- `customerId` (uuid, FK)
- `repoFullName` (text)
- `plan` (text: small | medium | large | enterprise)
- `state` (text: §6 の状態のいずれか)
- `stripePaymentIntentId` (text)
- `traceId` (text, unique)
- `tokensInput` (int)
- `tokensOutput` (int)
- `costUsd` (numeric)
- `prUrl` (text, nullable)
- `errorCode` (text, nullable)
- `errorDetail` (jsonb, nullable)
- `createdAt`, `startedAt`, `completedAt` (timestamps)

#### job_events
- `id` (uuid, PK)
- `jobId` (uuid, FK)
- `fromState`, `toState` (text)
- `reason` (text)
- `createdAt` (timestamp)

#### refunds
- `id` (uuid, PK)
- `jobId` (uuid, FK)
- `amountUsd` (numeric)
- `reason` (text)
- `createdAt` (timestamp)

#### eval_runs
- `id` (uuid, PK)
- `corpusItem` (text)
- `agentVersion` (text)
- `passed` (bool)
- `tokensInput`, `tokensOutput` (int)
- `costUsd` (numeric)
- `createdAt` (timestamp)

### §5.2 設計原則

- **イミュータブル指向**: 状態変化は履歴テーブル（job_events）で追跡
- **顧客コードは保存しない**: ファイル内容を永続層に書かない
- **PII の最小化**: email 以外の個人情報は保持しない
- **命名規則**: テーブル名は snake_case 複数形、カラム名は camelCase
  （Drizzle のデフォルト）
- **タイムスタンプ**: UTC ISO 8601、保存は `timestamp with time zone`

### §5.3 マイグレーション運用

- スキーマ変更は `packages/db/migrations/` に SQL を配置
- 本番反映前に dev 環境で `drizzle-kit push` を試す
- ロールバック手順を各マイグレーションのコメントに残す
- 破壊的変更（カラム削除、型変更）は二段階デプロイ:
  1. 新形式追加、コード両対応
  2. 旧形式削除

---

## §6. ジョブの状態機械

### §6.1 状態一覧

| 状態 | 意味 | 次の正常遷移先 |
|---|---|---|
| `queued` | キュー投入済、未着手 | `analyzing` / `cancelled` |
| `analyzing` | リポジトリ解析中（移行可否判定） | `planning` / `aborted_blocker` |
| `planning` | 移行計画生成中 | `migrating` / `aborted_blocker` |
| `migrating` | コード変換実行中 | `verifying` / `aborted_blocker` |
| `verifying` | CI 結果待ち | `pr_ready` / `failed_ci` / `aborted_blocker` |
| `pr_ready` | draft → ready for review、完了 | （終端） |
| `failed_ci` | CI green 達成失敗 | `refunding` |
| `aborted_blocker` | 移行不可と判定または runner 側で予期せぬ例外発生（`reason` で要因区別） | `refunding` |
| `cost_exceeded` | コスト上限超過 | `refunding` |
| `installation_revoked` | Installation が中途解除された | `refunding` |
| `refunding` | 返金処理中 | `refunded` |
| `refunded` | 返金完了 | （終端） |
| `cancelled` | 顧客キャンセル | （終端） |

### §6.2 遷移ルール

- 全遷移は `packages/shared/src/job-state.ts` の関数を経由する
- 不正な遷移はランタイムエラーとし、Sentry に通知
- 各状態の最大滞在時間（SLA）を定義し、超過したら自動で失敗状態に遷移:
  - `queued`: 24h
  - `analyzing`: 30m
  - `planning`: 30m
  - `migrating`: 2h
  - `verifying`: 24h（CI が長いケースを許容）

### §6.3 冪等性と再実行

- runner は途中で落ちても**再開可能**でなければならない
- 中間状態（解析結果、移行計画）は D1 に保存し、再開時に読み直す
- 既に push 済の branch は force push せず、追加 commit を積む

### §6.4 中途解除・障害時の挙動

- **GitHub Installation 中途解除（ジョブ実行中）**: webhook で検知 →
  実行中のジョブを `installation_revoked` に遷移 → runner 即停止 → 自動全額返金
- **Anthropic / GitHub / Stripe API 障害**: 指数バックオフで最大 3 回リトライ →
  全敗で job を一時停止し、`docs/operations.md` §3 のランブックに従う
- **Fly.io Machine 起動失敗**: Queue で 3 回リトライ → 失敗時は operator に通知

---

## §7. 参考リンク（一次情報）

実装時は必ず最新版を参照する。本書と公式情報が矛盾した場合は公式優先（憲章 §8）。

### Anthropic
- Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk
- Prompt Caching: https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- モデル一覧と料金: https://docs.claude.com/en/docs/about-claude/models

### Next.js
- App Router migration: https://nextjs.org/docs/app/guides/migrating/app-router-migration
- Codemods: https://nextjs.org/docs/app/guides/upgrading/codemods

### GitHub
- GitHub Apps: https://docs.github.com/apps
- Octokit: https://github.com/octokit/octokit.js

### 課金・配送
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Resend: https://resend.com/docs

### インフラ
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Fly.io Machines: https://fly.io/docs/machines/

### ライブラリ
- Hono: https://hono.dev/
- Drizzle ORM: https://orm.drizzle.team/
- shadcn/ui: https://ui.shadcn.com/
- Vitest: https://vitest.dev/

---

## 関連ドキュメント

- 憲章: `CLAUDE.md`
- 運用・障害対応: `docs/operations.md`
- agent 設計: `docs/agent.md`
- セキュリティ: `docs/security.md`
- ADR: `docs/decisions/`
