import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import { Header } from "@/components/brand/Header";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { StarterRecipePicker } from "@/components/onboarding/StarterRecipePicker";
import { addStarterRecipes } from "@/app/actions/recipes";

export const dynamic = "force-dynamic";

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await getCurrentMember();
  if (!me) redirect("/");

  // Starters the family already owns get filtered out of the quick-add list.
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("recipes")
    .select("name")
    .eq("household_id", me!.household_id);
  const excludeNames = (
    (existing as { name: string }[] | null) ?? []
  ).map((r) => r.name);

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Add a recipe to your cookbook" />

      <Link
        href="/recipes"
        className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
      >
        ← All recipes
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        New recipe
      </h1>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {/* ------- Quick-add from the starter catalog ------- */}
      <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
        <p className="font-display text-lg font-bold text-slate-100">
          Quick-add from the starters
        </p>
        <p className="mt-1 text-xs text-slate-400">
          The same crowd-pleasers from setup — tick any, flick through with{" "}
          <span className="text-slate-200">More</span>. Ones you already
          have don&apos;t show. Each comes with its shopping list.
        </p>
        <StarterRecipePicker
          action={addStarterRecipes}
          excludeNames={excludeNames}
          pretickSuggested={false}
          allowEmptySubmit={false}
        />
      </section>

      <div className="mt-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          or write your own
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <RecipeForm mode="new" />
    </main>
  );
}
