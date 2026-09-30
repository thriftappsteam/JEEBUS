// /dish/[id]?v=… — a dish in the community catalogue: read any variant,
// rate it, make it our way. This is the page for recipes the household
// doesn't have a copy of yet.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures } from "@/lib/hyetas/features";
import { RecipeHero } from "@/components/brand/RecipeHero";
import { Toast } from "@/components/brand/Toast";
import { loadDish, loadDishVariants } from "@/lib/hyetas/communityDb";
import { setOurWay } from "@/app/community/actions";
import { OtherWays, RatingForm, ReportLink, VariantStrip } from "@/components/recipes/Community";

export const dynamic = "force-dynamic";

export default async function DishPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string; rated?: string; reported?: string; back?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx;
  if (!resolveFeatures(household.features).community) redirect("/recipes");
  const grownUp = member.role === "parent" || member.role === "partner";

  const dish = await loadDish(id);
  if (!dish) notFound();
  const variants = await loadDishVariants(dish.id);
  const variant = variants.find((v) => v.id === sp.v) ?? variants.find((v) => v.id === dish.default_variant_id) ?? variants[0];
  if (!variant) notFound();

  const supabase = await createClient();
  const [{ data: choice }, { data: m }] = await Promise.all([
    supabase.from("household_dish_choices").select("variant_id, recipe_id").eq("household_id", household.id).eq("dish_id", dish.id).maybeSingle(),
    supabase.from("recipe_ratings").select("stars, complexity_vote, cost_flag").eq("variant_id", variant.id).eq("member_id", member.id).maybeSingle(),
  ]);
  const ourWayVariantId = (choice?.variant_id as string | undefined) ?? null;
  const ourRecipeId = (choice?.recipe_id as string | undefined) ?? null;
  const back = `/dish/${dish.id}?v=${variant.id}`;
  const toast = sp.rated ? "Thanks — rating saved" : sp.reported ? "Reported. Thrift Apps will take a look." : null;

  return (
    <main className="mx-auto max-w-md pb-8">
      <RecipeHero name={dish.name} cuisine={variant.cuisine ?? dish.cuisine} height={220} />
      <div className="px-6 -mt-12 relative z-10 flex items-center justify-between">
        <Link href={sp.back ?? (ourRecipeId ? `/recipes/${ourRecipeId}` : "/plan?options=1")} className="inline-block text-[10px] uppercase tracking-[0.18em] text-white drop-shadow hover:text-amber-200">
          ← Back
        </Link>
        <span className="rounded-full border border-white/40 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white drop-shadow">Everyone&apos;s</span>
      </div>

      <header className="px-6 mt-6">
        <h1 className="font-display text-4xl font-bold tracking-tight text-slate-50">{dish.name}</h1>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {[variant.cuisine, `serves ${variant.servings}`, variant.prep_time_min ? `${variant.prep_time_min} min` : null].filter(Boolean).join(" · ")}
        </p>
        <VariantStrip v={variant} isOurWay={variant.id === ourWayVariantId} />
      </header>

      <div className="mx-6"><Toast message={toast} /></div>

      {grownUp ? (
        <div className="mx-6 mt-5">
          {variant.id === ourWayVariantId ? (
            <Link href={`/recipes/${ourRecipeId}`} className="block w-full rounded-2xl border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-center text-sm font-semibold text-amber-200">
              This is our way · open our copy
            </Link>
          ) : (
            <form action={setOurWay}>
              <input type="hidden" name="variant_id" value={variant.id} />
              <button className="block w-full rounded-2xl bg-amber-300 px-5 py-3.5 text-center text-sm font-bold text-slate-950 hover:bg-amber-200">
                {ourWayVariantId ? "Make this our way instead" : "Add to our recipes"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {variant.notes ? (
        <p className="mx-6 mt-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">{variant.notes}</p>
      ) : null}

      <section className="px-6 mt-8">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Ingredients</h2>
        <ul className="mt-3 space-y-1 text-sm text-slate-200">
          {variant.ingredients.map((i, k) => (
            <li key={k}>{i.quantity ? `${i.quantity} ` : ""}{i.name}{i.is_optional ? " (optional)" : ""}{i.is_pantry_staple ? <span className="text-slate-500"> · pantry</span> : null}</li>
          ))}
        </ul>
      </section>

      {variant.instructions_md ? (
        <section className="px-6 mt-8">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Steps</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-200 font-body">{variant.instructions_md}</pre>
        </section>
      ) : null}

      <section className="px-6 mt-8">
        <RatingForm variantId={variant.id} back={back} mine={(m as { stars: number; complexity_vote: number | null; cost_flag: boolean } | null) ?? null} grownUp={grownUp} />
      </section>

      <OtherWays dishId={dish.id} dishName={dish.name} variants={variants} currentVariantId={variant.id} ourWayVariantId={ourWayVariantId} grownUp={grownUp} />

      {!variant.is_starter ? <ReportLink variantId={variant.id} back={back} /> : null}
    </main>
  );
}
