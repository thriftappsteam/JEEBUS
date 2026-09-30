import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures } from "@/lib/hyetas/features";
import { ruleWarning } from "@/lib/utils/rules";
import { RecipeHero } from "@/components/brand/RecipeHero";
import { Toast } from "@/components/brand/Toast";
import { loadDishVariants, loadVariant, linkHouseholdRecipes, ensureStarterCatalogue } from "@/lib/hyetas/communityDb";
import { OtherWays, RatingForm, ReportLink, VariantStrip } from "@/components/recipes/Community";

export const dynamic = "force-dynamic";

type Recipe = {
  id: string;
  household_id: string;
  name: string;
  cuisine: string | null;
  meal_types: string[] | null;
  servings: number | null;
  prep_time_min: number | null;
  notes: string | null;
  is_peanut_free: boolean;
  is_kid_favourite: boolean;
  contains: string[] | null;
  ingredients_md: string | null;
  instructions_md: string | null;
  source_url: string | null;
  dish_id: string | null;
  variant_id: string | null;
};

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; published?: string; ourway?: string; rated?: string; reported?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const toastMessage = sp.saved
    ? "Changes saved"
    : sp.published
      ? "Published — it's live for everyone as Unverified, and it's now our way"
      : sp.ourway
        ? "That's our way now. The plan and the list follow."
        : sp.rated
          ? "Thanks — rating saved"
          : sp.reported
            ? "Reported. Thrift Apps will take a look."
            : null;

  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx;
  const community = resolveFeatures(household.features).community;
  const grownUp = member.role === "parent" || member.role === "partner";
  const supabase = await createClient();

  // Household-scoped: you can only open your own household's copies.
  const { data: r, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle();
  if (error || !r) notFound();
  let recipe = r as Recipe;
  const warn = ruleWarning(recipe.contains, member.name);

  // Community layer (lazy: link legacy copies to the catalogue by name).
  if (community && !recipe.dish_id) {
    await ensureStarterCatalogue();
    await linkHouseholdRecipes(household.id);
    const { data: again } = await supabase.from("recipes").select("dish_id, variant_id").eq("id", id).maybeSingle();
    if (again) recipe = { ...recipe, dish_id: again.dish_id as string | null, variant_id: again.variant_id as string | null };
  }
  const variant = community && recipe.variant_id ? await loadVariant(recipe.variant_id) : null;
  const variants = community && recipe.dish_id ? await loadDishVariants(recipe.dish_id) : [];
  let dishName = recipe.name;
  let ourWayVariantId: string | null = null;
  if (community && recipe.dish_id) {
    const [{ data: d }, { data: choice }] = await Promise.all([
      supabase.from("community_dishes").select("name").eq("id", recipe.dish_id).maybeSingle(),
      supabase.from("household_dish_choices").select("variant_id").eq("household_id", household.id).eq("dish_id", recipe.dish_id).maybeSingle(),
    ]);
    if (d?.name) dishName = d.name as string;
    ourWayVariantId = (choice?.variant_id as string | undefined) ?? null;
  }
  let mine: { stars: number; complexity_vote: number | null; cost_flag: boolean } | null = null;
  if (variant) {
    const { data: m } = await supabase
      .from("recipe_ratings")
      .select("stars, complexity_vote, cost_flag")
      .eq("variant_id", variant.id)
      .eq("member_id", member.id)
      .maybeSingle();
    mine = (m as typeof mine) ?? null;
  }
  const back = `/recipes/${recipe.id}`;
  const ingredientLines = variant?.ingredients.length
    ? variant.ingredients.map((i) => `${i.quantity ? `${i.quantity} ` : ""}${i.name}${i.is_optional ? " (optional)" : ""}`)
    : null;

  return (
    <main className="mx-auto max-w-md pb-8">
      <RecipeHero name={recipe.name} cuisine={recipe.cuisine} height={220} />

      <div className="px-6 -mt-12 relative z-10 flex items-center justify-between">
        <Link href="/recipes" className="inline-block text-[10px] uppercase tracking-[0.18em] text-white drop-shadow hover:text-amber-200">
          ← Recipes
        </Link>
        <div className="flex gap-2">
          {community ? (
            <Link href={`/recipes/${recipe.id}/remix`} className="rounded-full border border-amber-300/60 bg-amber-300/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950 drop-shadow hover:bg-amber-200">
              Make it my way
            </Link>
          ) : null}
          <Link href={`/recipes/${recipe.id}/edit`} className="rounded-full border border-white/40 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white drop-shadow hover:bg-black/50">
            Edit
          </Link>
        </div>
      </div>

      <header className="px-6 mt-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-50">{recipe.name}</h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {[recipe.cuisine, ...(recipe.meal_types ?? []), recipe.servings ? `serves ${recipe.servings}` : null, recipe.prep_time_min ? `${recipe.prep_time_min} min` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recipe.is_peanut_free ? (
            <span className="rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2 py-0.5 text-[10px] text-emerald-300">peanut-free</span>
          ) : null}
          {recipe.is_kid_favourite ? (
            <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-[10px] text-amber-300">⭐ kid favourite</span>
          ) : null}
        </div>
        {variant ? <VariantStrip v={variant} isOurWay={variant.id === ourWayVariantId} /> : null}
      </header>

      <div className="mx-6">
        <Toast message={toastMessage} />
      </div>

      {warn ? (
        <p className="mx-6 mt-6 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">⚠ {warn}</p>
      ) : null}

      {recipe.notes ? (
        <p className="mx-6 mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">{recipe.notes}</p>
      ) : null}

      {ingredientLines ? (
        <section className="px-6 mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Ingredients</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-200">
            {ingredientLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      ) : recipe.ingredients_md ? (
        <section className="px-6 mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Ingredients</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-body">{recipe.ingredients_md}</pre>
        </section>
      ) : null}

      {recipe.instructions_md ? (
        <section className="px-6 mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Steps</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-body">{recipe.instructions_md}</pre>
        </section>
      ) : null}

      {variant ? (
        <section className="px-6 mt-8">
          <RatingForm variantId={variant.id} back={back} mine={mine} grownUp={grownUp} />
        </section>
      ) : null}

      {community && recipe.dish_id ? (
        <OtherWays dishId={recipe.dish_id} dishName={dishName} variants={variants} currentVariantId={recipe.variant_id} ourWayVariantId={ourWayVariantId} grownUp={grownUp} />
      ) : null}

      {recipe.source_url ? (
        <p className="px-6 mt-8 text-xs text-slate-500">
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200">Source ↗</a>
        </p>
      ) : null}

      {variant && !variant.is_starter ? <ReportLink variantId={variant.id} back={back} /> : null}
    </main>
  );
}
