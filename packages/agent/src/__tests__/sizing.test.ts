import { describe, expect, it } from 'vitest';
import { recommendPlan } from '../analyze/sizing';

describe('recommendPlan', () => {
  it('returns small for <=100 files', () => {
    expect(recommendPlan(0)).toBe('small');
    expect(recommendPlan(1)).toBe('small');
    expect(recommendPlan(100)).toBe('small');
  });

  it('returns medium for 101-500 files', () => {
    expect(recommendPlan(101)).toBe('medium');
    expect(recommendPlan(500)).toBe('medium');
  });

  it('returns large for 501-2000 files', () => {
    expect(recommendPlan(501)).toBe('large');
    expect(recommendPlan(2000)).toBe('large');
  });

  it('returns enterprise for >2000 files', () => {
    expect(recommendPlan(2001)).toBe('enterprise');
    expect(recommendPlan(10000)).toBe('enterprise');
  });
});
