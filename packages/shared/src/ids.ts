import { randomUUID } from 'node:crypto';

// 型ブランディングで JobId / TraceId / InstallationId を区別。
// 値は UUID v4 文字列。

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type JobId = Brand<string, 'JobId'>;
export type TraceId = Brand<string, 'TraceId'>;
export type InstallationId = Brand<string, 'InstallationId'>;
export type CustomerId = Brand<string, 'CustomerId'>;

export function newJobId(): JobId {
  return randomUUID() as JobId;
}

export function newTraceId(): TraceId {
  return randomUUID() as TraceId;
}

export function newInstallationId(): InstallationId {
  return randomUUID() as InstallationId;
}

export function newCustomerId(): CustomerId {
  return randomUUID() as CustomerId;
}
