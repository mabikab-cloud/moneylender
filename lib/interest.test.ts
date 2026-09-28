import { describe, expect, it } from "vitest";
import { calculateLoanBalance } from "./interest";

describe("calculateLoanBalance", () => {
  it("stays flat when interest is paid on time each month (no compounding)", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [
        { amount: 300, paidOn: "2025-01-15" },
        { amount: 300, paidOn: "2025-02-15" },
      ],
      "2025-03-01"
    );
    expect(result.balance).toBe(1000);
    expect(result.monthsElapsed).toBe(2);
  });

  it("compounds interest-on-interest when a month is skipped entirely", () => {
    const result = calculateLoanBalance(1000, 30, "2025-01-01", [], "2025-03-01");
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
      "2025-02-01"
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

  it("reduces the balance immediately for a payment in the current, still-incomplete month", () => {
    const result = calculateLoanBalance(
      1000,
      30,
      "2025-01-01",
      [{ amount: 200, paidOn: "2025-01-20" }],
      "2025-01-25"
    );
    // Still inside the first month: no interest yet, just the payment applied.
    expect(result.balance).toBe(800);
    expect(result.monthsElapsed).toBe(0);
  });
});
