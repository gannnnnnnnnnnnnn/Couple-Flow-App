import { describe, expect, it } from 'vitest';
import { getNextWeekStartDate, getWeekStartDate } from './week';

describe('week helpers', () => {
  it('calculates the current week start from the pair timezone', () => {
    expect(
      getWeekStartDate(new Date('2026-06-28T15:30:00.000Z'), 'Australia/Melbourne'),
    ).toBe('2026-06-29');
  });

  it('calculates next week from a stored week start date', () => {
    expect(getNextWeekStartDate('2026-06-29')).toBe('2026-07-06');
  });
});
