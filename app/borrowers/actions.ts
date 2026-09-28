"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBorrower(formData: FormData) {
  const supabase = await createClient();
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name) {
    throw new Error("Borrower name is required");
  }

  const { error } = await supabase.from("borrowers").insert({ name, phone, email, notes });
  if (error) throw new Error(error.message);

  revalidatePath("/borrowers");
}
