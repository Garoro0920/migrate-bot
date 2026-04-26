// Queue 抽象。本番は Cloudflare Queues binding を実装、テストは in-memory。
// docs/architecture.md §1.1 の Queue は webhook 受信側 (producer) と consumer
// Worker の境界に置く。

export interface QueueMessage<T> {
  readonly id: string;
  readonly body: T;
  readonly attempts: number;
}

export interface QueueProducer<T> {
  send(body: T): Promise<void>;
  sendBatch(bodies: readonly T[]): Promise<void>;
}

// in-memory 実装 (テスト + 開発用 admin CLI でも使う)
export class InMemoryQueue<T> implements QueueProducer<T> {
  private readonly store: Array<QueueMessage<T>> = [];
  private nextId = 1;

  async send(body: T): Promise<void> {
    this.store.push({ id: `msg-${this.nextId++}`, body, attempts: 0 });
  }

  async sendBatch(bodies: readonly T[]): Promise<void> {
    for (const b of bodies) await this.send(b);
  }

  drain(): readonly QueueMessage<T>[] {
    const out = [...this.store];
    this.store.length = 0;
    return out;
  }

  size(): number {
    return this.store.length;
  }
}

// 本プロジェクトで Queue に流す message body 型。
// runner が消費し、jobId と installationId から D1 を読んで実行する。
export interface JobQueueMessage {
  readonly jobId: string;
  readonly installationId: number;
  readonly traceId: string;
}
