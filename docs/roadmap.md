# roadmap.md — フェーズ・完了基準・ローンチチェックリスト

> Last reviewed: 2026-04-26
> 関連: `docs/status.md`、`docs/business.md`、`docs/development.md`

---

## §1. 開発フェーズ

各フェーズは前フェーズの完了基準を満たしてから着手する。

### §1.1 Phase 0: 市場検証（実装着手前）

**目標**: 実装前に有意な需要を確認、不足ならピボット判断

- [ ] 想定 ICP の開発者 5 名以上にヒアリング
- [ ] 「$249 払って Pages → App Router 移行を任せたいか」を直接質問
- [ ] 結果が芳しくない場合は `docs/business.md` §5 の横展開先候補へピボットを検討
- [ ] 結果を `docs/decisions/0001-market-validation.md` に記録

**完了基準**: 3 名以上が「ぜひ使いたい」と回答 / または ピボット決定

**目安期間**: 1〜2 週間

### §1.2 Phase 1: ローカル PoC

**目標**: ローカル CLI で 1 リポジトリの自動移行が動く

- [ ] モノレポ初期化（pnpm + Turborepo）
- [ ] `packages/agent` に Analyze + Plan + Migrate + Verify を実装
- [ ] `apps/cli` に `pnpm migrate <repo-url>` を実装
- [ ] 検証対象（小規模から順に）:
  - [ ] `vercel/next.js` の `examples/with-typescript`
  - [ ] `vercel/next.js` の `examples/blog-starter`
  - [ ] 自作の中規模 sample repo（30〜100 ファイル）
- [ ] 出力 branch で `next build` と型検査が通る
- [ ] 1 ジョブのトークン使用量・所要時間・コストを計測しレポート
- [ ] `docs/business.md` §4.1 のコスト想定値を実測ベースで再評価

**完了基準**: 検証対象 3 件すべてで CI green 相当に到達、コスト想定値内

**目安期間**: 2〜4 週間

### §1.3 Phase 2: GitHub App 化

- [ ] GitHub App 登録（dev / prod 2 つ）
- [ ] Webhook 受信 (Workers + Hono)
- [ ] Installation 情報の永続化（D1 + Drizzle）
- [ ] Cloudflare Queues 経由で Fly.io Machine を起動する仕組み
- [ ] 管理用 CLI: `pnpm admin trigger <installationId> <repo>`
- [ ] `docs/architecture.md` §6 の状態機械を実装
- [ ] `docs/agent.md` §1.10 の並列度・レート制限を実装

**完了基準**: 自分のテスト repo で Webhook → Queue → Fly.io ジョブ → draft PR
までが動く

**目安期間**: 2〜3 週間

### §1.4 Phase 3: 課金統合

- [ ] Stripe テスト環境で Checkout セッション生成
- [ ] 支払成功 webhook → migration job 起動
- [ ] 失敗時の自動返金処理
- [ ] 顧客向けメール通知（Resend）
- [ ] `docs/operations.md` §2 のコスト超過検知の実装

**完了基準**: テストカードで支払 → 自動移行 PR → CI 失敗で自動返金、まで動く

**目安期間**: 1〜2 週間

### §1.5 Phase 4: ローンチ準備

- [ ] Landing page（価格表 / FAQ / プライバシーポリシー / 利用規約）
- [ ] デモ動画（実 OSS リポジトリでの移行プロセス）
- [ ] §2 のローンチ前チェックリストを完了
- [ ] ローンチ告知文の草稿（HN / Reddit r/nextjs / X）

**完了基準**: §2 の全項目チェック済、operator がローンチ判断可能な状態

**目安期間**: 1〜2 週間

### §1.6 Phase 5 以降（参考、本書範囲外）

- 横展開（`docs/business.md` §5）
- 日本円対応
- Self-serve 価格見積（リポジトリスキャン → 即時見積）
- monorepo 対応
- 月額サブスクリプションプラン

### §1.7 フェーズ依存関係図

```
Phase 0 (Validate)
    │
    ▼
Phase 1 (PoC) ────► PoC 結果が悪ければピボット → 別領域で Phase 0 に戻る
    │
    ▼
Phase 2 (GitHub App)
    │
    ▼
Phase 3 (Billing)
    │
    ▼
Phase 4 (Launch)
    │
    ▼
Phase 5+ (Growth, optional)
```

---

## §2. ローンチ前チェックリスト

Phase 4 完了の判定にもこのリストを使う。

### §2.1 機能面

- [ ] §1 の全フェーズ完了基準を満たした
- [ ] `docs/development.md` §3 の golden corpus 全件で CI green 達成
- [ ] `docs/operations.md` §2 のコスト上限内で全ジョブが完了
- [ ] `docs/architecture.md` §6 の全状態遷移が実装され、テストされている

### §2.2 法務・コンプライアンス

- [ ] 利用規約のドラフト完成（弁護士レビュー前提）
- [ ] プライバシーポリシーのドラフト完成
- [ ] 特定商取引法表記（日本顧客対応する場合）
- [ ] Anthropic 利用規約遵守の自己確認
- [ ] GitHub Marketplace 規約遵守の自己確認

### §2.3 運用準備

- [ ] Sentry / Slack / UptimeRobot のアラート設定
- [ ] キー管理・ローテーション手順 (`docs/security.md` §4)
- [ ] インシデントランブック (`docs/operations.md` §3.3)
- [ ] バックアップ・リストア手順 (`docs/operations.md` §3.4)
- [ ] 月次の収益・コスト集計フロー

### §2.4 マーケティング

- [ ] Landing page の文言・FAQ・価格表
- [ ] デモ動画
- [ ] HN / Reddit / X 用の告知文ドラフト
- [ ] 最初の 3 件は割引価格でフィードバック収集する設計

### §2.5 セキュリティ

- [ ] 全シークレットがローカルに残っていない
- [ ] GitHub App パーミッションが最小権限
- [ ] Webhook 署名検証が全エンドポイントで有効
- [ ] CSP / セキュリティヘッダ（Landing / Dashboard）

---

## §3. ローンチ後マイルストーン

| 時点 | チェックポイント |
|---|---|
| 公開 +1 週 | 初回顧客 1 名獲得、フィードバックループ確立 |
| 公開 +1 月 | 月次粗利 ¥3 万円、致命的バグ ゼロ |
| 公開 +3 月 | 月次粗利 ¥7 万円、完了率 70% |
| 公開 +6 月 | 月次粗利 ¥10 万円、完了率 80% |
| 公開 +1 年 | 横展開 / 日本円対応 / 月次サブスクの検討開始 |

---

## 関連ドキュメント

- 状態: `docs/status.md`
- 事業: `docs/business.md`
- 開発: `docs/development.md`
- 運用: `docs/operations.md`
