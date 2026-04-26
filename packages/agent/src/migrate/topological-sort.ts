import type { MigrationTask } from '../types';

/**
 * Kahn's algorithm. Returns tasks in dependency-respecting order.
 * Throws on cyclic dependencies.
 */
export function topologicalSort(tasks: readonly MigrationTask[]): MigrationTask[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const incoming = new Map<string, number>();
  for (const t of tasks) incoming.set(t.id, t.dependsOn.length);

  const ready: string[] = [];
  for (const t of tasks) {
    if (t.dependsOn.length === 0) ready.push(t.id);
  }

  const result: MigrationTask[] = [];
  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) break;
    const task = taskById.get(id);
    if (!task) continue;
    result.push(task);

    for (const other of tasks) {
      if (!other.dependsOn.includes(id)) continue;
      const remaining = (incoming.get(other.id) ?? 0) - 1;
      incoming.set(other.id, remaining);
      if (remaining === 0) ready.push(other.id);
    }
  }

  if (result.length !== tasks.length) {
    throw new Error('topologicalSort: cycle detected in MigrationPlan');
  }
  return result;
}
