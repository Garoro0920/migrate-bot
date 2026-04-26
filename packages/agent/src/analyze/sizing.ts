import type { Plan } from '../types';

export const PLAN_THRESHOLDS = {
  small: 100,
  medium: 500,
  large: 2000,
} as const;

export function recommendPlan(pageCount: number): Plan {
  if (pageCount > PLAN_THRESHOLDS.large) return 'enterprise';
  if (pageCount > PLAN_THRESHOLDS.medium) return 'large';
  if (pageCount > PLAN_THRESHOLDS.small) return 'medium';
  return 'small';
}
