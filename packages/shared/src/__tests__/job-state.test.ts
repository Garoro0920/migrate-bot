import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
  isTerminal,
  JOB_STATES,
  nextStatesOf,
  STATE_SLA_MS,
} from '../job-state';

describe('canTransition', () => {
  it('allows queued -> analyzing', () => {
    expect(canTransition('queued', 'analyzing')).toBe(true);
  });

  it('allows queued -> cancelled (customer cancellation)', () => {
    expect(canTransition('queued', 'cancelled')).toBe(true);
  });

  it('rejects skipping stages (queued -> migrating)', () => {
    expect(canTransition('queued', 'migrating')).toBe(false);
  });

  it('allows mid-execution interruption to cost_exceeded', () => {
    expect(canTransition('analyzing', 'cost_exceeded')).toBe(true);
    expect(canTransition('planning', 'cost_exceeded')).toBe(true);
    expect(canTransition('migrating', 'cost_exceeded')).toBe(true);
    expect(canTransition('verifying', 'cost_exceeded')).toBe(true);
  });

  it('allows installation_revoked from any active state', () => {
    expect(canTransition('analyzing', 'installation_revoked')).toBe(true);
    expect(canTransition('migrating', 'installation_revoked')).toBe(true);
  });

  it('rejects transitioning out of terminal states', () => {
    expect(canTransition('pr_ready', 'analyzing')).toBe(false);
    expect(canTransition('refunded', 'analyzing')).toBe(false);
    expect(canTransition('cancelled', 'analyzing')).toBe(false);
  });

  it('refunding -> refunded is the only way out of refunding', () => {
    expect(canTransition('refunding', 'refunded')).toBe(true);
    expect(canTransition('refunding', 'pr_ready')).toBe(false);
  });

  it('verifying -> pr_ready or failed_ci', () => {
    expect(canTransition('verifying', 'pr_ready')).toBe(true);
    expect(canTransition('verifying', 'failed_ci')).toBe(true);
  });
});

describe('assertTransition', () => {
  it('returns void on valid transition', () => {
    expect(() => assertTransition('queued', 'analyzing')).not.toThrow();
  });

  it('throws InvalidTransitionError with from/to populated on invalid', () => {
    try {
      assertTransition('refunded', 'analyzing');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError);
      expect((err as InvalidTransitionError).from).toBe('refunded');
      expect((err as InvalidTransitionError).to).toBe('analyzing');
    }
  });
});

describe('isTerminal', () => {
  it('marks pr_ready, refunded, cancelled as terminal', () => {
    expect(isTerminal('pr_ready')).toBe(true);
    expect(isTerminal('refunded')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
  });

  it('marks active states as non-terminal', () => {
    expect(isTerminal('queued')).toBe(false);
    expect(isTerminal('analyzing')).toBe(false);
    expect(isTerminal('refunding')).toBe(false);
  });
});

describe('STATE_SLA_MS', () => {
  it('queued has 24h SLA', () => {
    expect(STATE_SLA_MS.queued).toBe(24 * 60 * 60 * 1000);
  });

  it('migrating has 2h SLA', () => {
    expect(STATE_SLA_MS.migrating).toBe(2 * 60 * 60 * 1000);
  });

  it('terminal states have no SLA', () => {
    expect(STATE_SLA_MS.pr_ready).toBeNull();
    expect(STATE_SLA_MS.refunded).toBeNull();
    expect(STATE_SLA_MS.cancelled).toBeNull();
  });

  it('has an entry for every JOB_STATES value', () => {
    for (const s of JOB_STATES) {
      expect(STATE_SLA_MS).toHaveProperty(s);
    }
  });
});

describe('nextStatesOf', () => {
  it('returns the same as TRANSITIONS lookup', () => {
    expect(nextStatesOf('queued')).toEqual(['analyzing', 'cancelled']);
    expect(nextStatesOf('verifying')).toContain('pr_ready');
    expect(nextStatesOf('verifying')).toContain('failed_ci');
  });

  it('returns empty for terminal states', () => {
    expect(nextStatesOf('pr_ready')).toEqual([]);
  });
});
