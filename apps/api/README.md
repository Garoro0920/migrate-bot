# @migrate-bot/api

Hono ベースの webhook 受信・dashboard API。Cloudflare Workers 想定。

`docs/architecture.md` §1.2: 受信層 (常時稼働、軽量検証 + キュー投入) として
実装。重い処理はここでは行わず、ジョブ enqueue のみ。

## エンドポイント

- `GET /health` — liveness check
- `POST /webhooks/github` — GitHub App webhook 受信
  - 署名検証 (`X-Hub-Signature-256`)
  - event 振り分け (installation / push / pull_request 等)
  - Phase 2a 段階では受信ログのみ、enqueue は Phase 2 後半

## env (本番想定)

- `GITHUB_WEBHOOK_SECRET`: webhook 署名検証用秘密鍵
- `DB`: D1 binding (Cloudflare Workers の env binding)
- `JOBS_QUEUE`: Cloudflare Queues binding (Phase 2 後半)
