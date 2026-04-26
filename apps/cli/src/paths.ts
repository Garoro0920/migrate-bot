import { resolve } from 'node:path';
import { findProjectRoot } from './project-root';

export function getUsageLogPath(): string {
  return resolve(findProjectRoot(), '.migrate-bot', 'usage.jsonl');
}

export function getDotenvPath(): string {
  return resolve(findProjectRoot(), '.env.local');
}
