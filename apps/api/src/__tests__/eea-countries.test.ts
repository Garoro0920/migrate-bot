import { describe, expect, it } from 'vitest';
import { EEA_UK_CH_COUNTRY_COUNT, isEeaUkCh } from '../eea-countries';

describe('EEA / UK / CH country list', () => {
  it('contains exactly 32 countries (EU 27 + EEA 3 + UK + CH)', () => {
    expect(EEA_UK_CH_COUNTRY_COUNT).toBe(32);
  });
});

describe('isEeaUkCh', () => {
  it('returns true for EU member states (alpha-2)', () => {
    for (const code of ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'IE', 'GR']) {
      expect(isEeaUkCh(code)).toBe(true);
    }
  });

  it('returns true for EEA-only members (Iceland / Liechtenstein / Norway)', () => {
    for (const code of ['IS', 'LI', 'NO']) {
      expect(isEeaUkCh(code)).toBe(true);
    }
  });

  it('returns true for United Kingdom (GB)', () => {
    expect(isEeaUkCh('GB')).toBe(true);
  });

  it('returns true for Switzerland (CH)', () => {
    expect(isEeaUkCh('CH')).toBe(true);
  });

  it('returns false for non-EEA countries', () => {
    for (const code of ['JP', 'US', 'CA', 'AU', 'BR', 'MX', 'KR', 'SG', 'IN', 'CN', 'NZ']) {
      expect(isEeaUkCh(code)).toBe(false);
    }
  });

  it('handles lowercase input by uppercasing internally', () => {
    expect(isEeaUkCh('de')).toBe(true);
    expect(isEeaUkCh('gb')).toBe(true);
    expect(isEeaUkCh('jp')).toBe(false);
  });

  it('returns false for null / undefined / empty string', () => {
    expect(isEeaUkCh(null)).toBe(false);
    expect(isEeaUkCh(undefined)).toBe(false);
    expect(isEeaUkCh('')).toBe(false);
  });

  it('returns false for malformed input (not 2-letter code)', () => {
    expect(isEeaUkCh('Japan')).toBe(false);
    expect(isEeaUkCh('UNITED KINGDOM')).toBe(false);
    expect(isEeaUkCh('DEU')).toBe(false); // alpha-3, not alpha-2
  });

  it('does NOT include former member states (e.g., Russia, Turkey)', () => {
    expect(isEeaUkCh('RU')).toBe(false);
    expect(isEeaUkCh('TR')).toBe(false);
    expect(isEeaUkCh('UA')).toBe(false);
  });
});
