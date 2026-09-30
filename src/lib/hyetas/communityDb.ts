/**
 * Community catalogue — server-side helpers (DB access). Household-scoped
 * wherever a household is involved: every write here takes the household
 * id from the caller, never a "first household" fallback.
 */

import { createClient } from "@/lib/supabase/server";
import { STARTER_RECIPES } from "./starterPacks";
import { starterStyle } from "./starterStyleTags";
import { fallbackPrice } from "./ingredientPrices";
import {
  aggregateRatings,
  costBandFor,
  detectContains,
  engineIngredientNames,
  estimateCost,
  parseQuantity,
  shownCostBand,
  type CommunityDish,
  type CommunityVariant,
  type PriceEntry,
  type RatingRow,
  type VariantIngredient,
} from "./community";
import type { EngineRecipe } from "./planEngine";

export const VARIANT_COLS =
  "id, dish_id, label, based_on_variant_id, author_member_id, author_household_id, author_display, is_starter, cuisine, prep_time_min, servings, ingredients, instructions_md, notes, contains, style_tags, complexity_submitted, complexity_shown, cost_est_aud, cost_band, cost_override_band, cost_unmatched, status, rating_avg, rating_count, households_rated, kid_avg, kid_count, cost_flags, report_count, created_at";

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

/**
 * Price lookup: the household's own price-checked grocery rows win (they
 * are real shelf prices), the built-in table fills the gaps.
 */
export async function priceLookupFor(householdId: string | null): Promise<(name: string) => PriceEntry | null> {
  const own = new Map<string, PriceEntry>();
  if (householdId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("grocery_items")
      .select("item, best_price, coles_price, woolies_price, price_checked_at")
      .eq("household_id", householdId)
      .not("price_checked_at", "is", null)
      .order("price_checked_at", { ascending: false })
      .limit(400);
    for (const g of (data as { item: string; best_price: number | null; coles_price: number | null; woolies_price: number | null }[] | null) ?? []) {
      const p = g.best_price ?? g.coles_price ?? g.woolies_price;
      const k = g.item.toLowerCase().trim();
      if (p != null && p > 0 && !own.has(k)) own.set(k, { price: Number(p), per: "each" });
    }
  }
  return (name: string) => own.get(name.trim()) ?? fallbackPrice(name);
}

/* ------------------------------------------------------------------ */
/* Starter catalogue (idempotent seed)                                 */
/* ------------------------------------------------------------------ */

export function starterToIngredients(ings: { name: string; quantity: string; aisle: string; is_pantry_staple?: boolean }[]): VariantIngredient[] {
  return ings.map((i) => {
    const q = parseQuantity(i.quantity);
    return {
      name: i.name,
      quantity: i.quantity,
      qty_value: q.value,
      qty_unit: q.unit,
      aisle: i.aisle,
      is_pantry_staple: i.is_pantry_staple ?? false,
      is_optional: false,
    };
  });
}

/** Make sure every starter recipe exists as a dish + default variant. */
export async function ensureStarterCatalogue(): Promise<void> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("community_variants")
    .select("id", { count: "exact", head: true })
    .eq("is_starter", true);
  if ((count ?? 0) >= STARTER_RECIPES.length) return;

  const { data: dishes } = await supabase.from("community_dishes").select("id, name");
  const have = new Map(((dishes as { id: string; name: string }[] | null) ?? []).map((d) => [d.name.toLowerCase(), d.id]));
  const lookup = await priceLookupFor(null);

  for (const r of STARTER_RECIPES) {
    if (have.has(r.name.toLowerCase())) continue;
    const { data: dish, error } = await supabase
      .from("community_dishes")
      .insert({ name: r.name, cuisine: r.cuisine })
      .select("id")
      .single();
    if (error || !dish) continue;
    const ingredients = starterToIngredients(r.ingredients);
    const st = starterStyle(r.name);
    const est = estimateCost(ingredients, lookup);
    const costEst = st.cost ?? est.total;
    const { data: v } = await supabase
      .from("community_variants")
      .insert({
        dish_id: dish.id,
        label: "The safe one",
        author_display: "Matilda",
        is_starter: true,
        cuisine: r.cuisine,
        prep_time_min: r.prep_time_min,
        servings: 4,
        ingredients,
        instructions_md: r.instructions_md,
        contains: detectContains(ingredients),
        style_tags: st.tags,
        complexity_submitted: r.prep_time_min <= 20 ? 1 : r.prep_time_min <= 35 ? 2 : 3,
        complexity_shown: r.prep_time_min <= 20 ? 1 : r.prep_time_min <= 35 ? 2 : 3,
        cost_est_aud: costEst,
        cost_band: costBandFor(costEst),
        cost_unmatched: est.unmatched,
        status: "verified",
      })
      .select("id")
      .single();
    if (v) await supabase.from("community_dishes").update({ default_variant_id: v.id }).eq("id", dish.id);
  }
}

/* ------------------------------------------------------------------ */
/* Household ↔ catalogue links                                         */
/* ------------------------------------------------------------------ */

/**
 * Link a household's existing recipes to catalogue dishes by name (starter
 * copies made before the catalogue existed). Idempotent and cheap.
 */
export async function linkHouseholdRecipes(householdId: string): Promise<void> {
  const supabase = await createClient();
  const { data: unlinked } = await supabase
    .from("recipes")
    .select("id, name")
    .eq("household_id", householdId)
    .is("dish_id", null);
  const list = (unlinked as { id: string; name: string }[] | null) ?? [];
  if (!list.length) return;
  const { data: dishes } = await supabase.from("community_dishes").select("id, name, default_variant_id");
  const byName = new Map(((dishes as CommunityDish[] | null) ?? []).map((d) => [d.name.toLowerCase(), d]));
  for (const r of list) {
    const d = byName.get(r.name.toLowerCase());
    if (!d || !d.default_variant_id) continue;
    await supabase.from("recipes").update({ dish_id: d.id, variant_id: d.default_variant_id }).eq("id", r.id);
    await supabase
      .from("household_dish_choices")
      .upsert({ household_id: householdId, dish_id: d.id, variant_id: d.default_variant_id, recipe_id: r.id }, { onConflict: "household_id,dish_id", ignoreDuplicates: true });
  }
}

export async function loadVariant(id: string): Promise<CommunityVariant | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("community_variants").select(VARIANT_COLS).eq("id", id).maybeSingle();
  return (data as CommunityVariant | null) ?? null;
}

export async function loadDish(id: string): Promise<CommunityDish | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("community_dishes").select("id, name, cuisine, default_variant_id").eq("id", id).maybeSingle();
  return (data as CommunityDish | null) ?? null;
}

export async function loadDishVariants(dishId: string): Promise<CommunityVariant[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_variants")
    .select(VARIANT_COLS)
    .eq("dish_id", dishId)
    .in("status", ["unverified", "verified"])
    .order("rating_avg", { ascending: false, nullsFirst: false });
  return (data as CommunityVariant[] | null) ?? [];
}

/**
 * Give the household its own copy of a variant (recipe + recipe_ingredients)
 * so the plan engine and the grocery consolidator see it like any other
 * recipe. `makeDefault` also makes it "our way" for the dish: the copy is
 * active and any other copies of the same dish go inactive (shadow copies —
 * still valid targets for a one-week switch).
 */
export async function linkVariantIntoHousehold(
  householdId: string,
  variant: CommunityVariant,
  opts: { makeDefault: boolean },
): Promise<string> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("recipes")
    .select("id, is_active")
    .eq("household_id", householdId)
    .eq("variant_id", variant.id)
    .maybeSingle();

  const { data: choice } = await supabase
    .from("household_dish_choices")
    .select("variant_id, recipe_id")
    .eq("household_id", householdId)
    .eq("dish_id", variant.dish_id)
    .maybeSingle();
  const firstForDish = !choice;
  const makeDefault = opts.makeDefault || firstForDish;

  // recipes has a unique (household_id, name): the household's "our way"
  // copy carries the dish name; other copies of the same dish are
  // "Dish · Label" so a one-week switch never collides.
  const { data: dish } = await supabase.from("community_dishes").select("name").eq("id", variant.dish_id).maybeSingle();
  const dishName = (dish?.name as string | undefined) ?? variant.label;
  const altName = `${dishName} · ${variant.label}`.slice(0, 120);

  let recipeId = existing?.id as string | undefined;
  if (!recipeId) {
    const { data: inserted, error } = await supabase
      .from("recipes")
      .insert({
        household_id: householdId,
        name: makeDefault ? dishName : altName,
        cuisine: variant.cuisine,
        meal_types: ["dinner"],
        servings: variant.servings,
        prep_time_min: variant.prep_time_min,
        instructions_md: variant.instructions_md,
        ingredients_md: variant.ingredients.map((i) => `${i.quantity ?? ""} ${i.name}`.trim()).join("\n"),
        notes: variant.notes,
        contains: variant.contains.filter((c) => ["peanut", "avocado", "oats", "banana_cooked"].includes(c)),
        is_peanut_free: !variant.contains.includes("peanut"),
        is_kid_favourite: variant.style_tags.includes("Kid-friendly"),
        is_active: makeDefault,
        style_tags: variant.style_tags,
        est_cost_aud: variant.cost_est_aud,
        dish_id: variant.dish_id,
        variant_id: variant.id,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not copy the recipe");
    recipeId = inserted.id as string;
    if (variant.ingredients.length) {
      await supabase.from("recipe_ingredients").insert(
        variant.ingredients.map((i) => ({
          recipe_id: recipeId,
          name: i.name,
          quantity: i.quantity,
          qty_value: i.qty_value,
          qty_unit: i.qty_unit,
          aisle: i.aisle,
          is_pantry_staple: i.is_pantry_staple,
          is_optional: i.is_optional,
        })),
      );
    }
  }

  if (makeDefault) {
    // Only one active copy per dish, and only it carries the bare dish name.
    const { data: siblings } = await supabase
      .from("recipes")
      .select("id, variant_id")
      .eq("household_id", householdId)
      .eq("dish_id", variant.dish_id)
      .neq("id", recipeId);
    for (const sib of (siblings as { id: string; variant_id: string | null }[] | null) ?? []) {
      const { data: sv } = sib.variant_id
        ? await supabase.from("community_variants").select("label").eq("id", sib.variant_id).maybeSingle()
        : { data: null };
      await supabase
        .from("recipes")
        .update({ is_active: false, name: `${dishName} · ${(sv?.label as string | undefined) ?? "other way"}`.slice(0, 120) })
        .eq("id", sib.id);
    }
    await supabase.from("recipes").update({ is_active: true, name: dishName }).eq("id", recipeId);
    await supabase
      .from("household_dish_choices")
      .upsert({ household_id: householdId, dish_id: variant.dish_id, variant_id: variant.id, recipe_id: recipeId, updated_at: new Date().toISOString() }, { onConflict: "household_id,dish_id" });
  }
  return recipeId!;
}

/* ------------------------------------------------------------------ */
/* Ratings                                                             */
/* ------------------------------------------------------------------ */

export async function refreshVariantStats(variantId: string): Promise<void> {
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("community_variants")
    .select("complexity_submitted, status, report_count")
    .eq("id", variantId)
    .maybeSingle();
  if (!v) return;
  const { data: rows } = await supabase
    .from("recipe_ratings")
    .select("member_id, household_id, is_grownup, stars, complexity_vote, cost_flag")
    .eq("variant_id", variantId);
  const agg = aggregateRatings((rows as RatingRow[] | null) ?? [], v.complexity_submitted as number, {
    status: v.status as CommunityVariant["status"],
    report_count: v.report_count as number,
  });
  await supabase
    .from("community_variants")
    .update({ ...agg, updated_at: new Date().toISOString() })
    .eq("id", variantId);
}

/* ------------------------------------------------------------------ */
/* Catalogue cards for the plan's options screen                       */
/* ------------------------------------------------------------------ */

export type CatalogueCard = {
  /** "ours" = the household has a copy; "everyone" = only in the catalogue. */
  source: "ours" | "everyone";
  /** Household recipe id when source = ours. */
  recipeId: string | null;
  dishId: string | null;
  dishName: string;
  variant: CommunityVariant | null;
  variantCount: number;
  engine: EngineRecipe;
  rating_avg: number | null;
  rating_count: number;
  kid_avg: number | null;
  complexity: number;
  costBand: number | null;
  costEst: number | null;
  verified: boolean;
};

/**
 * One card per dish. For dishes the household has, the card is their
 * chosen variant's copy; for the rest, the dish's default variant.
 * Legacy household recipes with no catalogue link get a plain card.
 */
export async function loadCatalogueCards(householdId: string): Promise<CatalogueCard[]> {
  const supabase = await createClient();
  const [{ data: recipes }, { data: dishes }, { data: variants }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, cuisine, meal_types, prep_time_min, contains, style_tags, est_cost_aud, is_kid_favourite, dish_id, variant_id")
      .eq("household_id", householdId)
      .eq("is_active", true),
    supabase.from("community_dishes").select("id, name, cuisine, default_variant_id"),
    supabase.from("community_variants").select(VARIANT_COLS).in("status", ["unverified", "verified"]),
  ]);
  const ours = (recipes as (Omit<EngineRecipe, "ingredients"> & { dish_id: string | null; variant_id: string | null })[] | null) ?? [];
  const dishList = (dishes as CommunityDish[] | null) ?? [];
  const vList = (variants as CommunityVariant[] | null) ?? [];
  const vById = new Map(vList.map((v) => [v.id, v]));
  const countByDish = new Map<string, number>();
  for (const v of vList) countByDish.set(v.dish_id, (countByDish.get(v.dish_id) ?? 0) + 1);

  const { data: ings } = ours.length
    ? await supabase.from("recipe_ingredients").select("recipe_id, name").in("recipe_id", ours.map((r) => r.id))
    : { data: [] };
  const byRecipe = new Map<string, string[]>();
  for (const i of (ings as { recipe_id: string; name: string }[] | null) ?? []) {
    if (!byRecipe.has(i.recipe_id)) byRecipe.set(i.recipe_id, []);
    byRecipe.get(i.recipe_id)!.push(i.name.toLowerCase());
  }

  const cards: CatalogueCard[] = [];
  const dishesCovered = new Set<string>();
  for (const r of ours) {
    const v = r.variant_id ? vById.get(r.variant_id) ?? null : null;
    if (r.dish_id) dishesCovered.add(r.dish_id);
    cards.push({
      source: "ours",
      recipeId: r.id,
      dishId: r.dish_id,
      dishName: r.name,
      variant: v,
      variantCount: r.dish_id ? countByDish.get(r.dish_id) ?? 0 : 0,
      engine: { ...r, ingredients: byRecipe.get(r.id) ?? (v ? engineIngredientNames(v.ingredients) : []) },
      rating_avg: v?.rating_avg ?? null,
      rating_count: v?.rating_count ?? 0,
      kid_avg: v?.kid_avg ?? null,
      complexity: v ? Number(v.complexity_shown) : (r.prep_time_min ?? 30) <= 20 ? 1 : (r.prep_time_min ?? 30) <= 35 ? 2 : 3,
      costBand: v ? shownCostBand(v) : costBandFor(r.est_cost_aud),
      costEst: v?.cost_est_aud ?? r.est_cost_aud,
      verified: v?.status === "verified",
    });
  }
  for (const d of dishList) {
    if (dishesCovered.has(d.id) || !d.default_variant_id) continue;
    // The card shows the safe default — unless a verified variant is rated
    // clearly higher, in which case the best way we know leads.
    const dflt = vById.get(d.default_variant_id);
    const best = vList
      .filter((x) => x.dish_id === d.id && x.status === "verified" && x.rating_avg != null)
      .sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg))[0];
    const v = best && dflt && Number(best.rating_avg) >= Number(dflt.rating_avg ?? 0) + 0.5 ? best : dflt;
    if (!v) continue;
    cards.push({
      source: "everyone",
      recipeId: null,
      dishId: d.id,
      dishName: d.name,
      variant: v,
      variantCount: countByDish.get(d.id) ?? 1,
      engine: {
        id: `v:${v.id}`,
        name: d.name,
        cuisine: v.cuisine,
        meal_types: ["dinner"],
        prep_time_min: v.prep_time_min,
        contains: v.contains,
        style_tags: v.style_tags,
        est_cost_aud: v.cost_est_aud,
        is_kid_favourite: v.style_tags.includes("Kid-friendly"),
        ingredients: engineIngredientNames(v.ingredients),
      },
      rating_avg: v.rating_avg,
      rating_count: v.rating_count,
      kid_avg: v.kid_avg,
      complexity: Number(v.complexity_shown),
      costBand: shownCostBand(v),
      costEst: v.cost_est_aud,
      verified: v.status === "verified",
    });
  }
  return cards;
}
