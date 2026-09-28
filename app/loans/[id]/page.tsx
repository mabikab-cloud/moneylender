import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateLoanBalance } from "@/lib/interest";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LoanPayment } from "@/lib/types";
import ConfirmForm from "@/components/ConfirmForm";
import { cancelLoan, closeLoan, deletePayment, recordPayment, reopenLoan } from "../actions";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: loan } = await supabase
    .from("loans")
    .select("*, borrowers(id, name)")
    .eq("id", id)
    .single();
  if (!loan) notFound();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("loan_id", id)
    .order("paid_on", { ascending: false })
    .returns<LoanPayment[]>();

  const result = calculateLoanBalance(
    loan.principal,
    loan.interest_rate,
    loan.start_date,
    (payments ?? []).map((p) => ({ amount: p.amount, paidOn: p.paid_on })),
    new Date()
  );

  const today = new Date().toISOString().slice(0, 10);
  const recordPaymentForLoan = recordPayment.bind(null, loan.id);
  const closeThisLoan = closeLoan.bind(null, loan.id);
  const reopenThisLoan = reopenLoan.bind(null, loan.id);
  const cancelThisLoan = cancelLoan.bind(null, loan.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/borrowers/${loan.borrowers.id}`} className="text-sm text-neutral-500 hover:underline">
        &larr; {loan.borrowers.name}
      </Link>

      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">
          {formatCurrency(loan.principal)} loan to {loan.borrowers.name}
        </h1>
        <p className="text-2xl font-semibold text-neutral-900">{formatCurrency(result.balance)}</p>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Started {formatDate(loan.start_date)} · {loan.interest_rate}% monthly, compounded · status: {loan.status}
      </p>
      {loan.notes ? <p className="mt-2 text-sm text-neutral-600">{loan.notes}</p> : null}

      <div className="mt-4 flex gap-2">
        {loan.status === "active" ? (
          <>
            <form action={closeThisLoan}>
              <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100">
                Mark closed
              </button>
            </form>
            <ConfirmForm
              action={cancelThisLoan}
              confirmMessage="Cancel this loan? It will be removed from your active totals, but stays on record and can be reopened later."
            >
              <button type="submit" className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                Cancel loan
              </button>
            </ConfirmForm>
          </>
        ) : (
          <form action={reopenThisLoan}>
            <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100">
              Reopen loan
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_260px]">
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Monthly schedule</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {result.schedule.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Period</th>
                    <th className="px-3 py-2 text-right font-medium">Opening</th>
                    <th className="px-3 py-2 text-right font-medium">Interest</th>
                    <th className="px-3 py-2 text-right font-medium">Payments</th>
                    <th className="px-3 py-2 text-right font-medium">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((entry, i) => (
                    <tr key={i} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2 text-neutral-600">
                        {formatDate(entry.periodStart)} – {formatDate(entry.periodEnd)}
                      </td>
                      <td className="px-3 py-2 text-right text-neutral-600">{formatCurrency(entry.openingBalance)}</td>
                      <td className="px-3 py-2 text-right text-amber-700">
                        {entry.interestAdded > 0 ? `+${formatCurrency(entry.interestAdded)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700">
                        {entry.paymentsApplied > 0 ? `-${formatCurrency(entry.paymentsApplied)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-neutral-900">{formatCurrency(entry.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-3 py-4 text-xs text-neutral-500">This loan hasn&apos;t started yet.</p>
            )}
          </div>

          <h2 className="mt-6 text-sm font-medium text-neutral-900">Payment history</h2>
          <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {payments && payments.length > 0 ? (
              <ul className="divide-y divide-neutral-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <p className="text-neutral-900">{formatDate(p.paid_on)}</p>
                      {p.note ? <p className="text-xs text-neutral-500">{p.note}</p> : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-neutral-900">{formatCurrency(p.amount)}</p>
                      <ConfirmForm
                        action={deletePayment.bind(null, p.id, loan.id)}
                        confirmMessage={`Reverse this ${formatCurrency(p.amount)} payment from ${formatDate(p.paid_on)}? This can't be undone.`}
                      >
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Remove
                        </button>
                      </ConfirmForm>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-sm text-neutral-500">No payments recorded yet.</p>
            )}
          </div>
        </div>

        <form action={recordPaymentForLoan} className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-900">Record payment</h2>
          <div>
            <label htmlFor="amount" className="block text-xs font-medium text-neutral-600">Amount (R)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="paid_on" className="block text-xs font-medium text-neutral-600">Date</label>
            <input
              id="paid_on"
              name="paid_on"
              type="date"
              defaultValue={today}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="note" className="block text-xs font-medium text-neutral-600">Note</label>
            <input
              id="note"
              name="note"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Add payment
          </button>
        </form>
      </div>
    </div>
  );
}
