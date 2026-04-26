# security.md — セキュリティ・プライバシー

> Last reviewed: 2026-04-26
> 関連: 憲章 §6、`docs/operations.md`、`docs/architecture.md`

---

## §1. 脅威モデル（簡易）

主要な保護対象と想定脅威:

| 保護対象 | 想定脅威 |
|---|---|
| 顧客リポジトリのソースコード | 第三者への漏洩、学習データ目的の保存 |
| 顧客のメールアドレス | 不正取得・転売 |
| API キー（Anthropic, GitHub, Stripe） | 漏洩による不正利用・課金詐取 |
| Stripe 支払情報 | カード情報は Stripe のみが保持（PCI 対応） |
| 本サービス自体の運用 | DDoS、不正な job 投入、悪意ある repo |

---

## §2. GitHub App パーミッション（最小権限）

- `contents: write`（branch 作成・push）
- `pull_requests: write`（PR 作成）
- `metadata: read`
- **拒否**: `administration`, `workflows`, `secrets`, `members`

パーミッション拡張は憲章 §6 により operator 確認必須。

---

## §3. 顧客データの取り扱い

### §3.1 ライフサイクル

1. **取得**: GitHub App 経由で対象 repo を Fly.io Machine にクローン
2. **処理**: Machine 内でのみ展開、Anthropic API へ部分送信
3. **破棄**: ジョブ終了時に Machine ごと破棄

### §3.2 ルール

- 顧客リポジトリのソースコードは migration job 実行中のみ Fly.io Machine 上に存在
- ジョブ終了時に machine ごと破棄（永続層には残さない）
- ログに**コードスニペットは含めない**（ファイル名・行番号・差分の要約のみ）
- Anthropic API への送信は不可避だが、それ以外の第三者サービスへは送信しない
- プライバシーポリシーで上記を明示

### §3.3 禁止事項

- 顧客リポジトリへの force push、branch 削除
- main / master への直接 push
- 顧客の secrets / .env を読む処理（agent ツールで除外）
- 顧客リポジトリの内容を学習・改善目的で保存
- 顧客のメール・名前を必要以上に保持

---

## §4. キー管理

### §4.1 保管

- Anthropic API key、GitHub App private key、Stripe secret key は
  Cloudflare Secrets / Fly.io Secrets で管理
- ローカル開発では `.env.local`（`.gitignore` 必須）

### §4.2 ローテーション

- 定期ローテーション: 6 ヶ月毎
- 緊急ローテーション: 漏洩疑義時に即時
- 手順は本ファイル §4.4 と運用ハンドブック（別途）に記載

### §4.3 アクセス制御

- 本番キーは operator のみがアクセス可能
- 開発キーは個人開発環境にのみ配置
- CI からアクセスする際は GitHub Actions Secrets を使用

### §4.4 漏洩時の対応

1. 該当キーを即座に無効化（各サービスのダッシュボードから）
2. 新しいキーを発行
3. Cloudflare/Fly Secrets を更新
4. デプロイで反映、ヘルスチェック
5. ログから漏洩経路を調査
6. 顧客影響があれば 24h 以内に開示

---

## §5. 法令・規約

### §5.1 GDPR

- EU 顧客に対しては、プライバシーポリシーで処理目的・保持期間・削除権を明示
- 削除請求があれば 30 日以内に対応

### §5.2 日本の特定商取引法

- ローンチ時に表記準備（Phase 4 で operator 確認）
- 個人事業の場合の住所開示は私書箱代行サービスを検討

### §5.3 Anthropic 利用規約

- 顧客向けに「Anthropic API を利用してコード変換を行う」旨を開示
- Anthropic の利用規約変更を月次で確認（`docs/operations.md` §1.3）

### §5.4 GitHub 規約

- GitHub Marketplace 規約遵守
- パーミッション仕様変更を月次で確認

---

## §6. 監査

### §6.1 全アクセスのログ化

- 顧客 repo へのアクセスは all-or-nothing で記録
- D1 への書き込みは Drizzle ログで再現可能
- Stripe 取引は Stripe Dashboard と D1 双方に保存

### §6.2 セキュリティレビューの頻度

- 四半期に 1 回、本書を全文レビュー
- 新機能リリース時はセキュリティ観点の自己チェックを必須

---

## 関連ドキュメント

- 憲章: `CLAUDE.md`
- 運用: `docs/operations.md`
- システム構成: `docs/architecture.md`
