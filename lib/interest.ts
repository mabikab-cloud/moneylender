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
 * Computes a loan's outstanding balance as of `asOfDate`, compounding
 * `ratePercent` monthly on whatever balance remains unpaid at each month
 * boundary (so a skipped month accrues interest on the prior month's
 * interest too, not just the original principal).
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
    const periodEnd = addMonths(start, n + 1);

    if (isAfter(periodEnd, asOf)) {
      // Current, incomplete period: payments already made reduce the
      // balance immediately, but no interest accrues until month-end.
      if (isAfter(asOf, periodStart)) {
        const paymentsInPeriod = sumPaymentsInRange(sortedPayments, periodStart, asOf, true);
        if (paymentsInPeriod > 0) {
          const opening = balance;
          balance = round2(Math.max(0, balance - paymentsInPeriod));
          schedule.push({
            periodStart,
            periodEnd: asOf,
            openingBalance: opening,
            interestAdded: 0,
            paymentsApplied: paymentsInPeriod,
            closingBalance: balance,
          });
        }
      }
      break;
    }

    // Completed period: interest accrues on the opening balance, then
    // payments made within the period are subtracted.
    const opening = balance;
    const interestAdded = opening > 0 ? round2(opening * rate) : 0;
    const afterInterest = round2(opening + interestAdded);
    const paymentsInPeriod = sumPaymentsInRange(sortedPayments, periodStart, periodEnd, false);
    balance = round2(Math.max(0, afterInterest - paymentsInPeriod));

    schedule.push({
      periodStart,
      periodEnd,
      openingBalance: opening,
      interestAdded,
      paymentsApplied: paymentsInPeriod,
      closingBalance: balance,
    });

    n += 1;

    if (balance <= 0) break;
  }

  return { balance, schedule, monthsElapsed: n, isPaidOff: balance <= 0 };
}
