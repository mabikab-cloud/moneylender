"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLoan(formData: FormData) {
  const supabase = await createClient();
  const borrowerId = formData.get("borrower_id") as string;
  const principal = Number(formData.get("principal"));
  const interestRate = Number(formData.get("interest_rate"));
  const startDate = formData.get("start_date") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!borrowerId) throw new Error("Choose a borrower");
  if (!(principal > 0)) throw new Error("Principal must be greater than zero");
  if (!(interestRate >= 0)) throw new Error("Interest rate must be zero or more");
  if (!startDate) throw new Error("Start date is required");

  const { data, error } = await supabase
    .from("loans")
    .insert({
      borrower_id: borrowerId,
      principal,
      interest_rate: interestRate,
      start_date: startDate,
      notes,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/loans/${data.id}`);
}

export async function recordPayment(loanId: string, formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("amount"));
  const paidOn = formData.get("paid_on") as string;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!(amount > 0)) throw new Error("Payment amount must be greater than zero");
  if (!paidOn) throw new Error("Payment date is required");

  const { error } = await supabase.from("payments").insert({ loan_id: loanId, amount, paid_on: paidOn, note });
  if (error) throw new Error(error.message);

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function closeLoan(loanId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("loans").update({ status: "closed" }).eq("id", loanId);
  if (error) throw new Error(error.message);

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function reopenLoan(loanId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("loans").update({ status: "active" }).eq("id", loanId);
  if (error) throw new Error(error.message);

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}
