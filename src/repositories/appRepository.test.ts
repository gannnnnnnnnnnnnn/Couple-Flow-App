import { describe, expect, it } from 'vitest';
import { createPairCode, normalizePairCode } from './appRepository';

describe('repository helpers', () => {
  it('normalizes pair codes for joins', () => {
    expect(normalizePairCode(' ab-12 c ')).toBe('AB12C');
  });

  it('creates readable six-character pair codes', () => {
    expect(createPairCode(() => 0.1)).toMatch(/^[A-Z0-9]{6}$/);
    expect(createPairCode(() => 0.1)).toHaveLength(6);
  });
});
