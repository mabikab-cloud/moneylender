import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createLoan } from "../actions";

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ borrower?: string }>;
}) {
  const { borrower } = await searchParams;
  const supabase = await createClient();
  const { data: borrowers } = await supabase.from("borrowers").select("id, name").order("name");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-lg font-semibold text-neutral-900">New loan</h1>

      {!borrowers || borrowers.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          You need a borrower first. <Link href="/borrowers" className="underline">Add one here</Link>.
        </p>
      ) : (
        <form action={createLoan} className="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
          <div>
            <label htmlFor="borrower_id" className="block text-xs font-medium text-neutral-600">Borrower</label>
            <select
              id="borrower_id"
              name="borrower_id"
              required
              defaultValue={borrower ?? ""}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>Select a borrower</option>
              {borrowers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="principal" className="block text-xs font-medium text-neutral-600">Principal (R)</label>
            <input
              id="principal"
              name="principal"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="interest_rate" className="block text-xs font-medium text-neutral-600">Monthly interest rate (%)</label>
            <input
              id="interest_rate"
              name="interest_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={30}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="start_date" className="block text-xs font-medium text-neutral-600">Start date</label>
            <input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={today}
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-neutral-600">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create loan
          </button>
        </form>
      )}
    </div>
  );
}
