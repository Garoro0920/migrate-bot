import { describe, expect, it } from 'vitest';
import { newCustomerId, newInstallationId, newJobId, newTraceId } from '../ids';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('id generators', () => {
  it('newJobId returns a UUID v4', () => {
    expect(newJobId()).toMatch(UUID_RE);
  });

  it('newTraceId returns a UUID v4', () => {
    expect(newTraceId()).toMatch(UUID_RE);
  });

  it('newInstallationId returns a UUID v4', () => {
    expect(newInstallationId()).toMatch(UUID_RE);
  });

  it('newCustomerId returns a UUID v4', () => {
    expect(newCustomerId()).toMatch(UUID_RE);
  });

  it('produces unique values across calls', () => {
    const ids = new Set([newJobId(), newJobId(), newJobId(), newJobId()]);
    expect(ids.size).toBe(4);
  });
});
