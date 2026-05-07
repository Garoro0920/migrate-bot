# PR issue investigation template

> 顧客が「PR の品質に問題がある」と報告 → 調査開始の連絡。
> 即時 acknowledgment.md より丁寧に、具体的な調査着手を伝える。

---

## English version

```
Hi [CUSTOMER_NAME],

Thanks for the detailed report on the PR for [REPO_FULL_NAME].

I'm starting the investigation now. Specifically I'll look at:

- The diff of [#PR_NUMBER] for the patterns you've described
- Our agent's reasoning trace for that job (we keep these for
  internal QA)
- Whether the issue is reproducible on a similar repo and what
  prompt-level adjustments would help

I'll send a follow-up within [1 / 2] business days with one of:

a) Confirmation that we've identified the issue, an explanation of
   what went wrong, and either (i) a fix on our side and a re-run
   at no charge, or (ii) a full refund per Refund Policy §1

b) An explanation of why the migration produced what it did
   (sometimes the agent makes a defensible-but-different choice
   than what a senior engineer would write), with options for next
   steps

In the meantime, please feel free to:
- Hold off on merging the PR
- Add comments to the PR documenting specific lines that look
  wrong (those help our QA)
- Share any additional context (project conventions, related
  files we should be aware of, build commands beyond `next build`)

Sorry for the rough first impression. We'll make this right.

Best regards,
— migrate-bot support
```

## 日本語版

```
[CUSTOMER_NAME] 様

ご報告ありがとうございます。
[REPO_FULL_NAME] の PR についての詳細なご指摘、確かに承りました。

ただいま調査を開始しております。具体的には以下を確認いたします。

・[#PR_NUMBER] の差分について、ご指摘いただいたパターンの確認
・該当ジョブにおける当方 agent の推論ログ (内部 QA 用に保存しています)
・同様のリポジトリで再現する問題か、プロンプトレベルでの修正で
  改善するか

[1 / 2] 営業日以内に以下いずれかをお返しいたします。

a) 問題の特定と原因のご説明 + 当社側修正済みでの無償再実行 / または
   返金ポリシー第 1 条に基づく全額返金のご案内

b) なぜこの移行結果となったかのご説明 (agent の判断が、シニア
   エンジニアの書く形と違うが妥当な選択肢の場合があります)
   と次のステップの選択肢

調査完了までの間は以下をお勧めいたします:

・PR のマージを保留してお待ちください
・PR に「ここの行が違う」というコメントを残していただけると
  当方の QA に役立ちます
・追加の文脈情報 (プロジェクトの慣習、関連するファイル、
  next build 以外の build コマンド等) があればお知らせください

第一印象を損なってしまい申し訳ございません。
誠意を持って対応させていただきます。

引き続きどうぞよろしくお願いいたします。
migrate-bot サポート
```

---

## 埋める値

| プレースホルダ | 取得元 |
|---|---|
| `[CUSTOMER_NAME]` | メール署名から |
| `[REPO_FULL_NAME]` | 顧客メール または `orders.repo_full_name` |
| `[#PR_NUMBER]` | 顧客メール (リンクで送られてくる) または `jobs.pr_url` |
| `[1 / 2 営業日]` | 状況に応じて選択 (すぐ調査着手可なら 1、複雑なら 2) |

## 調査チェックリスト (operator 内部用)

`docs/customer-support/pr-issue-investigation.md` のテンプレ送信後、
operator が並行で実行する調査:

```powershell
# 1. job 状態確認
corepack pnpm --filter @migrate-bot/api exec wrangler d1 execute migrate-bot-prod --remote --env=prod --command "SELECT id, state, pr_url, cost_usd, tokens_input, tokens_output, error_code, error_detail, started_at, completed_at FROM jobs WHERE id = 'XXX'"

# 2. job_events で進行確認
corepack pnpm --filter @migrate-bot/api exec wrangler d1 execute migrate-bot-prod --remote --env=prod --command "SELECT * FROM job_events WHERE job_id = 'XXX' ORDER BY created_at"

# 3. PR 差分を gh CLI で取得
gh pr diff [PR_NUMBER] --repo [REPO_FULL_NAME] > /tmp/pr-diff.patch

# 4. Fly machine logs (まだ retention あれば)
flyctl logs -i [MACHINE_ID] --app migrate-bot-runner-prod --no-tail

# 5. 顧客指摘箇所を /tmp/pr-diff.patch から抽出して分析
```

## 結論パターン

| 調査結果 | 顧客対応 |
|---|---|
| agent の明確な誤り、build pass しているが lint 等で問題 | 修正再実行を offer (無償) |
| agent の誤り、build fail | Refund §1 該当 → `refund-approve-manual.md` |
| agent 妥当だが顧客期待と乖離 | 説明 + 50% クレジット offer |
| 顧客側修正後の問題 | `refund-decline.md` (慎重に) |
| 真因不明 (timeout / external service down) | Refund §2A "intentional misconduct or gross negligence" の余地、安全側で refund |
