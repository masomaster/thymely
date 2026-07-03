import { describe, expect, it } from 'vitest';

import {
  addDays,
  addInterval,
  addMonths,
  compareDates,
  daysOverdue,
  describeRule,
  formatDate,
  initialDueDate,
  isDue,
  nextDueDate,
  parseDate,
  today,
  upcomingOccurrences,
  type RecurrenceRule,
} from './recurrence';

describe('parseDate / formatDate', () => {
  it('round-trips a valid date', () => {
    expect(formatDate(parseDate('2026-07-02'))).toBe('2026-07-02');
  });

  it('pads single-digit months and days', () => {
    expect(formatDate(parseDate('2026-01-05'))).toBe('2026-01-05');
  });

  it('rejects malformed strings', () => {
    expect(() => parseDate('2026-7-2')).toThrow();
    expect(() => parseDate('not-a-date')).toThrow();
    expect(() => parseDate('20260702')).toThrow();
  });

  it('rejects impossible calendar dates', () => {
    expect(() => parseDate('2026-02-30')).toThrow();
    expect(() => parseDate('2026-13-01')).toThrow();
  });

  it('is timezone-stable at UTC midnight', () => {
    const d = parseDate('2026-07-02');
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);
    expect(d.getUTCDate()).toBe(2);
  });
});

describe('addDays', () => {
  it('adds within a month', () => {
    expect(addDays('2026-07-02', 5)).toBe('2026-07-07');
  });
  it('rolls over month boundaries', () => {
    expect(addDays('2026-07-30', 5)).toBe('2026-08-04');
  });
  it('rolls over year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
  it('subtracts with negative days', () => {
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
  });
  it('handles leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });
});

describe('addMonths', () => {
  it('adds a simple month', () => {
    expect(addMonths('2026-03-15', 1)).toBe('2026-04-15');
  });
  it('clamps to end of shorter month (Jan 31 + 1)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('clamps into leap February', () => {
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });
  it('rolls over the year', () => {
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
  it('handles multi-month intervals with clamping', () => {
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
  });
  it('subtracts months', () => {
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });
});

describe('addInterval', () => {
  it('adds days', () => {
    expect(addInterval('2026-07-02', 'day', 3)).toBe('2026-07-05');
  });
  it('adds weeks', () => {
    expect(addInterval('2026-07-02', 'week', 2)).toBe('2026-07-16');
  });
  it('adds months', () => {
    expect(addInterval('2026-07-02', 'month', 2)).toBe('2026-09-02');
  });
  it('rejects non-positive or non-integer intervals', () => {
    expect(() => addInterval('2026-07-02', 'day', 0)).toThrow();
    expect(() => addInterval('2026-07-02', 'day', -1)).toThrow();
    expect(() => addInterval('2026-07-02', 'day', 1.5)).toThrow();
  });
});

describe('nextDueDate — repeatFrom: completion', () => {
  const rule: RecurrenceRule = { frequency: 'week', interval: 1, repeatFrom: 'completion' };

  it('measures from the completion date, on-time', () => {
    // due Fri, done Fri -> next Fri
    expect(nextDueDate(rule, '2026-07-03', '2026-07-03')).toBe('2026-07-10');
  });

  it('measures from the completion date, done late', () => {
    // due Fri, done the following Mon -> next is Mon + 1 week
    expect(nextDueDate(rule, '2026-07-03', '2026-07-06')).toBe('2026-07-13');
  });

  it('measures from the completion date, done early', () => {
    // due Fri, done Wed -> next is Wed + 1 week
    expect(nextDueDate(rule, '2026-07-03', '2026-07-01')).toBe('2026-07-08');
  });

  it('respects interval N (every 3 weeks from completion)', () => {
    const r: RecurrenceRule = { frequency: 'week', interval: 3, repeatFrom: 'completion' };
    expect(nextDueDate(r, '2026-07-03', '2026-07-05')).toBe('2026-07-26');
  });

  it('works with monthly treatments', () => {
    const r: RecurrenceRule = { frequency: 'month', interval: 1, repeatFrom: 'completion' };
    expect(nextDueDate(r, '2026-01-31', '2026-01-31')).toBe('2026-02-28');
  });
});

describe('nextDueDate — repeatFrom: due_date', () => {
  const rule: RecurrenceRule = { frequency: 'week', interval: 1, repeatFrom: 'due_date' };

  it('stays anchored to the schedule when done on time', () => {
    expect(nextDueDate(rule, '2026-07-03', '2026-07-03')).toBe('2026-07-10');
  });

  it('stays anchored when done early (cadence preserved)', () => {
    // due Fri, done Wed -> still next Fri, NOT Wed + 1 week
    expect(nextDueDate(rule, '2026-07-03', '2026-07-01')).toBe('2026-07-10');
  });

  it('advances one interval when done slightly late but before next slot', () => {
    // due Fri Jul 3, done Sun Jul 5 -> next slot Jul 10 is still in the future
    expect(nextDueDate(rule, '2026-07-03', '2026-07-05')).toBe('2026-07-10');
  });

  it('rolls forward past missed occurrences when very late', () => {
    // weekly, due Jul 3, but not done until Jul 25 -> next future slot is Jul 31
    expect(nextDueDate(rule, '2026-07-03', '2026-07-25')).toBe('2026-07-31');
  });

  it('rolls forward to strictly after completion (skips same-day)', () => {
    // if completion lands exactly on a computed slot, skip to the next one
    expect(nextDueDate(rule, '2026-07-03', '2026-07-10')).toBe('2026-07-17');
  });

  it('preserves monthly calendar anchoring with clamping', () => {
    const r: RecurrenceRule = { frequency: 'month', interval: 1, repeatFrom: 'due_date' };
    expect(nextDueDate(r, '2026-01-31', '2026-01-31')).toBe('2026-02-28');
  });

  it('rolls forward multiple months when very late', () => {
    const r: RecurrenceRule = { frequency: 'month', interval: 1, repeatFrom: 'due_date' };
    // due Jan 15, not done until Apr 20 -> next slot May 15
    expect(nextDueDate(r, '2026-01-15', '2026-04-20')).toBe('2026-05-15');
  });
});

describe('helpers', () => {
  it('initialDueDate is the anchor date', () => {
    expect(initialDueDate('2026-07-02')).toBe('2026-07-02');
  });

  it('compareDates orders correctly', () => {
    expect(compareDates('2026-07-02', '2026-07-03')).toBeLessThan(0);
    expect(compareDates('2026-07-03', '2026-07-02')).toBeGreaterThan(0);
    expect(compareDates('2026-07-02', '2026-07-02')).toBe(0);
  });

  it('isDue is true on/before reference', () => {
    expect(isDue('2026-07-01', '2026-07-02')).toBe(true);
    expect(isDue('2026-07-02', '2026-07-02')).toBe(true);
    expect(isDue('2026-07-03', '2026-07-02')).toBe(false);
  });

  it('daysOverdue counts days past due', () => {
    expect(daysOverdue('2026-07-01', '2026-07-04')).toBe(3);
    expect(daysOverdue('2026-07-04', '2026-07-01')).toBe(-3);
    expect(daysOverdue('2026-07-02', '2026-07-02')).toBe(0);
  });

  it('today returns a valid YYYY-MM-DD string', () => {
    expect(today(new Date(2026, 6, 2))).toBe('2026-07-02');
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('describeRule renders readable text', () => {
    expect(describeRule({ frequency: 'week', interval: 1, repeatFrom: 'completion' })).toBe(
      'Every week (from completion)',
    );
    expect(describeRule({ frequency: 'week', interval: 3, repeatFrom: 'due_date' })).toBe(
      'Every 3 weeks (on schedule)',
    );
    expect(describeRule({ frequency: 'day', interval: 1, repeatFrom: 'due_date' })).toBe(
      'Every day (on schedule)',
    );
  });

  it('upcomingOccurrences projects future dates', () => {
    const rule: RecurrenceRule = { frequency: 'week', interval: 2, repeatFrom: 'completion' };
    expect(upcomingOccurrences(rule, '2026-07-02', 3)).toEqual([
      '2026-07-02',
      '2026-07-16',
      '2026-07-30',
    ]);
  });
});
