"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Recipes containing any of these tags get filtered out — they fail
// household-wide rules (peanut) or specific member rules (avocado/oats/Lisa,
// cooked banana/Andrew). Apples already filtered at recipe-import time.
const UNSAFE_CONTAINS = ["peanut", "avocado", "oats", "banana_cooked"];

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getDow(iso: string): number {
  // 0 Sun .. 6 Sat
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Recipe = {
  id: string;
  name: string;
  contains: string[] | null;
  is_kid_favourite: boolean;
  meal_types: string[] | null;
};

type ExistingDay = {
  id: string;
  day_date: string;
  breakfast_recipe_id: string | null;
  lunch_recipe_id: string | null;
  dinner_recipe_id: string | null;
};

type SlotKind = "breakfast" | "lunch" | "dinner";
const SLOTS: SlotKind[] = ["breakfast", "lunch", "dinner"];

function existingIdFor(row: ExistingDay | undefined, slot: SlotKind): string | null {
  if (!row) return null;
  if (slot === "breakfast") return row.breakfast_recipe_id;
  if (slot === "lunch") return row.lunch_recipe_id;
  return row.dinner_recipe_id;
}

type MealUpdate = {
  breakfast_recipe_id?: string;
  lunch_recipe_id?: string;
  dinner_recipe_id?: string;
};

function setSlotOnUpdate(updates: MealUpdate, slot: SlotKind, recipeId: string): void {
  if (slot === "breakfast") updates.breakfast_recipe_id = recipeId;
  else if (slot === "lunch") updates.lunch_recipe_id = recipeId;
  else updates.dinner_recipe_id = recipeId;
}

export async function autoFillMeals(formData: FormData) {
  const weekMonday = String(formData.get("week_monday") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekMonday)) return;

  const supabase = await createClient();

  const { getCurrentMember } = await import("@/lib/hyetas/whoami");
  const me = await getCurrentMember();
  let householdId = me?.household_id ?? null;
  if (!householdId) {
    const { data: hh } = await supabase
      .from("households")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    householdId = hh?.id ?? null;
  }
  if (!householdId) return;

  // 7 days starting at the given Monday.
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(weekMonday, i));
  const sunday = days[6];

  // Fetch any rows that already exist for this week — we want to leave any
  // slot Lisa has already filled in alone, and only fill the empty ones.
  const { data: existingRows } = await supabase
    .from("meal_plan_days")
    .select(
      "id, day_date, breakfast_recipe_id, lunch_recipe_id, dinner_recipe_id",
    )
    .gte("day_date", weekMonday)
    .lte("day_date", sunday);

  const existing = (existingRows as ExistingDay[] | null) ?? [];
  const existingByDate = new Map<string, ExistingDay>();
  for (const r of existing) existingByDate.set(r.day_date, r);

  // Fetch all active recipes once, bucket per slot, drop unsafe.
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, contains, is_kid_favourite, meal_types")
    .eq("is_active", true);

  const safeRecipes = ((recipes as Recipe[] | null) ?? []).filter((r) => {
    const c = r.contains ?? [];
    return !c.some((tag) => UNSAFE_CONTAINS.includes(tag));
  });

  // A recipe tagged ['lunch','dinner'] sits in both lunch and dinner pools.
  const pools: Record<SlotKind, Recipe[]> = {
    breakfast: safeRecipes.filter((r) => (r.meal_types ?? []).includes("breakfast")),
    lunch: safeRecipes.filter((r) => (r.meal_types ?? []).includes("lunch")),
    dinner: safeRecipes.filter((r) => (r.meal_types ?? []).includes("dinner")),
  };

  // Per-slot "used in this week" set, seeded from whatever's already there
  // so we don't accidentally duplicate against Lisa's hand-picks.
  const used: Record<SlotKind, Set<string>> = {
    breakfast: new Set<string>(),
    lunch: new Set<string>(),
    dinner: new Set<string>(),
  };
  for (const r of existing) {
    if (r.breakfast_recipe_id) used.breakfast.add(r.breakfast_recipe_id);
    if (r.lunch_recipe_id) used.lunch.add(r.lunch_recipe_id);
    if (r.dinner_recipe_id) used.dinner.add(r.dinner_recipe_id);
  }

  // Shuffled pools per slot, split by kid-favourite vs not. Keeps consecutive
  // auto-fills from looking identical.
  const shuffledPools: Record<
    SlotKind,
    { kidFavs: Recipe[]; others: Recipe[] }
  > = {
    breakfast: {
      kidFavs: shuffle(pools.breakfast.filter((r) => r.is_kid_favourite)),
      others: shuffle(pools.breakfast.filter((r) => !r.is_kid_favourite)),
    },
    lunch: {
      kidFavs: shuffle(pools.lunch.filter((r) => r.is_kid_favourite)),
      others: shuffle(pools.lunch.filter((r) => !r.is_kid_favourite)),
    },
    dinner: {
      kidFavs: shuffle(pools.dinner.filter((r) => r.is_kid_favourite)),
      others: shuffle(pools.dinner.filter((r) => !r.is_kid_favourite)),
    },
  };

  function pickFor(slot: SlotKind, isSchoolNight: boolean): string | null {
    // Mon-Fri prefer kid favourites; weekends treat all eligible equally.
    const pool = shuffledPools[slot];
    const primary = isSchoolNight ? pool.kidFavs : pool.others;
    const secondary = isSchoolNight ? pool.others : pool.kidFavs;
    for (const r of primary) {
      if (!used[slot].has(r.id)) {
        used[slot].add(r.id);
        return r.id;
      }
    }
    for (const r of secondary) {
      if (!used[slot].has(r.id)) {
        used[slot].add(r.id);
        return r.id;
      }
    }
    // Pool smaller than empty-slot count? Relax and allow a repeat.
    const all = [...pool.kidFavs, ...pool.others];
    if (all.length > 0) return all[0].id;
    return null;
  }

  for (const dayIso of days) {
    const row = existingByDate.get(dayIso);
    const dow = getDow(dayIso);
    const isSchoolNight = dow >= 1 && dow <= 5; // Mon-Fri

    const updates: MealUpdate = {};
    for (const slot of SLOTS) {
      const filled = existingIdFor(row, slot);
      if (filled) continue; // leave hand-picked slots alone
      const id = pickFor(slot, isSchoolNight);
      if (id) setSlotOnUpdate(updates, slot, id);
    }

    if (Object.keys(updates).length === 0) continue;

    if (row) {
      await supabase
        .from("meal_plan_days")
        .update(updates)
        .eq("id", row.id);
    } else {
      await supabase.from("meal_plan_days").insert({
        household_id: householdId,
        day_date: dayIso,
        eating_at_home: true,
        ...updates,
      });
    }
  }

  revalidatePath("/meals");
}

// Clear all 3 meal slots for the week, then re-fill from scratch. Used by
// the "Shuffle these meals" button when Lisa wants a different set of picks.
// Only allowed from week 2+ in the UI to protect curated weeks.
export async function shuffleMeals(formData: FormData) {
  const weekMonday = String(formData.get("week_monday") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekMonday)) return;

  const supabase = await createClient();
  const sunday = addDaysIso(weekMonday, 6);

  await supabase
    .from("meal_plan_days")
    .update({
      breakfast_recipe_id: null,
      lunch_recipe_id: null,
      dinner_recipe_id: null,
    })
    .gte("day_date", weekMonday)
    .lte("day_date", sunday);

  // Re-use the fill logic — same shape, same rules.
  await autoFillMeals(formData);
}
