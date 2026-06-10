import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ruleWarning } from "@/lib/utils/rules";
import { Header } from "@/components/brand/Header";
import { RecipeHero } from "@/components/brand/RecipeHero";
import { Toast } from "@/components/brand/Toast";

export const dynamic = "force-dynamic";

type Recipe = {
  id: string;
  name: string;
  cuisine: string | null;
  meal_types: string[] | null;
  servings: number | null;
  prep_time_min: number | null;
  is_peanut_free: boolean;
  is_kid_favourite: boolean;
  contains: string[] | null;
};

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; removed?: string }>;
}) {
  const { added, removed } = await searchParams;
  const toastMessage = added
    ? "Recipe added"
    : removed
      ? "Recipe removed"
      : null;

  const supabase = await createClient();
  const cookieStore = await cookies();
  const memberId = cookieStore.get("hyetas_member_id")?.value ?? null;

  let memberName: string | null = null;
  let householdId: string | null = null;
  if (memberId) {
    const { data: m } = await supabase
      .from("members")
      .select("name, household_id")
      .eq("id", memberId)
      .maybeSingle();
    memberName = m?.name ?? null;
    householdId = (m?.household_id as string | undefined) ?? null;
  }
  // No signed-in member → not your recipe box. Bounce to the front door.
  if (!householdId) redirect("/");

  const { data: rows } = await supabase
    .from("recipes")
    .select(
      "id, name, cuisine, meal_types, servings, prep_time_min, is_peanut_free, is_kid_favourite, contains",
    )
    .eq("household_id", householdId!)
    .eq("is_active", true)
    .order("name");

  const recipes = (rows as Recipe[] | null) ?? [];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle={`${recipes.length} in the cookbook · all peanut-free`} />

      <Toast message={toastMessage} />

      <div className="mt-6 flex justify-end">
        <Link
          href="/recipes/new"
          className="rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/20"
        >
          + Add recipe
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {recipes.map((r) => {
          const warn = ruleWarning(r.contains, memberName);
          return (
            <li key={r.id}>
              <Link
                href={`/recipes/${r.id}`}
                className="block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-amber-500/60"
              >
                <RecipeHero name={r.name} cuisine={r.cuisine} height={110} />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-100">
                    {r.name}
                    {r.is_kid_favourite ? (
                      <span className="ml-1 align-middle text-[10px]" aria-label="kids' favourite">
                        ⭐
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {r.cuisine}
                    {r.prep_time_min ? ` · ${r.prep_time_min}m` : ""}
                  </p>
                  {warn ? (
                    <p className="mt-1.5 text-[10px] text-amber-300">⚠ {warn}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
