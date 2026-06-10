import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ruleWarning, mealsWeekMonday } from "@/lib/utils/rules";
import { Header } from "@/components/brand/Header";
import { recipeStyle } from "@/lib/brand/recipeStyle";
import { autoFillMeals, shuffleMeals } from "@/app/actions/meals";

export const dynamic = "force-dynamic";

type RecipeRef = {
  id: string;
  name: string;
  cuisine: string | null;
  contains: string[] | null;
  is_kid_favourite: boolean;
};

type DayRow = {
  id: string;
  day_date: string;
  eating_at_home: boolean;
  snacks_notes: string | null;
  breakfast: RecipeRef | null;
  lunch: RecipeRef | null;
  dinner: RecipeRef | null;
};

type WeekBlock = {
  label: string;
  mondayIso: string;
  sundayIso: string;
  days: { iso: string; row: DayRow | null }[];
};

const DAY_LABEL: Record<string, string> = {
  "0": "Sunday",
  "1": "Monday",
  "2": "Tuesday",
  "3": "Wednesday",
  "4": "Thursday",
  "5": "Friday",
  "6": "Saturday",
};

const WEEK_LABELS = [
  "This week",
  "Next week",
  "Week after",
  "Two weeks after",
];

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export default async function MealsPage() {
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
  // No signed-in member → no meal plan to show. Bounce to the front door.
  if (!householdId) redirect("/");

  // Build the three-week window.
  // mealsWeekMonday (not planningWeekMonday) — Sunday counts as the end
  // of this week so Sunday dinner stays visible.
  const week0Monday = mealsWeekMonday();
  const weeks: WeekBlock[] = WEEK_LABELS.map((label, i) => {
    const mondayIso = addDaysIso(week0Monday, i * 7);
    const sundayIso = addDaysIso(mondayIso, 6);
    const days = Array.from({ length: 7 }, (_, d) => ({
      iso: addDaysIso(mondayIso, d),
      row: null as DayRow | null,
    }));
    return { label, mondayIso, sundayIso, days };
  });

  const rangeStart = weeks[0].mondayIso;
  const rangeEnd = weeks[weeks.length - 1].sundayIso;

  const { data: rows, error } = await supabase
    .from("meal_plan_days")
    .select(
      `id, day_date, eating_at_home, snacks_notes,
       breakfast:recipes!breakfast_recipe_id(id, name, cuisine, contains, is_kid_favourite),
       lunch:recipes!lunch_recipe_id(id, name, cuisine, contains, is_kid_favourite),
       dinner:recipes!dinner_recipe_id(id, name, cuisine, contains, is_kid_favourite)`,
    )
    .eq("household_id", householdId!)
    .gte("day_date", rangeStart)
    .lte("day_date", rangeEnd)
    .order("day_date");

  const allRows = (rows as unknown as DayRow[] | null) ?? [];
  const byDate = new Map<string, DayRow>();
  for (const r of allRows) byDate.set(r.day_date, r);
  for (const w of weeks) {
    for (const d of w.days) {
      d.row = byDate.get(d.iso) ?? null;
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle={`Meals — next 4 weeks · from ${fmt(rangeStart)}`} />

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">
          Couldn&apos;t load the meal plan. Try refresh.
        </p>
      ) : null}

      <div className="mt-8 space-y-10">
        {weeks.map((w, weekIndex) => {
          const plannedCount = w.days.filter((d) => d.row).length;
          // Count every empty meal slot across all 7 days × 3 meals = max 21.
          const emptyMealCount = w.days.reduce((acc, d) => {
            let n = 0;
            if (!d.row?.breakfast) n++;
            if (!d.row?.lunch) n++;
            if (!d.row?.dinner) n++;
            return acc + n;
          }, 0);
          // Protect "this week" and "next week" from accidental shuffle — those
          // are usually the ones Lisa has curated by hand. Shuffle starts on
          // the week after next.
          const allowShuffle = weekIndex >= 2;
          return (
            <section key={w.mondayIso}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-bold text-amber-300">
                  {w.label}
                </h2>
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {fmt(w.mondayIso)} – {fmt(w.sundayIso)}
                </span>
              </div>
              {emptyMealCount > 0 ? (
                <form action={autoFillMeals} className="mb-4">
                  <input
                    type="hidden"
                    name="week_monday"
                    value={w.mondayIso}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/20"
                  >
                    ✨ Auto-suggest meals for this week
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-slate-500">
                    Fills {emptyMealCount} empty{" "}
                    {emptyMealCount === 1 ? "meal" : "meals"} (breakfast, lunch
                    and dinner) using your family&apos;s rules. Kid favourites
                    on school nights.
                  </p>
                </form>
              ) : allowShuffle ? (
                <form action={shuffleMeals} className="mb-4">
                  <input
                    type="hidden"
                    name="week_monday"
                    value={w.mondayIso}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                  >
                    🎲 Shuffle these meals
                  </button>
                  <p className="mt-1.5 text-center text-[10px] text-slate-600">
                    Replaces all 21 meals (7 breakfasts, 7 lunches, 7 dinners)
                    with a fresh set of picks.
                  </p>
                </form>
              ) : null}
              {plannedCount === 0 && emptyMealCount === 0 ? (
                <p className="mb-3 text-xs text-slate-500">
                  Nothing planned for this week yet.
                </p>
              ) : null}
              <ol className="space-y-5">
                {w.days.map((d) =>
                  d.row ? (
                    <li
                      key={d.iso}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
                    >
                      <DayHero day={d.row} />
                      <div className="px-5 pt-3 pb-5">
                        <ul className="space-y-2 text-sm">
                          <MealRow
                            label="Breakfast"
                            r={d.row.breakfast}
                            member={memberName}
                          />
                          <MealRow
                            label="Lunch"
                            r={d.row.lunch}
                            member={memberName}
                          />
                          <MealRow
                            label="Dinner"
                            r={d.row.dinner}
                            member={memberName}
                          />
                        </ul>
                        {d.row.snacks_notes ? (
                          <p className="mt-3 border-t border-white/5 pt-3 text-xs text-slate-400">
                            {d.row.snacks_notes}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ) : (
                    <EmptyDayCard key={d.iso} iso={d.iso} />
                  ),
                )}
              </ol>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function DayHero({ day }: { day: DayRow }) {
  const featured = day.dinner ?? day.lunch ?? day.breakfast;
  const style = featured
    ? recipeStyle(featured.name, featured.cuisine)
    : { gradient: "linear-gradient(135deg,#475569,#fbbf24)", emoji: "🍽" };
  return (
    <div className="relative h-24 overflow-hidden" style={{ background: style.gradient }}>
      <span
        aria-hidden
        className="absolute -right-3 -top-3 select-none"
        style={{ fontSize: 96, lineHeight: 1, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}
      >
        {style.emoji}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
      <div className="absolute bottom-3 left-5 right-5 flex items-baseline justify-between text-white">
        <span className="font-display text-2xl font-bold drop-shadow">
          {dayName(day.day_date)}
        </span>
        <span className="text-xs uppercase tracking-wider opacity-90">
          {shortDate(day.day_date)}
        </span>
      </div>
    </div>
  );
}

function EmptyDayCard({ iso }: { iso: string }) {
  return (
    <li className="overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
      <div className="flex items-baseline justify-between px-5 pt-4">
        <span className="font-display text-xl font-bold text-slate-300">
          {dayName(iso)}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-slate-500">
          {shortDate(iso)}
        </span>
      </div>
      <p className="px-5 pt-1 pb-5 text-xs text-slate-500">Nothing planned yet.</p>
    </li>
  );
}

function MealRow({
  label,
  r,
  member,
}: {
  label: string;
  r: RecipeRef | null;
  member: string | null;
}) {
  if (!r) {
    return (
      <li className="flex items-baseline gap-3">
        <span className="w-20 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {label}
        </span>
        <span className="text-slate-500">—</span>
      </li>
    );
  }
  const warn = ruleWarning(r.contains, member);
  const { emoji } = recipeStyle(r.name, r.cuisine);
  return (
    <li className="flex items-baseline gap-3">
      <span className="w-20 text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <span className="flex-1">
        <Link
          href={`/recipes/${r.id}`}
          className="text-slate-100 underline-offset-2 hover:underline"
        >
          <span className="mr-1.5" aria-hidden>
            {emoji}
          </span>
          {r.name}
        </Link>
        {r.is_kid_favourite ? (
          <span className="ml-2 align-middle text-[10px]" aria-label="kids' favourite">
            ⭐
          </span>
        ) : null}
        {warn ? (
          <span className="mt-0.5 block text-[11px] text-amber-300">⚠ {warn}</span>
        ) : null}
      </span>
    </li>
  );
}

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
function shortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
function dayName(iso: string) {
  const d = new Date(iso + "T00:00:00").getDay();
  return DAY_LABEL[String(d)] ?? iso;
}
