# ヒアリング候補リストテンプレート

Phase 0 市場検証 (`docs/decisions/0001-market-validation.md`) のために、
アウトリーチ対象を一覧で管理する雛形。

## 使い方

1. 本ファイルをコピーして
   `docs/decisions/interview-candidates.md` として保存する
2. 個人情報・連絡先を含むため、状況に応じて `.gitignore` 化を検討する
3. 1 行 = 1 候補。ステータスを更新しながら使う
4. 5 名分の **判定済 (Strong/Soft/Vague/No)** が揃うまで継続的に追加する

---

## ステータス値

| 値 | 意味 |
|---|---|
| `prospect` | 候補として記載のみ、未連絡 |
| `outreach` | DM / メール送信済、返信待ち |
| `scheduled` | 日程確定 |
| `done` | ヒアリング実施済、記録ファイル作成済 |
| `declined` | 断られた / 反応なし（2 週間で打ち切り） |
| `dropped` | 反 ICP 判明、母集団から除外 |

## セグメント値

`docs/decisions/0001-market-validation.md` §1.3 を参照（A〜E、努力目標）。

---

## 候補リスト本体

| # | 仮名 / initials | 経路 | セグメント目安 | 所属規模（推定） | ステータス | 次のアクション | 記録ファイル |
|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  | prospect |  | — |
| 2 |  |  |  |  | prospect |  | — |
| 3 |  |  |  |  | prospect |  | — |
| 4 |  |  |  |  | prospect |  | — |
| 5 |  |  |  |  | prospect |  | — |

### 列の説明

- **仮名 / initials**: 公開リポジトリに置く場合は実名を避ける
- **経路**: 「X DM @handle」「Discord #nextjs」「OSS: org/repo の commit author」「紹介: <紹介者>」など、なるべく具体的に
- **セグメント目安**: A〜E（不明なら空欄）
- **所属規模（推定）**: エンジニア人数の概算。ヒアリングで確定したら更新
- **ステータス**: 上記の値
- **次のアクション**: 「DM 返信待ち」「日程調整」「2026-05-03 14:00 予定」など
- **記録ファイル**: ヒアリング後に `docs/decisions/interviews/<YYYY-MM-DD>-<initials>.md` へのリンクを記入

---

## 進捗集計（手動更新）

- 連絡済: ___ / アポ取得: ___ / 実施済: ___
- 判定内訳: Strong yes ___ / Soft yes ___ / Vague ___ / No ___
- Phase 1 着手まで: あと **Strong yes ___ 名**

---

## 関連ドキュメント

- ADR-0001: `docs/decisions/0001-market-validation.md`
- 記録テンプレート: `docs/templates/interview-record.md`
- アウトリーチ DM: `docs/templates/outreach-messages.md`
