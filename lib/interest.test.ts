import { describe, expect, it } from "vitest";
import { calculateLoanBalance } from "./interest";

describe("calculateLoanBalance", () => {
  it("charges the first month's interest immediately on disbursement, even repaid same day", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [{ amount: 1000, paidOn: "2025-01-01" }],
      "2025-01-01"
    );
    // The 300 interest was charged the instant the loan was disbursed, so
    // repaying the 1000 principal the same day still leaves it owing.
    expect(result.balance).toBe(300);
    expect(result.monthsElapsed).toBe(1);
  });

  it("lets a same-day payment clear the loan only if it covers principal plus that day's interest", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [{ amount: 1300, paidOn: "2025-01-01" }],
      "2025-01-01"
    );
    expect(result.balance).toBe(0);
    expect(result.isPaidOff).toBe(true);
  });

  it("sums multiple payments made within the same still-open period", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [
        { amount: 50, paidOn: "2025-01-05" },
        { amount: 150, paidOn: "2025-01-20" },
      ],
      "2025-01-25"
    );
    // 1000 + 300 interest - 200 in payments = 1100.
    expect(result.balance).toBe(1100);
  });

  it("stays flat when each period's interest is paid before the next period begins", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [
        { amount: 300, paidOn: "2025-01-15" },
        { amount: 300, paidOn: "2025-02-15" },
      ],
      "2025-02-16"
    );
    expect(result.balance).toBe(1000);
    expect(result.monthsElapsed).toBe(2);
  });

  it("compounds interest-on-interest when a period is skipped entirely", () => {
    const result = calculateLoanBalance(1000, 30, "2025-01-01", [], "2025-02-28");
    // Month 1: 1000 * 1.3 = 1300. Month 2: 1300 * 1.3 = 1690.
    // Simple (non-compounding) interest would only reach 1600.
    expect(result.balance).toBe(1690);
    expect(result.schedule[0].closingBalance).toBe(1300);
    expect(result.schedule[1].closingBalance).toBe(1690);
    expect(result.monthsElapsed).toBe(2);
  });

  it("applies a partial payment against the accrued interest, carrying the rest forward", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [{ amount: 100, paidOn: "2025-01-10" }],
      "2025-01-25"
    );
    // Opening 1000 + interest 300 = 1300, minus the 100 payment = 1200.
    expect(result.balance).toBe(1200);
  });

  it("floors the balance at zero on overpayment and stops accruing (paid off)", () => {
    const result = calculateLoanBalance(
      500,
      30,
      "2025-01-01",
      [{ amount: 1000, paidOn: "2025-01-15" }],
      "2025-06-01"
    );
    // Opening 500 + interest 150 = 650, minus 1000 payment floors at 0.
    expect(result.balance).toBe(0);
    expect(result.isPaidOff).toBe(true);
    expect(result.monthsElapsed).toBe(1);
  });

  it("handles a month-end start date without drifting the anchor day every period", () => {
    const result = calculateLoanBalance(1000, 30, "2025-01-31", [], "2025-04-01");
    expect(result.schedule[0].periodEnd.toISOString().slice(0, 10)).toBe("2025-02-28");
    expect(result.schedule[1].periodEnd.toISOString().slice(0, 10)).toBe("2025-03-31");
  });
});
