"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";

export async function saveProfile(formData: FormData) {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const foods = formData.getAll("favourite_foods").map((v) => String(v));
  const mascot = String(formData.get("money_mascot") ?? "dragon");

  const supabase = await createClient();
  await supabase
    .from("members")
    .update({
      favourite_foods: foods,
      money_mascot: mascot,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", me!.id);

  redirect("/?welcome=1");
}
