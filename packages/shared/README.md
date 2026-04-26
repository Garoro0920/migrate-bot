# @migrate-bot/shared

複数 app/package で共有する型・状態機械・ユーティリティ。

## 内容

- `src/job-state.ts`: ジョブの状態機械 (`docs/architecture.md` §6)。
  - `JobState`: 13 状態の union 型
  - `canTransition(from, to)`: 遷移許可判定
  - `assertTransition(from, to)`: 不正遷移を throw
  - `isTerminal(state)`: 終端判定
  - `STATE_SLA_MS`: 各状態の SLA (ミリ秒)
- `src/concurrency.ts`: Promise 単純セマフォと指数バックオフ
  (`docs/agent.md` §1.10)。
- `src/ids.ts`: trace ID / job ID 生成 (UUID v4)。
