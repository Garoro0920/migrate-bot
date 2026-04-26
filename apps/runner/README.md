# @migrate-bot/runner

Fly.io Machine 上で動く Node プロセス。1 ジョブ = 1 マシン。
ジョブ ID を引数または env 経由で受け取り、agent パイプライン (analyze →
plan → migrate → verify → push → monitor) を実行し DB に状態を書く。

`docs/architecture.md` §1.1 構成図右下、`§6` 状態機械を駆動するプロセス。

## 使い方 (Phase 2 後半で実装)

```sh
JOB_ID=<uuid> tsx src/index.ts
```

Phase 2a 段階では:
- ジョブの状態遷移ロジック (`packages/shared` の assertTransition を使う)
- DB アクセスの抽象 (`JobStore` インターフェース)
- agent パイプラインの呼び出しとエラーハンドリング骨格
- テスト用に in-memory `JobStore` 実装
