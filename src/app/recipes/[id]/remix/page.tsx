// /recipes/[id]/remix — "Make it my way". Edit a copy of a recipe and
// publish it to everyone as a variant of the dish (or as a new dish).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures } from "@/lib/hyetas/features";
import { Header } from "@/components/brand/Header";
import { RemixEditor, type RemixBase } from "@/components/recipes/RemixEditor";
import { loadVariant } from "@/lib/hyetas/communityDb";
import { parseQuantity, type VariantIngredient } from "@/lib/hyetas/community";

export const dynamic = "force-dynamic";

export default async function RemixPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx;
  if (!resolveFeatures(household.features).community) redirect(`/recipes/${id}`);
  const grownUp = member.role === "parent" || member.role === "partner";

  const supabase = await createClient();
  const { data: r } = await supabase
    .from("recipes")
    .select("id, household_id, name, cuisine, prep_time_min, servings, instructions_md, ingredients_md, notes, dish_id, variant_id")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle();
  if (!r) notFound();

  const variant = r.variant_id ? await loadVariant(r.variant_id as string) : null;
  let ingredients: VariantIngredient[] = variant?.ingredients ?? [];
  if (!ingredients.length) {
    const { data: rows } = await supabase
      .from("recipe_ingredients")
      .select("name, quantity, qty_value, qty_unit, aisle, is_pantry_staple, is_optional")
      .eq("recipe_id", r.id);
    ingredients = ((rows as VariantIngredient[] | null) ?? []).map((i) => ({ ...i, is_pantry_staple: !!i.is_pantry_staple, is_optional: !!i.is_optional }));
  }
  if (!ingredients.length && r.ingredients_md) {
    // Free-text recipes: best-effort split "500 g pasta" → qty + name.
    ingredients = String(r.ingredients_md)
      .split(/\n+/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^((?:\d+[\d/.\s]*)?\s*(?:g|kg|ml|l|cups?|tbsp|tsp|cloves?|slices?|bags?|tins?|cans?|packets?|bunch)?)\s+(.+)$/i);
        const quantity = m && m[1].trim() ? m[1].trim() : null;
        const name = m ? m[2] : line;
        const q = parseQuantity(quantity);
        return { name, quantity, qty_value: q.value, qty_unit: q.unit, aisle: "Other", is_pantry_staple: false, is_optional: false };
      });
  }

  let dishName = r.name as string;
  if (r.dish_id) {
    const { data: d } = await supabase.from("community_dishes").select("name").eq("id", r.dish_id).maybeSingle();
    if (d?.name) dishName = d.name as string;
  }

  const base: RemixBase = {
    recipeId: r.id as string,
    dishId: (r.dish_id as string | null) ?? null,
    dishName,
    variantId: (r.variant_id as string | null) ?? null,
    variantLabel: variant?.label ?? null,
    cuisine: (r.cuisine as string | null) ?? variant?.cuisine ?? null,
    prep_time_min: (r.prep_time_min as number | null) ?? variant?.prep_time_min ?? null,
    servings: (r.servings as number | null) ?? variant?.servings ?? 4,
    ingredients,
    instructions_md: (r.instructions_md as string | null) ?? variant?.instructions_md ?? "",
    notes: (r.notes as string | null) ?? "",
    complexity: variant ? Math.round(Number(variant.complexity_shown)) : 2,
  };

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-24">
      <Header subtitle="Make it my way" />
      <Link href={`/recipes/${id}`} className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-amber-200">
        ← Back to {r.name as string}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        {dishName}, <span className="text-amber-300">your way</span>
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {variant ? `Starting from “${variant.label}”${variant.author_display ? ` by ${variant.author_display}` : ""}.` : "Starting from your household's copy."} Take out what you don&apos;t use, add the secret ingredient, fix the steps.
      </p>
      {!grownUp ? (
        <p className="mt-4 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          You can draft it, but a grown-up has to hit publish.
        </p>
      ) : null}
      <RemixEditor base={base} error={error} />
    </main>
  );
}
