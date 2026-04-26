import { describe, expect, it } from 'vitest';
import { analyze, migrate, plan, verify } from '../index';

describe('agent pipeline skeleton', () => {
  it('exports the four Phase 1 stages as functions', () => {
    expect(typeof analyze).toBe('function');
    expect(typeof plan).toBe('function');
    expect(typeof migrate).toBe('function');
    expect(typeof verify).toBe('function');
  });

  it('analyze rejects with not-implemented during skeleton phase', async () => {
    await expect(analyze({ localPath: '/tmp/nope', source: 'example' })).rejects.toThrow(
      /not implemented/,
    );
  });
});
