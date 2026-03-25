import { describe, it, expect } from 'vitest';
import {
  formatVND,
  formatUSD,
  vndToUsd,
  formatPrice,
  timeAgo,
  isNew,
  cn,
  getSourceColor,
  getSourceLabel,
} from '../lib/utils';

describe('formatVND', () => {
  it('returns N/A for null or zero', () => {
    expect(formatVND(null)).toBe('N/A');
    expect(formatVND(0)).toBe('N/A');
  });

  it('formats millions with triệu suffix', () => {
    expect(formatVND(10_000_000)).toBe('₫10 triệu');
    expect(formatVND(7_500_000)).toBe('₫7.5 triệu');
  });

  it('formats amounts under 1 million with locale', () => {
    const result = formatVND(500_000);
    expect(result).toContain('₫');
    expect(result).toContain('500');
  });
});

describe('vndToUsd', () => {
  it('converts VND to USD at the default rate', () => {
    expect(vndToUsd(25_500_000)).toBe(1000);
    expect(vndToUsd(12_750_000)).toBe(500);
  });
});

describe('formatUSD', () => {
  it('returns empty string for null', () => {
    expect(formatUSD(null)).toBe('');
  });

  it('formats dollar amounts', () => {
    expect(formatUSD(1000)).toBe('$1,000');
  });
});

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('getSourceColor / getSourceLabel', () => {
  it('returns known colors for sources', () => {
    expect(getSourceColor('facebook')).toBe('#1877F2');
    expect(getSourceColor('airbnb')).toBe('#FF5A5F');
  });

  it('returns fallback for unknown source', () => {
    expect(getSourceColor('unknown')).toBe('#6B7280');
  });

  it('returns label for known source', () => {
    expect(getSourceLabel('chotot')).toBe('Cho Tot');
  });

  it('returns raw string for unknown source', () => {
    expect(getSourceLabel('zillow')).toBe('zillow');
  });
});
