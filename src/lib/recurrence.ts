/**
 * Recurrence engine — the heart of Thymely.
 *
 * A task recurs on an interval described by:
 *   - frequency:  'day' | 'week' | 'month'
 *   - interval:   a positive integer N (e.g. 3 => "every 3 weeks")
 *   - repeatFrom: 'completion' | 'due_date'
 *       * 'completion' — the next due date is measured from the day the task was
 *         actually completed (typical for treatments: fertilizer/insecticide that
 *         should be re-applied N days after the last application).
 *       * 'due_date'   — the next due date stays anchored to the schedule (typical
 *         for calendar chores). Completing early keeps the same cadence; completing
 *         late rolls forward to the next slot that is still in the future.
 *
 * All dates are handled as calendar dates (no time-of-day) using UTC midnight to
 * avoid timezone drift. The canonical string form is 'YYYY-MM-DD'.
 */

export type Frequency = 'day' | 'week' | 'month';
export type RepeatFrom = 'completion' | 'due_date';

export interface RecurrenceRule {
  frequency: Frequency;
  interval: number;
  repeatFrom: RepeatFrom;
}

/** A date-only string in `YYYY-MM-DD` form. */
export type DateString = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a `YYYY-MM-DD` string into a Date at UTC midnight. */
export function parseDate(value: DateString): Date {
  if (!DATE_RE.test(value)) {
    throw new Error(`Invalid date string: "${value}" (expected YYYY-MM-DD)`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Guard against invalid calendar dates like 2024-02-30 rolling over.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new Error(`Invalid calendar date: "${value}"`);
  }
  return date;
}

/** Format a Date (interpreted in UTC) as a `YYYY-MM-DD` string. */
export function formatDate(date: Date): DateString {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's calendar date in the given/local timezone, as a `YYYY-MM-DD` string. */
export function today(now: Date = new Date()): DateString {
  const y = now.getFullYear().toString().padStart(4, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add a number of days to a `YYYY-MM-DD` string. */
export function addDays(value: DateString, days: number): DateString {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

/**
 * Add a number of calendar months to a `YYYY-MM-DD` string. If the target month
 * has fewer days than the source day-of-month, the result is clamped to the last
 * day of the target month (e.g. Jan 31 + 1 month => Feb 28/29).
 */
export function addMonths(value: DateString, months: number): DateString {
  const date = parseDate(value);
  const day = date.getUTCDate();
  // Move to the first of the month before shifting to avoid overflow.
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth());
  date.setUTCDate(Math.min(day, lastDay));
  return formatDate(date);
}

function daysInMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

/** Advance a date by one "step" of the given rule (interval * frequency unit). */
export function addInterval(
  value: DateString,
  frequency: Frequency,
  interval: number,
): DateString {
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`interval must be a positive integer, got ${interval}`);
  }
  switch (frequency) {
    case 'day':
      return addDays(value, interval);
    case 'week':
      return addDays(value, interval * 7);
    case 'month':
      return addMonths(value, interval);
    default:
      throw new Error(`Unknown frequency: ${frequency as string}`);
  }
}

/** Compare two date strings. Returns <0, 0, or >0. */
export function compareDates(a: DateString, b: DateString): number {
  return parseDate(a).getTime() - parseDate(b).getTime();
}

/**
 * Compute the next due date after a completion.
 *
 * @param rule         the recurrence rule
 * @param currentDue   the date the task was due before this completion
 * @param completedOn  the date the task was actually completed
 * @returns the new `next_due_date`
 */
export function nextDueDate(
  rule: RecurrenceRule,
  currentDue: DateString,
  completedOn: DateString,
): DateString {
  const { frequency, interval, repeatFrom } = rule;

  if (repeatFrom === 'completion') {
    // Simply measure the next occurrence from the completion date.
    return addInterval(completedOn, frequency, interval);
  }

  // repeatFrom === 'due_date' — stay anchored to the schedule.
  // Advance one interval from the scheduled due date, then, if the task was
  // completed so late that the next slot is already past, keep rolling forward
  // until we land strictly after the completion date. This preserves the
  // original cadence/alignment while skipping missed occurrences.
  let next = addInterval(currentDue, frequency, interval);
  while (compareDates(next, completedOn) <= 0) {
    next = addInterval(next, frequency, interval);
  }
  return next;
}

/**
 * The first due date for a brand-new task. The task becomes due on its anchor
 * date (the day the user says the schedule starts, defaulting to today).
 */
export function initialDueDate(anchorDate: DateString): DateString {
  return anchorDate;
}

/** Whether a task with the given next due date is due on/before the reference day. */
export function isDue(nextDue: DateString, reference: DateString = today()): boolean {
  return compareDates(nextDue, reference) <= 0;
}

/** How many days a task is overdue (negative if it is upcoming). */
export function daysOverdue(nextDue: DateString, reference: DateString = today()): number {
  const ms = parseDate(reference).getTime() - parseDate(nextDue).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * A human-readable summary of a rule, e.g. "Every 3 weeks (from completion)".
 */
export function describeRule(rule: RecurrenceRule): string {
  const { frequency, interval, repeatFrom } = rule;
  const unit = interval === 1 ? frequency : `${frequency}s`;
  const cadence = interval === 1 ? `Every ${frequency}` : `Every ${interval} ${unit}`;
  const from = repeatFrom === 'completion' ? 'from completion' : 'on schedule';
  return `${cadence} (${from})`;
}

/**
 * Project the next N upcoming occurrences of a task from its current due date,
 * assuming it is completed exactly on each due date. Useful for the calendar
 * preview of future work. Does not mutate anything.
 */
export function upcomingOccurrences(
  rule: RecurrenceRule,
  currentDue: DateString,
  count: number,
): DateString[] {
  const dates: DateString[] = [];
  let due = currentDue;
  for (let i = 0; i < count; i++) {
    dates.push(due);
    // For projection we assume completion on the due date, so both modes behave
    // identically here (advance one interval from the due date).
    due = addInterval(due, rule.frequency, rule.interval);
  }
  return dates;
}
