import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateLoanBalance } from "@/lib/interest";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Loan, LoanPayment } from "@/lib/types";

type LoanRow = Loan & { payments: Pick<LoanPayment, "amount" | "paid_on">[] };

export default async function BorrowerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: borrower } = await supabase.from("borrowers").select("*").eq("id", id).single();
  if (!borrower) notFound();

  const { data: loans } = await supabase
    .from("loans")
    .select("*, payments(amount, paid_on)")
    .eq("borrower_id", id)
    .order("start_date", { ascending: false })
    .returns<LoanRow[]>();

  const rows = (loans ?? []).map((loan) => {
    const result = calculateLoanBalance(
      loan.principal,
      loan.interest_rate,
      loan.start_date,
      loan.payments.map((p) => ({ amount: p.amount, paidOn: p.paid_on })),
      new Date()
    );
    return { loan, balance: result.balance };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/borrowers" className="text-sm text-neutral-500 hover:underline">
        &larr; Borrowers
      </Link>

      <div className="mt-2 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">{borrower.name}</h1>
        <Link
          href={`/loans/new?borrower=${borrower.id}`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          New loan
        </Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        {[borrower.phone, borrower.email].filter(Boolean).join(" · ") || "No contact details"}
      </p>
      {borrower.notes ? <p className="mt-2 text-sm text-neutral-600">{borrower.notes}</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {rows.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {rows.map(({ loan, balance }) => (
              <li key={loan.id}>
                <Link href={`/loans/${loan.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {formatCurrency(loan.principal)} principal
                      {loan.status === "closed" ? (
                        <span className="ml-2 text-xs text-neutral-400">(closed)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-neutral-500">Started {formatDate(loan.start_date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">{formatCurrency(balance)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-sm text-neutral-500">No loans recorded for this borrower yet.</p>
        )}
      </div>
    </div>
  );
}
