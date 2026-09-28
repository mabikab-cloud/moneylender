"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your email address")}`);
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Always show the same message, whether or not the email is registered,
  // so this can't be used to check which emails have accounts.
  redirect(
    `/login?message=${encodeURIComponent("If an account exists for that email, a reset link is on its way.")}`
  );
}
