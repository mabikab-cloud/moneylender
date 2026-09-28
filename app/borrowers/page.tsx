import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createBorrower } from "./actions";

export default async function BorrowersPage() {
  const supabase = await createClient();
  const { data: borrowers, error } = await supabase
    .from("borrowers")
    .select("*")
    .order("name");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-lg font-semibold text-neutral-900">Borrowers</h1>

      {error ? <p className="mt-4 text-sm text-red-600">{error.message}</p> : null}

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {borrowers && borrowers.length > 0 ? (
            <ul className="divide-y divide-neutral-100">
              {borrowers.map((b) => (
                <li key={b.id}>
                  <Link href={`/borrowers/${b.id}`} className="block px-4 py-3 hover:bg-neutral-50">
                    <p className="text-sm font-medium text-neutral-900">{b.name}</p>
                    <p className="text-xs text-neutral-500">{b.phone || b.email || "No contact details"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-neutral-500">No borrowers yet.</p>
          )}
        </div>

        <form action={createBorrower} className="h-fit space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-900">New borrower</h2>
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-neutral-600">Name</label>
            <input
              id="name"
              name="name"
              required
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-neutral-600">Phone</label>
            <input
              id="phone"
              name="phone"
              className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600">Email</label>
            <input
              id="email"
              name="email"
              type="email"
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
            Add borrower
          </button>
        </form>
      </div>
    </div>
  );
}
