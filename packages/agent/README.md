# @migrate-bot/agent

Migration agent パイプラインの実装。
仕様: [`docs/agent.md`](../../docs/agent.md) §1。

## パイプライン (Phase 1 で骨格のみ)

| 段階 | ファイル | 状態 |
|---|---|---|
| Analyze | `src/analyze.ts` | 骨格（未実装） |
| Plan | `src/plan.ts` | 骨格（未実装） |
| Migrate | `src/migrate.ts` | 骨格（未実装） |
| Verify | `src/verify.ts` | 骨格（未実装） |
| Push / Monitor | — | Phase 2 以降 |

各段階のインタフェース型は `src/types.ts` に定義。
