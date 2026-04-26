import { describe, expect, it } from 'vitest';
import { topologicalSort } from '../migrate/topological-sort';
import type { MigrationTask } from '../types';

function task(id: string, dependsOn: readonly string[] = []): MigrationTask {
  return {
    id,
    kind: 'agent',
    fileKind: 'static-page',
    sourcePath: `pages/${id}.tsx`,
    targetPath: `app/${id}/page.tsx`,
    description: id,
    dependsOn,
  };
}

describe('topologicalSort', () => {
  it('returns tasks with no deps in original order (deterministic)', () => {
    const ts = [task('a'), task('b'), task('c')];
    const result = topologicalSort(ts);
    expect(result.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('orders dependencies before dependents', () => {
    const ts = [task('child', ['parent']), task('parent')];
    const result = topologicalSort(ts);
    expect(result[0]?.id).toBe('parent');
    expect(result[1]?.id).toBe('child');
  });

  it('handles a chain a → b → c correctly', () => {
    const ts = [task('c', ['b']), task('a'), task('b', ['a'])];
    const ids = topologicalSort(ts).map((t) => t.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('handles diamond dependencies', () => {
    const ts = [
      task('top'),
      task('left', ['top']),
      task('right', ['top']),
      task('bottom', ['left', 'right']),
    ];
    const ids = topologicalSort(ts).map((t) => t.id);
    expect(ids.indexOf('top')).toBe(0);
    expect(ids.indexOf('bottom')).toBe(3);
  });

  it('throws on cyclic dependencies', () => {
    const ts = [task('a', ['b']), task('b', ['a'])];
    expect(() => topologicalSort(ts)).toThrow(/cycle/);
  });

  it('returns empty for empty input', () => {
    expect(topologicalSort([])).toEqual([]);
  });
});
