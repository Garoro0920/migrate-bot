# ADR-0002: Phase 0（市場検証）を skip し、Phase 1（PoC 実装）に直接着手する

> Status: accepted
> Date: 2026-04-26
> Deciders: operator, agent

## 文脈 (Context)

`docs/roadmap.md` §1.1 では実装着手前に Phase 0（5 名以上のヒアリングによる市場検証）の完了が前提とされていた。
ADR-0001 にてヒアリング設計（30 分・18 問・Strong yes 3 名で着手判定）を確定し、テンプレート一式（`docs/templates/interview-record.md`、`docs/templates/interview-candidates.md`、`docs/templates/outreach-messages.md`）も作成済みであった。

その後、operator は実施方針について以下の代替案を比較検討した:

| 案 | 内容 |
|---|---|
| A | ライブビデオ通話 5 件（ADR-0001 原案） |
| B | 書面 DM 回答のみ（5〜10 件） |
| C | ハイブリッド（書面 + 音声 3 件） |
| D | ランディングページ煙テスト |
| E | 公開情報の観察のみ |
| F | Phase 0 を skip し Phase 1 に直行 |

検討の結果、operator は **学生期間中の運用方針** として Option F を採用する判断を下した。

本 ADR はその判断を正式に記録し、ADR-0001 を supersede する。

## 検討した選択肢 (Options)

### Option A〜E

詳細は ADR-0001 §1〜§5 および直前のセッションログ参照。
それぞれ取得できる信号品質と operator 工数・心理負荷のトレードオフを評価したうえで不採用とした。

### Option F: Phase 0 skip（採用）

- 長所:
  - 学生期間中は実装スキルの研鑽に時間を集中投下できる
  - PoC 自体を将来的な市場検証の素材として転用できる（OSS 公開、デモ動画など）
  - アウトリーチ運用に必要な実務工数（候補発掘・DM 送信・日程調整・ヒアリング・記録）が不要
- 短所:
  - 市場が想定より薄い場合、Phase 1 の実装工数（推定 2〜4 週間）と Anthropic API コストが回収できないリスクがある
  - 憲章 §4.3「仮説と事実を区別する」との緊張関係。技術仮説は実測で検証されるが、市場仮説は未検証のまま Phase 1 を進める
- リスク緩和: §「結果」節に kill criteria を明文化、超過時に立ち止まる

## 決定 (Decision)

**Phase 0（市場検証）を skip し、Phase 1（ローカル PoC）に直接着手する。**

採用理由（operator 直接の言葉）:

> 学生期間中は技術検証を優先し、市場検証は社会人以降に実施する方針

## 結果 (Consequences)

### 短期

- Phase 1 §1.2（`docs/roadmap.md`）のチェックリストから着手
  - モノレポ初期化（pnpm + Turborepo）
  - `packages/agent` に Analyze + Plan + Migrate + Verify を実装
  - `apps/cli` に `pnpm migrate <repo-url>` を実装
- ADR-0001 は `superseded by ADR-0002` に変更
- 作成済のテンプレート（`docs/templates/interview-*.md`、`docs/templates/outreach-messages.md`）は将来の再利用に備えて保持する

### 長期

- 「市場検証は社会人以降」の方針は本 ADR の前提であり、operator の生活状況が変わった時点で再評価する
- Phase 1 完了時点で再度市場検証の要否を判断する（kill criteria § 参照）
- Phase 4（ローンチ準備）の前には何らかの市場検証を必ず通す必要がある（憲章 §3 の成功条件「月額粗利 ¥10 万円持続」を満たすには支払顧客の存在が必要であり、市場仮説の検証なしにローンチ判断はできない）

### 後続の判断への影響

- 本 ADR は Phase 0 を**永久に省略する決定ではない**。Phase 1 の途中・終了時、または将来のフェーズで市場検証を再開する余地を残す
- Phase 5 以降の横展開判断時にも、別領域での Phase 0 相当の検証が必要

---

## §1. Kill Criteria（中断・再評価のしきい値）

憲章 §4.6「失敗の早期表明」と `docs/operations.md` のコスト管理原則に基づき、
Phase 0 を skip するからこそ Phase 1 内で**事前確定の停止条件**を設ける。

以下のいずれかに該当した時点で**実装を一旦停止**し、当 ADR の見直し・ピボット検討・市場検証の再開のいずれかを判断する。

### §1.1 コスト超過

- 累計 Anthropic API 利用額 **$30 USD** 到達時点で進捗評価
- 累計 **$80 USD** 到達時点で強制停止、判断見直し

### §1.2 期間超過

- Phase 1 着手から **4 週間経過**で進捗評価
- **8 週間経過**で強制停止、判断見直し

### §1.3 技術検証の不達

- 検証対象 1 件目（`vercel/next.js` の `examples/with-typescript`）で
  CI green 相当に到達できない場合は agent 設計を再考
- 2 件目（`examples/blog-starter`）でも到達できない場合は
  「自動移行が技術的に成立するか」自体の前提を再評価

### §1.4 市場シグナルの早期取得（任意・推奨）

- PoC が動作する状態に達した時点で、コードを公開リポジトリとして GitHub に push
- 2 週間で `Star`, `Issue`, `Discussion` のいずれかに反応がゼロなら、
  Phase 4 ローンチ前に明示的な市場検証ステップを挿入する判断を行う

### §1.5 評価結果の記録

各しきい値到達時の評価結果は、本 ADR の末尾「実施結果」節に追記する。

---

## 実施結果（Phase 1 進行中に追記）

### コスト評価ログ

| 日付 | 累計 API 額 | 評価 | 次のアクション |
|---|---|---|---|
|  |  |  |  |

### 期間評価ログ

| 日付 | Phase 1 着手からの経過 | 評価 | 次のアクション |
|---|---|---|---|
|  |  |  |  |

### 技術検証進捗

| 検証対象 | 状態 | 備考 |
|---|---|---|
| `vercel/next.js` の `examples/with-typescript` | 未着手 |  |
| `vercel/next.js` の `examples/blog-starter` | 未着手 |  |
| 自作の中規模 sample repo | 未着手 |  |

### 市場シグナル

PoC 公開後、2 週間時点での GitHub 反応:
- Star: ___
- Issue: ___
- Discussion / 言及: ___

---

## 関連リンク

- 関連 ADR: ADR-0001（superseded by 本 ADR）
- 憲章: `CLAUDE.md` §3, §4.3, §4.6
- ロードマップ: `docs/roadmap.md` §1.1, §1.2
- 事業設計: `docs/business.md` §3, §4
- 運用・コスト: `docs/operations.md`
