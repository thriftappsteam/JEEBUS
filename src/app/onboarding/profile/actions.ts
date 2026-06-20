"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";

export async function saveProfile(formData: FormData) {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const foods = formData.getAll("favourite_foods").map((v) => String(v));
  const mascotRaw = formData.get("money_mascot");
  const wish = String(formData.get("wish") ?? "").trim();

  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
  };
  // Only overwrite what was actually asked on this run — the questions are
  // feature/role dependent, so absent fields must not clobber existing data.
  if (foods.length > 0) updates.favourite_foods = foods;
  if (mascotRaw) updates.money_mascot = String(mascotRaw);
  if (wish) {
    const { data: row } = await supabase
      .from("members")
      .select("setup_answers")
      .eq("id", me!.id)
      .maybeSingle();
    const prev =
      (row?.setup_answers as Record<string, unknown> | null) ?? {};
    updates.setup_answers = {
      ...prev,
      wish,
      answered_at: new Date().toISOString(),
    };
  }

  await supabase.from("members").update(updates).eq("id", me!.id);

  redirect("/?welcome=1");
}

// (touched to sync the build sandbox — harmless, delete any time)
