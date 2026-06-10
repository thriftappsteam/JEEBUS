"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures, type FeatureKey } from "@/lib/hyetas/features";
import { STARTER_CHORES, STARTER_RECIPES } from "@/lib/hyetas/starterPacks";

/** Mirror of buildRecurrenceRule in actions/chores.ts — the Tonight
 *  generator runs off recurrence_rule, so seeded chores need it too. */
function starterRecurrenceRule(
  cadence: string,
  dayHint: string,
): string | null {
  const dayMap: Record<string, string> = {
    Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR", Sat: "SA", Sun: "SU",
  };
  const byday = dayMap[dayHint];
  switch (cadence) {
    case "Daily":
      return "FREQ=DAILY";
    case "Weekly":
      return byday ? `FREQ=WEEKLY;BYDAY=${byday}` : "FREQ=WEEKLY";
    case "Fortnightly":
      return byday
        ? `FREQ=WEEKLY;INTERVAL=2;BYDAY=${byday}`
        : "FREQ=WEEKLY;INTERVAL=2";
    case "Monthly":
      return byday ? `FREQ=MONTHLY;BYDAY=${byday}` : "FREQ=MONTHLY";
    default:
      return null;
  }
}

/** The creator wizard is a parent-only flow on a fresh household. */
async function requireParentContext() {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  if (ctx!.member.role !== "parent") redirect("/");
  return ctx!;
}

/* ------------------- Step 1: your situation ------------------- */

export async function saveSituation(formData: FormData) {
  const { household } = await requireParentContext();
  const pains = formData.getAll("pains").map((v) => String(v));
  const wish = String(formData.get("wish") ?? "").trim();

  const supabase = await createClient();
  // Merge over whatever's there (wizard is re-runnable without data loss).
  const { data: hh } = await supabase
    .from("households")
    .select("setup_answers")
    .eq("id", household.id)
    .maybeSingle();
  const prev = (hh?.setup_answers as Record<string, unknown> | null) ?? {};
  await supabase
    .from("households")
    .update({
      setup_answers: {
        ...prev,
        pains,
        wish: wish || null,
        situation_answered_at: new Date().toISOString(),
      },
    })
    .eq("id", household.id);

  redirect("/onboarding/setup?step=features");
}

/* ------------------- Step 2: choose features ------------------- */

export async function saveFeatures(formData: FormData) {
  const { household } = await requireParentContext();
  const picked = new Set(formData.getAll("features").map((v) => String(v)));

  if (picked.size === 0) {
    redirect(
      "/onboarding/setup?step=features&error=Pick+at+least+one+%E2%80%94+that%27s+the+whole+app+otherwise",
    );
  }

  const features: Record<FeatureKey, boolean> = {
    chores: picked.has("chores"),
    meals: picked.has("meals"),
    grocery: picked.has("grocery"),
    money: picked.has("money"),
    shifts: picked.has("shifts"),
  };

  const supabase = await createClient();
  await supabase
    .from("households")
    .update({ features })
    .eq("id", household.id);

  if (features.chores) redirect("/onboarding/setup?step=chores");
  if (features.meals) redirect("/onboarding/setup?step=recipes");
  await finishWizard(household.id);
}

/* ------------------- Step 3: starter chores ------------------- */

export async function seedChores(formData: FormData) {
  const { household } = await requireParentContext();
  const picked = new Set(formData.getAll("starter_chores").map(String));

  const supabase = await createClient();
  if (picked.size > 0) {
    // Never duplicate: skip any starter whose name already exists here.
    const { data: existing } = await supabase
      .from("chores")
      .select("name")
      .eq("household_id", household.id);
    const have = new Set(
      ((existing as { name: string }[] | null) ?? []).map((c) =>
        c.name.toLowerCase(),
      ),
    );
    const rows = STARTER_CHORES.filter(
      (c) => picked.has(c.key) && !have.has(c.name.toLowerCase()),
    ).map((c) => ({
      household_id: household.id,
      name: c.name,
      cadence: c.cadence,
      day_hint: c.day_hint,
      recurrence_rule: starterRecurrenceRule(c.cadence, c.day_hint),
      instructions_md: c.instructions_md,
      points: 1,
      is_active: true,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from("chores").insert(rows);
      if (error)
        redirect(
          `/onboarding/setup?step=chores&error=${encodeURIComponent(error.message)}`,
        );
    }
  }

  const features = resolveFeatures(household.features);
  if (features.meals) redirect("/onboarding/setup?step=recipes");
  await finishWizard(household.id);
}

/* ------------------- Step 4: starter recipes ------------------- */

export async function seedRecipes(formData: FormData) {
  const { household } = await requireParentContext();
  const picked = new Set(formData.getAll("starter_recipes").map(String));

  const supabase = await createClient();
  if (picked.size > 0) {
    const { data: existing } = await supabase
      .from("recipes")
      .select("name")
      .eq("household_id", household.id);
    const have = new Set(
      ((existing as { name: string }[] | null) ?? []).map((r) =>
        r.name.toLowerCase(),
      ),
    );

    for (const r of STARTER_RECIPES) {
      if (!picked.has(r.key) || have.has(r.name.toLowerCase())) continue;
      const { data: inserted, error } = await supabase
        .from("recipes")
        .insert({
          household_id: household.id,
          name: r.name,
          meal_types: ["dinner"],
          servings: 4,
          prep_time_min: r.prep_time_min,
          instructions_md: r.instructions_md,
          is_kid_favourite: r.is_kid_favourite,
          is_active: true,
        })
        .select("id")
        .single();
      if (error || !inserted)
        redirect(
          `/onboarding/setup?step=recipes&error=${encodeURIComponent(error?.message ?? "Could not save recipes")}`,
        );
      const { error: ingError } = await supabase
        .from("recipe_ingredients")
        .insert(
          r.ingredients.map((i) => ({
            recipe_id: inserted!.id,
            name: i.name,
            quantity: i.quantity,
            aisle: i.aisle,
            is_pantry_staple: i.is_pantry_staple ?? false,
          })),
        );
      if (ingError)
        redirect(
          `/onboarding/setup?step=recipes&error=${encodeURIComponent(ingError.message)}`,
        );
    }
  }

  await finishWizard(household.id);
}

/* ------------------- Done ------------------- */

async function finishWizard(householdId: string) {
  const supabase = await createClient();
  await supabase
    .from("households")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", householdId)
    .is("onboarded_at", null);
  redirect("/onboarding/invite?fresh=1");
}

/** "Skip the rest" — used by the skip links so the household still gets
 *  stamped as onboarded and lands on the invite page. */
export async function skipToInvite() {
  const { household } = await requireParentContext();
  await finishWizard(household.id);
}
