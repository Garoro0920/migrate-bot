# ADR-0000: テンプレート

> Status: template
> Date: YYYY-MM-DD
> Deciders: <operator, agent>

## 文脈 (Context)

何が起きていて、なぜ判断が必要なのか。
背景・前提・制約を簡潔に記述する。

## 検討した選択肢 (Options)

### Option A: <名前>

- 長所
- 短所
- コスト見積

### Option B: <名前>

- 長所
- 短所
- コスト見積

## 決定 (Decision)

採用した選択肢と、その理由を 1〜3 文で。

## 結果 (Consequences)

- 短期的な影響
- 長期的な影響
- 後続の判断への影響

## 関連リンク

- 関連 ADR: ADR-XXXX
- 関連 doc: `docs/...`
- 関連 PR: #...

---

## このテンプレートの使い方

1. このファイルを `docs/decisions/<番号>-<短い英名>.md` にコピー
2. 番号は連番 (0001, 0002, ...)。再利用しない
3. 一度確定した ADR は原則変更しない。変更が必要な場合は新しい ADR を起こす
   （旧 ADR の Status を `superseded by ADR-XXXX` に更新）
4. 重要な技術的判断は ADR を残すことで、後から「なぜそうしたか」を追跡可能に
5. ADR の対象例:
   - 主要な技術選定（フレームワーク、DB、インフラ）
   - 価格設定・課金構造の変更
   - セキュリティ境界の設計
   - 顧客向けポリシーの確立
6. ADR にしないもの:
   - 単なる実装詳細（コード、命名）
   - 一時的な対処
   - すでに `CLAUDE.md` や `docs/*.md` に記述されている自明な事項

## Status の値

- `proposed`: 提案中、未確定
- `accepted`: 採用済
- `rejected`: 却下
- `deprecated`: 過去に採用されたが現在は不採用
- `superseded by ADR-XXXX`: 別の ADR で置き換えられた

---

## 関連ドキュメント

- 憲章: `CLAUDE.md`
- 開発ルール: `docs/development.md`
