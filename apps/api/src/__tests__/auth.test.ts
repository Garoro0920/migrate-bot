import { describe, expect, it } from 'vitest';
import { checkBearerAuth, extractBearerToken, timingSafeEqual } from '../auth';

describe('extractBearerToken', () => {
  it('returns token from "Bearer <token>"', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('handles tabs and multiple spaces between scheme and token', () => {
    expect(extractBearerToken('Bearer    abc')).toBe('abc');
  });

  it('returns null for missing header', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null for non-bearer schemes', () => {
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('abc')).toBeNull();
  });
});

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('hello', 'hello')).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(timingSafeEqual('hello', 'world')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(timingSafeEqual('hello', 'helloworld')).toBe(false);
  });
});

describe('checkBearerAuth', () => {
  it('passes when bearer token matches expected', () => {
    expect(checkBearerAuth('Bearer secret', 'secret')).toBe(true);
  });

  it('rejects mismatched token', () => {
    expect(checkBearerAuth('Bearer wrong', 'secret')).toBe(false);
  });

  it('rejects missing header', () => {
    expect(checkBearerAuth(null, 'secret')).toBe(false);
  });
});
