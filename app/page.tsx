import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculateLoanBalance } from "@/lib/interest";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan, LoanPayment } from "@/lib/types";

type LoanRow = Loan & {
  borrowers: { name: string } | null;
  payments: Pick<LoanPayment, "amount" | "paid_on">[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: loans, error } = await supabase
    .from("loans")
    .select("*, borrowers(name), payments(amount, paid_on)")
    .order("start_date", { ascending: false })
    .returns<LoanRow[]>();

  if (error) {
    return <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-red-600">{error.message}</p>;
  }

  const rows = (loans ?? []).map((loan) => {
    const result = calculateLoanBalance(
      loan.principal,
      loan.interest_rate,
      loan.start_date,
      loan.payments.map((p) => ({ amount: p.amount, paidOn: p.paid_on })),
      new Date()
    );
    return { loan, balance: result.balance, monthsElapsed: result.monthsElapsed };
  });

  const active = rows.filter((r) => r.loan.status === "active");
  const inactive = rows.filter((r) => r.loan.status !== "active");
  const totalOutstanding = active.reduce((sum, r) => sum + r.balance, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          Total outstanding: <span className="font-semibold text-neutral-900">{formatCurrency(totalOutstanding)}</span>
        </p>
      </div>

      {active.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          No active loans yet. <Link href="/loans/new" className="underline">Record your first loan</Link>.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Borrower</th>
                <th className="px-4 py-2 font-medium">Principal</th>
                <th className="px-4 py-2 font-medium">Start date</th>
                <th className="px-4 py-2 font-medium">Months</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {active.map(({ loan, balance, monthsElapsed }) => (
                <tr key={loan.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/loans/${loan.id}`} className="font-medium text-neutral-900 hover:underline">
                      {loan.borrowers?.name ?? "Unknown"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-600">{formatCurrency(loan.principal)}</td>
                  <td className="px-4 py-2 text-neutral-600">{formatDate(loan.start_date)}</td>
                  <td className="px-4 py-2 text-neutral-600">{monthsElapsed}</td>
                  <td className="px-4 py-2 text-right font-semibold text-neutral-900">
                    {formatCurrency(balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inactive.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-neutral-500">Closed &amp; cancelled loans</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-500">
            {inactive.map(({ loan }) => (
              <li key={loan.id}>
                <Link href={`/loans/${loan.id}`} className="hover:underline">
                  {loan.borrowers?.name ?? "Unknown"} — {formatCurrency(loan.principal)} on {formatDate(loan.start_date)}{" "}
                  <span className={loan.status === "cancelled" ? "text-red-500" : "text-neutral-400"}>
                    ({loan.status})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
