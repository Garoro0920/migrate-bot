import type { JobQueueMessage, QueueProducer } from '@migrate-bot/shared';

// Cloudflare Queues binding を本プロジェクトの QueueProducer interface に
// 変換する thin adapter。
//
// CF Queue<T> は send(body)/sendBatch([{body}]) という API なので、
// 同じ shape にマッピング。

export interface CloudflareQueue<T> {
  send(body: T, options?: { contentType?: string; delaySeconds?: number }): Promise<void>;
  sendBatch(messages: Array<{ body: T }>): Promise<void>;
}

export function wrapCloudflareQueue(
  queue: CloudflareQueue<JobQueueMessage>,
): QueueProducer<JobQueueMessage> {
  return {
    async send(body) {
      await queue.send(body);
    },
    async sendBatch(bodies) {
      await queue.sendBatch(bodies.map((body) => ({ body })));
    },
  };
}
