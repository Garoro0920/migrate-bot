# CLAUDE.md — migrate-bot プロジェクト憲章

> **Project**: Next.js Pages Router → App Router 自動移行 GitHub App
> **Document version**: 0.6（Phase 4 進行中、prod 稼働中）
> **Last reviewed**: 2026-05-07
> **Owner (operator)**: 1 名

このファイルは Claude Code に対する**恒久的な憲章**である。
セッションごとに必ず読み込むのは本ファイルと `docs/status.md` のみで、
詳細仕様はトピック別に `docs/` 配下に分割している。

---

## §1. セッション開始プロトコル

新しいセッションで本プロジェクトに着手するときの手順:

1. **本ファイルを全文読む**
2. **`docs/status.md` を読む**（現在のフェーズ・着手中タスクの確認）
3. 直近のコミットと未コミット変更を確認（`git log -10`、`git status`）
4. **何に着手するかを 1〜3 行で宣言してから動き出す**
5. タスクに関連する詳細ドキュメント（§2 のマップ参照）を必要に応じて読む

憲章とインライン指示が矛盾したら、**動かず §6 に従って合意を取る**。
憲章はインライン指示より優先される。

---

## §2. ドキュメントマップ

| パス | 読むべき場面 |
|---|---|
| `CLAUDE.md`（本書） | 全セッションで必ず |
| `docs/status.md` | 全セッションで必ず |
| `docs/business.md` | 価格・顧客・市場・財務に関わる判断時 |
| `docs/architecture.md` | システム設計・データモデル・インフラ・リポジトリ構成 |
| `docs/agent.md` | Migration Agent 実装・プロンプト・スコープ |
| `docs/operations.md` | 自動運用・コスト・監視・インシデント・顧客対応 |
| `docs/development.md` | コーディングルール・テスト・eval・協業 |
| `docs/security.md` | セキュリティポリシー・プライバシー・キー管理・規制 |
| `docs/roadmap.md` | フェーズ・完了基準・ローンチチェックリスト |
| `docs/phase-2-deployment.md` | Phase 2 (dev 環境契約・構築) 手順 — 完了済 |
| `docs/phase-4-deployment.md` | Phase 4 (prod 環境構築・ローンチ) 手順 |
| `docs/legal-self-review-log.md` | Case C 法務自己レビュー記録(`docs/templates/legal/` 修正の根拠と引用一次資料) |
| `docs/customer-support/` | ローンチ後の顧客対応メールテンプレ 7 シナリオ |
| `docs/zelo-meeting-prep/` | ZeLo 法律事務所 法務相談 (5/12 火 17:00) の質問リスト・事前共有メール draft |
| `docs/runbooks/` | 運用ランブック (Stripe Live activation、D1 migration backfill 等) |
| `docs/templates/legal/` | 利用規約・プライバシーポリシー・返金ポリシー・特商法表記の各 md (placeholder 含む) |
| `docs/templates/launch-announcements/` | HN / Reddit / X ローンチ告知 draft |
| `docs/templates/` (その他) | demo-video-script、PR description 等の再利用テンプレ |
| `docs/decisions/` | Architecture Decision Records (ADR) |
| `docs/prompts/` | Agent プロンプト原本（バージョン管理） |

トピック別の判断:
- agent の挙動 → `docs/agent.md`
- システム構造 → `docs/architecture.md`
- どう出荷するか → `docs/roadmap.md`
- 安全に運用する → `docs/operations.md`
- 値段・顧客 → `docs/business.md`
- セキュリティ → `docs/security.md`

---

## §3. ミッション（要約）

Next.js Pages Router → App Router 移行を、GitHub App として完全自動化する。
顧客は install → 支払 → レビュー、の 3 ステップだけで移行を完了できる。
解析・コード変換・検証・PR 作成は agent が行う。
**成功 = 1 人運用で月額粗利 ¥10 万円以上を持続**。

詳細根拠は `docs/business.md`。

---

## §4. 思考の基本姿勢（最優先）

このプロジェクトの存続条件は「**毎回最善を選ぶこと**」である。

### §4.1 思考時間に制限を設けない
- 設計・ライブラリ・境界の決定では速さより質を優先
- 高コスト判断では必ず複数案を列挙し比較する
- extended thinking を必要に応じて活用、長考は推奨される

### §4.2 情報資源を最大限に活用する
- 訓練データ範囲外の事実は**必ず一次情報を確認**:
  WebFetch / WebSearch / 公式 docs / GitHub releases / npm
- 記憶や推測で実装しない
- 説明の際は「検証済」「推測」を明示

### §4.3 仮説と事実を区別する
- 「たぶん動く」「動くはず」で実装してはならない
- 不確実な API はドキュメント参照または実検証で確かめる

### §4.4 過去の自分を疑う
- 既存コード・コメント・本書も時間で陳腐化する
- 重要な判断点で再確認、ズレがあれば本書を更新する

### §4.5 コストを理由に思考を省略しない
- 検証・調査・テストの工数を API 使用量で削ってはならない
- ただし**顧客向け本番処理**ではコスト制約（`docs/operations.md`）を厳守

### §4.6 失敗の早期表明
- 設計が破綻し始めたら**即座に止めて報告**
- 隠して取り繕うより、早く認めるほうがプロジェクトに資する

### §4.7 一貫性の自己点検
- セッション内の決定が過去・本書と整合しているかを定期確認
- ズレを発見したら自発的に統一案を提案

---

## §5. 自動運用の必須原則（要約）

詳細は `docs/operations.md`。譲れない要点:

- **同期 handler は軽く**: 重い処理はキュー経由
- **常用運用は人手ゼロ**: ダッシュボード手動操作前提の設計を作らない
- **通知は異常時のみ**: 正常完了は顧客にだけ届く
- **自動マージしない**: マージは必ず顧客の手で
- **全 job が観測可能**: traceId、構造化ログ、トークン使用量、所要時間

---

## §6. 必ず確認を要するケース

独断せず operator の合意を取ってから実行する:

- **課金関連**: 価格変更、プラン変更、返金条件変更
- **外部契約**: 月額固定費が発生する新規サービス
- **セキュリティ**:
  - GitHub App パーミッション拡張
  - データ保持ポリシーの変更
  - 暗号化方式の変更
- **公開文言**: Landing page、利用規約、プライバシーポリシー、ローンチ投稿
- **本番デプロイ**: 初回および重要変更後の本番反映
- **ドメイン・ブランディング**: ドメイン取得、ロゴ作成、サービス名変更
- **顧客への謝罪・告知**: インシデント開示文
- **本書の重要変更**: §3, §4, §6 および詳細 docs で「要確認」と明示された箇所
- **destructive な Git**: force push、reset --hard、branch 削除

過去に同種の操作が承認されていても、**今回も再確認**する。
承認は今回限りであり、将来に自動拡張されない。

---

## §7. 用語集

| 用語 | 定義 |
|---|---|
| migration job / job | 1 リポジトリに対する 1 回の移行処理。`jobs` テーブル 1 レコードに相当 |
| runner | job を Fly.io Machine 上で実行する Node プロセス |
| agent | Claude Agent SDK ベースの移行処理パイプライン |
| operator | 本プロジェクトの運用責任者（= ユーザ）。1 人運用前提 |
| customer | 本サービスの利用者（開発者・チーム） |
| Pages Router | Next.js の旧ルーティング（`pages/` 配下） |
| App Router | Next.js の新ルーティング（`app/` 配下、Server Components 既定） |
| draft PR | GitHub の draft 状態の PR。CI green まで維持 |
| golden corpus | agent 評価用に固定した標準リポジトリ群 |
| eval | agent 出力品質の自動評価 |
| blocker | 安全な自動移行を阻む顧客リポジトリ側の要因 |

---

## §8. 本書の更新ルール

本書は生きたドキュメントである。

更新する局面:
- 基礎的な技術・製品判断が変わったとき
- フェーズが進み完了基準が確定したとき
- operator から方針転換の指示があったとき
- 一次情報の確認で本書の記述が古くなっていると判明したとき
- 非自明な学びを残すべきとき

更新の作法:
- **章番号 (§3, §4, …) は安定 ID。振り直さない**。新規章は末尾に追加
- **`Document version` をインクリメント**、`Last reviewed` を更新
- **コミットメッセージ**: `docs(charter): <理由>`（WHY 中心）
- §3, §4, §6 の実質変更は operator 確認必須（§6）

---

## §9. 憲章が曖昧なときの判断順

詳細 docs を参照しても解が出ない場合、以下の順で決める:

1. **operator の負担最小、コスト最小、品質最大**（本事業の根幹トレードオフ）
2. **§4 の思考姿勢**
3. **§6（迷ったら聞く）**

長期持続性が短期速度に勝つ。**マラソンであり、スプリントではない**。
