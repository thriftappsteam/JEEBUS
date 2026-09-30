"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import {
  resolvePlanPrefs,
  MEAL_SLOTS,
  DIET_RULES,
  AVOID_OPTIONS,
  STYLE_OPTIONS,
  BUDGET_MODES,
  SHOP_STYLES,
  CHAINS,
  RHYTHMS,
  SETUP_STEPS,
  type SetupStep,
  type PlanPrefs,
  type MealSlot,
} from "@/lib/hyetas/planPrefs";
import {
  pickDinners,
  pickSimpleSlot,
  recipeAllowed,
  shuffle,
  styleScore,
  type EngineRecipe,
} from "@/lib/hyetas/planEngine";
import { rebuildGroceryForWeek } from "@/app/actions/grocery";
import { communityTopUpCandidates, linkVariantIntoHousehold, loadVariant } from "@/lib/hyetas/communityDb";
import { resolveFeatures } from "@/lib/hyetas/features";
import { planningWeekMonday } from "@/lib/utils/rules";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

async function requireParent() {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  if (ctx!.member.role !== "parent" && ctx!.member.role !== "partner")
    redirect("/plan?error=Only+grown-ups+can+change+the+plan+set-up");
  return ctx!;
}

async function loadPrefs(householdId: string): Promise<PlanPrefs> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select("plan_prefs")
    .eq("id", householdId)
    .maybeSingle();
  return resolvePlanPrefs(data?.plan_prefs ?? null);
}

async function savePrefs(householdId: string, prefs: PlanPrefs) {
  const supabase = await createClient();
  await supabase
    .from("households")
    .update({ plan_prefs: prefs })
    .eq("id", householdId);
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Load the household's active recipes in engine shape. */
async function loadEngineRecipes(householdId: string): Promise<EngineRecipe[]> {
  const supabase = await createClient();
  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "id, name, cuisine, meal_types, prep_time_min, contains, style_tags, est_cost_aud, is_kid_favourite",
    )
    .eq("household_id", householdId)
    .eq("is_active", true);
  const list = (recipes as Omit<EngineRecipe, "ingredients">[] | null) ?? [];
  if (!list.length) return [];
  const { data: ings } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, name")
    .in(
      "recipe_id",
      list.map((r) => r.id),
    );
  const byRecipe = new Map<string, string[]>();
  for (const i of (ings as { recipe_id: string; name: string }[] | null) ?? []) {
    if (!byRecipe.has(i.recipe_id)) byRecipe.set(i.recipe_id, []);
    byRecipe.get(i.recipe_id)!.push(i.name.toLowerCase());
  }
  return list.map((r) => ({ ...r, ingredients: byRecipe.get(r.id) ?? [] }));
}

async function headcount(householdId: string, prefs: PlanPrefs): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);
  return Math.max(1, (count ?? 4) - prefs.away.length);
}

/* ------------------------------------------------------------------ */
/* Set-up wizard — one server action, one step per call                */
/* ------------------------------------------------------------------ */

export async function saveSetupStep(formData: FormData) {
  const { household } = await requireParent();
  const step = String(formData.get("step") ?? "") as SetupStep;
  if (!SETUP_STEPS.includes(step)) redirect("/plan");
  const prefs = await loadPrefs(household.id);
  const all = (k: string) => formData.getAll(k).map(String);
  const one = (k: string) => String(formData.get(k) ?? "").trim();

  switch (step) {
    case "who": {
      // Checkbox per member = "eats here most nights"; unchecked = away.
      const eating = new Set(all("eating"));
      const supabase = await createClient();
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("household_id", household.id);
      prefs.away = ((members as { id: string }[] | null) ?? [])
        .map((m) => m.id)
        .filter((id) => !eating.has(id));
      break;
    }
    case "meals": {
      const picked = all("meals").filter((m): m is MealSlot =>
        (MEAL_SLOTS as readonly string[]).includes(m),
      );
      prefs.meals = picked.length ? picked : ["dinner"];
      prefs.snacks = all("meals").includes("snacks");
      break;
    }
    case "likes": {
      prefs.styles = all("styles").filter((s): s is PlanPrefs["styles"][number] =>
        (STYLE_OPTIONS as readonly string[]).includes(s),
      );
      break;
    }
    case "avoid": {
      const diet = one("diet");
      prefs.diet = (DIET_RULES as readonly string[]).includes(diet)
        ? (diet as PlanPrefs["diet"])
        : null;
      prefs.avoid = all("avoid").filter((a): a is PlanPrefs["avoid"][number] =>
        (AVOID_OPTIONS as readonly string[]).includes(a),
      );
      prefs.avoid_note = one("avoid_note").slice(0, 300) || null;
      break;
    }
    case "budget": {
      const b = Number(one("budget"));
      if (Number.isFinite(b) && b >= 50 && b <= 2000) prefs.budget_aud = Math.round(b);
      const mode = one("budget_mode");
      if ((BUDGET_MODES as readonly string[]).includes(mode))
        prefs.budget_mode = mode as PlanPrefs["budget_mode"];
      break;
    }
    case "shop": {
      const style = one("shop_style");
      if ((SHOP_STYLES as readonly string[]).includes(style))
        prefs.shop_style = style as PlanPrefs["shop_style"];
      const chain = one("chain");
      if (CHAINS.some((c) => c.id === chain)) prefs.chain = chain as PlanPrefs["chain"];
      const street = one("street").slice(0, 120);
      const suburb = one("suburb").slice(0, 80);
      const postcode = one("postcode").replace(/\D/g, "").slice(0, 4);
      prefs.address = street || suburb || postcode ? { street, suburb, postcode } : null;
      break;
    }
    case "house": {
      // Existing standing items: cadence per row. New item: name + cadence.
      const supabase = await createClient();
      const { data: rows } = await supabase
        .from("standing_items")
        .select("id")
        .eq("household_id", household.id);
      for (const r of (rows as { id: string }[] | null) ?? []) {
        const every = Number(one(`every_${r.id}`));
        const on = formData.get(`on_${r.id}`) != null;
        if (!on) {
          await supabase.from("standing_items").delete().eq("id", r.id);
          continue;
        }
        await supabase
          .from("standing_items")
          .update({
            every_weeks: Number.isFinite(every) && every >= 1 && every <= 52 ? every : null,
            aisle: "Household",
          })
          .eq("id", r.id);
      }
      // Quick-add chips + free text.
      const adds = [...all("quick_add"), one("new_item")].filter(Boolean);
      for (const name of adds) {
        const every = Number(one("new_every")) || 4;
        await supabase.from("standing_items").insert({
          household_id: household.id,
          item: name.slice(0, 80),
          quantity: null,
          aisle: "Household",
          notes: null,
          home_only: false,
          every_weeks: every,
          last_bought_on: null,
        });
      }
      break;
    }
    case "rhythm": {
      const r = one("rhythm");
      if ((RHYTHMS as readonly string[]).includes(r)) prefs.rhythm = r as PlanPrefs["rhythm"];
      const day = one("rhythm_day");
      if (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(day))
        prefs.rhythm_day = day as PlanPrefs["rhythm_day"];
      const t = one("rhythm_time");
      if (/^\d{2}:\d{2}$/.test(t)) prefs.rhythm_time = t;
      break;
    }
    case "call": {
      const t = one("push_time");
      if (/^\d{2}:\d{2}$/.test(t)) prefs.push_time = t;
      const eo = one("eat_out_dow");
      prefs.eat_out_dow = eo === "" ? null : Math.max(0, Math.min(6, Number(eo)));
      break;
    }
  }

  const finishing = one("finish") === "1";
  const wasSetUp = prefs.setup_completed_at != null;
  if (finishing || step === "call") prefs.setup_completed_at ??= new Date().toISOString();
  await savePrefs(household.id, prefs);
  revalidatePath("/plan");

  // Editing one step from settings → back to settings. First run → next step.
  if (wasSetUp) redirect("/plan/settings?saved=1");
  const i = SETUP_STEPS.indexOf(step);
  if (i < SETUP_STEPS.length - 1) redirect(`/plan?step=${SETUP_STEPS[i + 1]}`);
  redirect("/plan?options=1&first=1");
}

/* ------------------------------------------------------------------ */
/* Generate a week                                                     */
/* ------------------------------------------------------------------ */

export async function generateWeek(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;
  const supabase = await createClient();
  const prefs = await loadPrefs(household.id);

  const weekMonday = /^\d{4}-\d{2}-\d{2}$/.test(String(formData.get("week_monday")))
    ? String(formData.get("week_monday"))
    : planningWeekMonday();
  const liked = new Set<string>();
  const disliked = new Set(formData.getAll("disliked").map(String));
  // Community picks ("v:<variant id>") get a household copy first, so the
  // engine — and the grocery list — treat them like any other recipe.
  for (const raw of formData.getAll("liked").map(String)) {
    if (raw.startsWith("v:")) {
      const variant = await loadVariant(raw.slice(2));
      if (!variant) continue;
      try {
        liked.add(await linkVariantIntoHousehold(household.id, variant, { makeDefault: true }));
      } catch {
        /* skip a pick that can't be copied; the rest of the week still plans */
      }
    } else liked.add(raw);
  }

  let recipes = await loadEngineRecipes(household.id);
  const community = resolveFeatures(household.features).community;
  if (!recipes.length && !community) redirect("/recipes/new?from=plan");

  // Last week + recent history, for the variety rules.
  const lastMon = addDaysIso(weekMonday, -7);
  const eightWeeksAgo = addDaysIso(weekMonday, -56);
  const { data: hist } = await supabase
    .from("meal_plan_days")
    .select("day_date, dinner_recipe_id")
    .eq("household_id", household.id)
    .gte("day_date", eightWeeksAgo)
    .lt("day_date", weekMonday);
  const lastWeekIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const h of (hist as { day_date: string; dinner_recipe_id: string | null }[] | null) ?? []) {
    if (!h.dinner_recipe_id) continue;
    seenIds.add(h.dinner_recipe_id);
    if (h.day_date >= lastMon) lastWeekIds.add(h.dinner_recipe_id);
  }

  // Top up from Everyone's verified dishes when the household's own
  // allowed dinners can't fill a varied week (no repeats, a real surprise).
  // Keeps the household's dishes first: community candidates only join the
  // pool, they don't outrank what the family already cooks.
  const dinnersNeeded = 7 - (prefs.eat_out_dow == null ? 0 : 1);
  if (community) {
    const ownAllowed = recipes.filter(
      (r) => (r.meal_types ?? ["dinner"]).includes("dinner") && recipeAllowed(r, prefs) && !lastWeekIds.has(r.id),
    ).length;
    const shortBy = dinnersNeeded + 2 - ownAllowed;
    if (shortBy > 0) {
      const cands = shuffle((await communityTopUpCandidates(household.id)).filter((r) => recipeAllowed(r, prefs)))
        .sort((a, b) => styleScore(b, prefs.styles) - styleScore(a, prefs.styles))
        .slice(0, shortBy + 2);
      recipes = [...recipes, ...cands];
    }
  }
  if (!recipes.length) redirect("/recipes/new?from=plan");

  const people = await headcount(household.id, prefs);
  const dinners = pickDinners(recipes, prefs, {
    lastWeekIds,
    seenIds,
    likedIds: liked,
    dislikedIds: disliked,
    headcount: people,
  });
  const breakfasts = prefs.meals.includes("breakfast")
    ? pickSimpleSlot(recipes, "breakfast", prefs)
    : null;
  const lunches = prefs.meals.includes("lunch")
    ? pickSimpleSlot(recipes, "lunch", prefs)
    : null;

  const { data: existingRows } = await supabase
    .from("meal_plan_days")
    .select("id, day_date")
    .eq("household_id", household.id)
    .gte("day_date", weekMonday)
    .lte("day_date", addDaysIso(weekMonday, 6));
  const existing = new Map(
    ((existingRows as { id: string; day_date: string }[] | null) ?? []).map((r) => [
      r.day_date,
      r.id,
    ]),
  );

  // Community picks that made the week become household copies now.
  const fromCommunity = new Set<string>();
  const linked = new Map<string, string>();
  for (const r of dinners.days) {
    if (!r || !r.id.startsWith("v:") || linked.has(r.id)) continue;
    const variant = await loadVariant(r.id.slice(2));
    if (!variant) continue;
    try {
      const rid = await linkVariantIntoHousehold(household.id, variant, { makeDefault: true });
      linked.set(r.id, rid);
      fromCommunity.add(rid);
    } catch {
      /* leave the night empty rather than fail the week */
    }
  }
  dinners.days = dinners.days.map((r) => (r && r.id.startsWith("v:") ? (linked.has(r.id) ? { ...r, id: linked.get(r.id)! } : null) : r));

  const generatedAt = new Date().toISOString();
  for (let d = 0; d < 7; d++) {
    const iso = addDaysIso(weekMonday, d);
    const eatOut = prefs.eat_out_dow === d;
    const meta: Record<string, unknown> = { generated_at: generatedAt, week_of: weekMonday };
    if (dinners.surpriseDay === d) meta.surprise = "pending";
    if (dinners.days[d] && fromCommunity.has(dinners.days[d]!.id)) meta.from_community = true;
    const patch: Record<string, unknown> = {
      eating_at_home: !eatOut,
      plan_meta: meta,
    };
    if (prefs.meals.includes("dinner")) patch.dinner_recipe_id = eatOut ? null : dinners.days[d]?.id ?? null;
    if (breakfasts) patch.breakfast_recipe_id = breakfasts[d]?.id ?? null;
    if (lunches) patch.lunch_recipe_id = lunches[d]?.id ?? null;
    const id = existing.get(iso);
    if (id) await supabase.from("meal_plan_days").update(patch).eq("id", id);
    else
      await supabase
        .from("meal_plan_days")
        .insert({ household_id: household.id, day_date: iso, ...patch });
  }

  await rebuildGroceryForWeek(household.id, weekMonday);
  revalidatePath("/plan");
  revalidatePath("/meals");
  revalidatePath("/grocery");
  revalidatePath("/");
  redirect(`/plan?week=${weekMonday}&planned=1`);
}

/* ------------------------------------------------------------------ */
/* Day-level edits                                                     */
/* ------------------------------------------------------------------ */

async function dayRow(householdId: string, dayDate: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_plan_days")
    .select("id, dinner_recipe_id, eating_at_home, plan_meta")
    .eq("household_id", householdId)
    .eq("day_date", dayDate)
    .maybeSingle();
  return data as {
    id: string;
    dinner_recipe_id: string | null;
    eating_at_home: boolean;
    plan_meta: Record<string, unknown> | null;
  } | null;
}

function weekOf(dayDate: string): string {
  const dt = new Date(dayDate + "T00:00:00Z");
  const dow = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return dt.toISOString().slice(0, 10);
}

async function afterDayEdit(householdId: string, dayDate: string) {
  await rebuildGroceryForWeek(householdId, weekOf(dayDate));
  revalidatePath("/plan");
  revalidatePath("/meals");
  revalidatePath("/grocery");
  revalidatePath("/");
}

/** Swap a night's dinner for another recipe (or a random allowed one). */
export async function swapDinner(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;
  const dayDate = String(formData.get("day_date") ?? "");
  let recipeId = String(formData.get("recipe_id") ?? "");
  const back = String(formData.get("back") ?? "/plan");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) redirect(back);

  const supabase = await createClient();
  const row = await dayRow(household.id, dayDate);
  const prefs = await loadPrefs(household.id);

  if (recipeId === "random") {
    const recipes = await loadEngineRecipes(household.id);
    const week = weekOf(dayDate);
    const { data: wk } = await supabase
      .from("meal_plan_days")
      .select("dinner_recipe_id")
      .eq("household_id", household.id)
      .gte("day_date", week)
      .lte("day_date", addDaysIso(week, 6));
    const inWeek = new Set(
      ((wk as { dinner_recipe_id: string | null }[] | null) ?? [])
        .map((r) => r.dinner_recipe_id)
        .filter((x): x is string => !!x),
    );
    const cands = shuffle(
      recipes.filter(
        (r) =>
          (r.meal_types ?? ["dinner"]).includes("dinner") &&
          recipeAllowed(r, prefs) &&
          !inWeek.has(r.id),
      ),
    );
    recipeId = cands[0]?.id ?? "";
  }
  if (!recipeId) redirect(back);

  const meta = { ...(row?.plan_meta ?? {}) };
  delete meta.surprise; // a hand-picked meal is not a surprise any more
  const patch = { dinner_recipe_id: recipeId, eating_at_home: true, plan_meta: meta };
  if (row) await supabase.from("meal_plan_days").update(patch).eq("id", row.id);
  else
    await supabase
      .from("meal_plan_days")
      .insert({ household_id: household.id, day_date: dayDate, ...patch });
  await afterDayEdit(household.id, dayDate);
  redirect(back);
}

/** Flip a night between cooking and eating out. */
export async function toggleEatOut(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;
  const dayDate = String(formData.get("day_date") ?? "");
  const back = String(formData.get("back") ?? "/plan");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) redirect(back);
  const supabase = await createClient();
  const row = await dayRow(household.id, dayDate);
  if (row) {
    await supabase
      .from("meal_plan_days")
      .update({ eating_at_home: !row.eating_at_home })
      .eq("id", row.id);
  } else {
    await supabase
      .from("meal_plan_days")
      .insert({ household_id: household.id, day_date: dayDate, eating_at_home: false });
  }
  await afterDayEdit(household.id, dayDate);
  redirect(back);
}

/** Yes / no to the week's surprise dish. "No" swaps in something familiar. */
export async function surpriseDecision(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;
  const dayDate = String(formData.get("day_date") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const back = String(formData.get("back") ?? "/plan");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) redirect(back);
  const supabase = await createClient();
  const row = await dayRow(household.id, dayDate);
  if (!row) redirect(back);

  if (decision === "yes") {
    await supabase
      .from("meal_plan_days")
      .update({ plan_meta: { ...(row!.plan_meta ?? {}), surprise: "yes" } })
      .eq("id", row!.id);
    revalidatePath("/plan");
    redirect(back);
  }

  // "no": pick something the household HAS had before, if possible.
  const prefs = await loadPrefs(household.id);
  const recipes = await loadEngineRecipes(household.id);
  const { data: hist } = await supabase
    .from("meal_plan_days")
    .select("dinner_recipe_id")
    .eq("household_id", household.id)
    .lt("day_date", weekOf(dayDate));
  const seen = new Set(
    ((hist as { dinner_recipe_id: string | null }[] | null) ?? [])
      .map((r) => r.dinner_recipe_id)
      .filter((x): x is string => !!x),
  );
  const allowed = recipes.filter(
    (r) =>
      (r.meal_types ?? ["dinner"]).includes("dinner") &&
      recipeAllowed(r, prefs) &&
      r.id !== row!.dinner_recipe_id,
  );
  const familiar = shuffle(allowed.filter((r) => seen.has(r.id)));
  const pick = familiar[0] ?? shuffle(allowed)[0];
  await supabase
    .from("meal_plan_days")
    .update({
      dinner_recipe_id: pick?.id ?? row!.dinner_recipe_id,
      plan_meta: { ...(row!.plan_meta ?? {}), surprise: "no" },
    })
    .eq("id", row!.id);
  await afterDayEdit(household.id, dayDate);
  redirect(back);
}
