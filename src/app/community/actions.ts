"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import {
  autoChecks,
  costBandFor,
  detectContains,
  estimateCost,
  parseQuantity,
  type VariantIngredient,
} from "@/lib/hyetas/community";
import {
  linkVariantIntoHousehold,
  loadVariant,
  priceLookupFor,
  refreshVariantStats,
} from "@/lib/hyetas/communityDb";
import { rebuildGroceryForWeek } from "@/app/actions/grocery";

const AISLES = ["Produce", "Protein", "Dairy & Eggs", "Bakery", "Pantry", "Frozen", "Beverages", "Household", "Other"];

async function requireMember() {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  return ctx!;
}

function isGrownUp(role: string) {
  return role === "parent" || role === "partner";
}

function weekOf(dayDate: string): string {
  const dt = new Date(dayDate + "T00:00:00Z");
  const dow = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return dt.toISOString().slice(0, 10);
}

function revalidateFood() {
  revalidatePath("/recipes");
  revalidatePath("/plan");
  revalidatePath("/meals");
  revalidatePath("/grocery");
  revalidatePath("/");
}

/* ------------------------------------------------------------------ */
/* Make it my way → publish a variant (or a brand-new dish)            */
/* ------------------------------------------------------------------ */

export async function publishRemix(formData: FormData) {
  const { member, household } = await requireMember();
  const baseRecipeId = String(formData.get("base_recipe_id") ?? "");
  const backTo = `/recipes/${baseRecipeId}/remix`;
  const fail = (msg: string) => redirect(`${backTo}?error=${encodeURIComponent(msg)}`);
  if (!isGrownUp(member.role)) fail("Only grown-ups can publish a recipe for everyone.");

  const one = (k: string) => String(formData.get(k) ?? "").trim();
  const mode = one("mode") === "new" ? "new" : "variant";
  const dishName = one("dish_name").slice(0, 80);
  const variantLabel = (mode === "new" ? one("variant_label") || "The original" : one("variant_label")).slice(0, 60);
  const baseVariantId = one("base_variant_id") || null;
  const baseDishId = one("base_dish_id") || null;
  const cuisine = one("cuisine").slice(0, 40) || null;
  const prep = Number(one("prep_time_min"));
  const servings = Number(one("servings")) || 4;
  const complexity = Number(one("complexity"));
  const costOverride = Number(one("cost_override")) || 0;
  const instructions = one("instructions_md").slice(0, 8000);
  const notes = one("notes").slice(0, 1000) || null;

  const names = formData.getAll("ing_name").map(String);
  const qtys = formData.getAll("ing_qty").map(String);
  const aisles = formData.getAll("ing_aisle").map(String);
  const staples = new Set(formData.getAll("ing_staple").map(String));
  const optionals = new Set(formData.getAll("ing_optional").map(String));
  const ingredients: VariantIngredient[] = [];
  names.forEach((n, i) => {
    const name = n.trim().slice(0, 80);
    if (!name) return;
    const quantity = (qtys[i] ?? "").trim().slice(0, 30) || null;
    const q = parseQuantity(quantity);
    ingredients.push({
      name,
      quantity,
      qty_value: q.value,
      qty_unit: q.unit,
      aisle: AISLES.includes(aisles[i]) ? aisles[i] : "Other",
      is_pantry_staple: staples.has(String(i)),
      is_optional: optionals.has(String(i)),
    });
  });

  const problems = autoChecks({
    dishName,
    variantLabel,
    isNewDish: mode === "new",
    ingredients,
    instructions_md: instructions,
    notes,
    complexity,
  });
  if (problems.length) fail(problems.join(" "));

  const supabase = await createClient();
  let dishId = baseDishId;
  if (mode === "new") {
    const { data: clash } = await supabase
      .from("community_dishes")
      .select("id, name")
      .ilike("name", dishName)
      .maybeSingle();
    if (clash) fail(`“${clash.name}” already exists — make it a variant of that dish, or pick a name nobody's used.`);
    const { data: dish, error } = await supabase
      .from("community_dishes")
      .insert({ name: dishName, cuisine, created_by_member_id: member.id, created_by_household_id: household.id })
      .select("id")
      .single();
    if (error || !dish) fail(error?.message ?? "Could not create the dish");
    dishId = dish!.id as string;
  }
  if (!dishId) fail("This recipe isn't linked to a dish yet — add it to the plan once first.");

  const lookup = await priceLookupFor(household.id);
  const est = estimateCost(ingredients, lookup);
  const contains = detectContains(ingredients);
  const { data: base } = baseVariantId
    ? await supabase.from("community_variants").select("style_tags").eq("id", baseVariantId).maybeSingle()
    : { data: null };

  const { data: v, error: vErr } = await supabase
    .from("community_variants")
    .insert({
      dish_id: dishId,
      label: variantLabel,
      based_on_variant_id: baseVariantId,
      author_member_id: member.id,
      author_household_id: household.id,
      author_display: `${member.name.split(" ")[0]} · ${household.name}`,
      is_starter: false,
      cuisine,
      prep_time_min: Number.isFinite(prep) && prep > 0 ? Math.round(prep) : null,
      servings: Math.max(1, Math.min(20, Math.round(servings))),
      ingredients,
      instructions_md: instructions,
      notes,
      contains,
      style_tags: (base?.style_tags as string[] | undefined) ?? [],
      complexity_submitted: complexity,
      complexity_shown: complexity,
      cost_est_aud: est.total,
      cost_band: costBandFor(est.total),
      cost_override_band: costOverride >= 1 && costOverride <= 4 ? costOverride : null,
      cost_unmatched: est.unmatched,
      status: "unverified",
    })
    .select("id")
    .single();
  if (vErr || !v) fail(vErr?.message ?? "Could not publish");

  if (mode === "new") await supabase.from("community_dishes").update({ default_variant_id: v!.id }).eq("id", dishId);

  const variant = await loadVariant(v!.id as string);
  const recipeId = await linkVariantIntoHousehold(household.id, variant!, { makeDefault: true });
  revalidateFood();
  redirect(`/recipes/${recipeId}?published=1`);
}

/* ------------------------------------------------------------------ */
/* Ratings, our way, reports                                           */
/* ------------------------------------------------------------------ */

export async function rateVariant(formData: FormData) {
  const { member, household } = await requireMember();
  const variantId = String(formData.get("variant_id") ?? "");
  const back = String(formData.get("back") ?? "/recipes");
  const stars = Number(formData.get("stars"));
  const cv = Number(formData.get("complexity_vote"));
  const costFlag = formData.get("cost_flag") === "on";
  if (!variantId || !(stars >= 1 && stars <= 5)) redirect(back);
  const supabase = await createClient();
  await supabase.from("recipe_ratings").upsert(
    {
      variant_id: variantId,
      member_id: member.id,
      household_id: household.id,
      is_grownup: isGrownUp(member.role),
      stars: Math.round(stars),
      complexity_vote: cv >= 1 && cv <= 5 ? Math.round(cv) : null,
      cost_flag: costFlag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "variant_id,member_id" },
  );
  await refreshVariantStats(variantId);
  revalidateFood();
  redirect(`${back}${back.includes("?") ? "&" : "?"}rated=1`);
}

export async function setOurWay(formData: FormData) {
  const { member, household } = await requireMember();
  const variantId = String(formData.get("variant_id") ?? "");
  if (!isGrownUp(member.role)) redirect(`/recipes?error=${encodeURIComponent("Only grown-ups can change our way")}`);
  const variant = await loadVariant(variantId);
  if (!variant || variant.status === "hidden" || variant.status === "removed") redirect("/recipes");
  const recipeId = await linkVariantIntoHousehold(household.id, variant!, { makeDefault: true });
  revalidateFood();
  redirect(`/recipes/${recipeId}?ourway=1`);
}

export async function reportVariant(formData: FormData) {
  const { member, household } = await requireMember();
  const variantId = String(formData.get("variant_id") ?? "");
  const back = String(formData.get("back") ?? "/recipes");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;
  if (!variantId) redirect(back);
  const supabase = await createClient();
  await supabase.from("community_reports").insert({ variant_id: variantId, member_id: member.id, household_id: household.id, reason });
  const { count } = await supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("variant_id", variantId);
  await supabase.from("community_variants").update({ report_count: count ?? 0 }).eq("id", variantId);
  await refreshVariantStats(variantId);
  revalidateFood();
  redirect(`${back}${back.includes("?") ? "&" : "?"}reported=1`);
}

/** Pull a community dish into the household (its default variant, as our way). */
export async function addCommunityDish(formData: FormData) {
  const { household } = await requireMember();
  const variantId = String(formData.get("variant_id") ?? "");
  const back = String(formData.get("back") ?? "/recipes");
  const variant = await loadVariant(variantId);
  if (!variant) redirect(back);
  await linkVariantIntoHousehold(household.id, variant!, { makeDefault: false });
  revalidateFood();
  redirect(back);
}

/** Cook a different variant of tonight's dish this week only — the default stays. */
export async function useVariantForNight(formData: FormData) {
  const { member, household } = await requireMember();
  const dayDate = String(formData.get("day_date") ?? "");
  const variantId = String(formData.get("variant_id") ?? "");
  const back = String(formData.get("back") ?? "/plan");
  if (!isGrownUp(member.role) || !/^\d{4}-\d{2}-\d{2}$/.test(dayDate) || !variantId) redirect(back);
  const variant = await loadVariant(variantId);
  if (!variant) redirect(back);
  const recipeId = await linkVariantIntoHousehold(household.id, variant!, { makeDefault: false });
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("meal_plan_days")
    .select("id, plan_meta")
    .eq("household_id", household.id)
    .eq("day_date", dayDate)
    .maybeSingle();
  const meta = { ...((row?.plan_meta as Record<string, unknown> | null) ?? {}), variant_for_week: variant!.label };
  if (row) await supabase.from("meal_plan_days").update({ dinner_recipe_id: recipeId, eating_at_home: true, plan_meta: meta }).eq("id", row.id);
  else await supabase.from("meal_plan_days").insert({ household_id: household.id, day_date: dayDate, dinner_recipe_id: recipeId, eating_at_home: true, plan_meta: meta });
  await rebuildGroceryForWeek(household.id, weekOf(dayDate));
  revalidateFood();
  redirect(back);
}
