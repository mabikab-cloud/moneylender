import { addMonths, isAfter, isBefore } from "date-fns";

export interface PaymentInput {
  amount: number;
  paidOn: string | Date;
}

export interface ScheduleEntry {
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  interestAdded: number;
  paymentsApplied: number;
  closingBalance: number;
}

export interface LoanBalanceResult {
  balance: number;
  schedule: ScheduleEntry[];
  monthsElapsed: number;
  isPaidOff: boolean;
}

const MAX_PERIODS = 1200; // 100 years — safety cap against bad data / infinite loops

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function sumPaymentsInRange(
  payments: { amount: number; paidOn: Date }[],
  from: Date,
  to: Date,
  inclusiveEnd: boolean
): number {
  return round2(
    payments.reduce((sum, p) => {
      const afterStart = p.paidOn.getTime() >= from.getTime();
      const beforeEnd = inclusiveEnd
        ? p.paidOn.getTime() <= to.getTime()
        : p.paidOn.getTime() < to.getTime();
      return afterStart && beforeEnd ? sum + p.amount : sum;
    }, 0)
  );
}

/**
 * Computes a loan's outstanding balance as of `asOfDate`.
 *
 * Interest for a monthly period is charged the instant that period
 * begins — including the very first period, i.e. the day the money is
 * handed over — not prorated by how quickly it's repaid. So a loan repaid
 * in full an hour after disbursement still owes that first month's
 * interest, and a borrower who lets a period roll over without paying
 * owes the next period's interest on top of the unpaid balance (interest
 * on interest), because that unpaid interest was already folded into the
 * balance the new period's charge is computed from.
 *
 * Periods are anchored to the original `startDate` (via date-fns
 * `addMonths(startDate, n)`) rather than chained off the previous period's
 * end, so a start date like Jan 31 lands on Feb 28 for one period without
 * permanently dragging every later period's day-of-month down with it.
 */
export function calculateLoanBalance(
  principal: number,
  ratePercent: number,
  startDate: string | Date,
  payments: PaymentInput[],
  asOfDate: string | Date = new Date()
): LoanBalanceResult {
  const start = toDate(startDate);
  const asOf = toDate(asOfDate);
  const rate = ratePercent / 100;

  const sortedPayments = payments
    .map((p) => ({ amount: p.amount, paidOn: toDate(p.paidOn) }))
    .sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime());

  if (isBefore(asOf, start)) {
    return { balance: round2(principal), schedule: [], monthsElapsed: 0, isPaidOff: false };
  }

  let balance = round2(principal);
  const schedule: ScheduleEntry[] = [];
  let n = 0;

  while (n < MAX_PERIODS) {
    const periodStart = addMonths(start, n);
    if (isAfter(periodStart, asOf)) break;

    const periodEnd = addMonths(start, n + 1);
    const periodComplete = !isAfter(periodEnd, asOf);
    const windowEnd = periodComplete ? periodEnd : asOf;

    // This period's interest is charged now, the moment it begins.
    const opening = balance;
    const interestAdded = opening > 0 ? round2(opening * rate) : 0;
    let closing = round2(opening + interestAdded);

    const paymentsInPeriod = sumPaymentsInRange(sortedPayments, periodStart, windowEnd, !periodComplete);
    closing = round2(Math.max(0, closing - paymentsInPeriod));

    schedule.push({
      periodStart,
      periodEnd: windowEnd,
      openingBalance: opening,
      interestAdded,
      paymentsApplied: paymentsInPeriod,
      closingBalance: closing,
    });

    balance = closing;
    n += 1;

    if (!periodComplete) break;
    if (balance <= 0) break;
  }

  return { balance, schedule, monthsElapsed: n, isPaidOff: balance <= 0 };
}
