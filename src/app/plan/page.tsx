// /plan — Matilda's weekly food plan. The intent-first front door for meals.
//
// Three states, decided server-side:
//   1. Set-up (first run, or ?step=… from settings): one question per screen.
//   2. Week not planned yet: "Same as last week?" → plan it / give me options.
//   3. Week planned: the plan, tap-to-swap, the surprise, budget line, links
//      to the grocery list and the full 4-week /meals view.
//
// Household-scoped throughout: everything hangs off the cookie member.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures } from "@/lib/hyetas/features";
import { Header } from "@/components/brand/Header";
import { recipeStyle } from "@/lib/brand/recipeStyle";
import { planningWeekMonday } from "@/lib/utils/rules";
import {
  resolvePlanPrefs,
  hasCompletedSetup,
  describeRules,
  fmtClock,
  SETUP_STEPS,
  STYLE_OPTIONS,
  DIET_RULES,
  AVOID_OPTIONS,
  CHAINS,
  type SetupStep,
  type PlanPrefs,
} from "@/lib/hyetas/planPrefs";
import {
  recipeAllowed,
  shuffle,
  styleScore,
  estimateWeekCost,
  DINNER_SHARE,
  type EngineRecipe,
} from "@/lib/hyetas/planEngine";
import {
  saveSetupStep,
  generateWeek,
  swapDinner,
  toggleEatOut,
  surpriseDecision,
} from "./actions";
import { useVariantForNight } from "@/app/community/actions";
import {
  ensureStarterCatalogue,
  linkHouseholdRecipes,
  loadCatalogueCards,
  type CatalogueCard,
} from "@/lib/hyetas/communityDb";
import { CATALOGUE_SORTS, costGlyph, type CatalogueSort, type CommunityVariant } from "@/lib/hyetas/community";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* Small UI bits (server-rendered, no client JS)                        */
/* ------------------------------------------------------------------ */

const CHIP =
  "cursor-pointer select-none rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-200 transition peer-checked:border-amber-300 peer-checked:bg-amber-300 peer-checked:font-semibold peer-checked:text-slate-950 hover:border-white/25";
const TILE =
  "block cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition peer-checked:border-amber-300 peer-checked:bg-amber-300/10 hover:border-white/25";
const BTN =
  "block w-full rounded-2xl bg-amber-300 px-5 py-3.5 text-center text-sm font-bold text-slate-950 transition hover:bg-amber-200";
const BTN_GHOST =
  "block w-full rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-center text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200";
const INPUT =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300 focus:outline-none";
const LABEL = "text-[11px] uppercase tracking-[0.16em] text-slate-400";

function Chip({
  name,
  value,
  label,
  checked,
  type = "checkbox",
}: {
  name: string;
  value: string;
  label: string;
  checked?: boolean;
  type?: "checkbox" | "radio";
}) {
  const id = `${name}-${value}`.replace(/[^a-z0-9_-]/gi, "_");
  return (
    <span>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <label htmlFor={id} className={CHIP}>
        {label}
      </label>
    </span>
  );
}

function Tile({
  name,
  value,
  emoji,
  title,
  blurb,
  checked,
  type = "checkbox",
}: {
  name: string;
  value: string;
  emoji: string;
  title: string;
  blurb: string;
  checked?: boolean;
  type?: "checkbox" | "radio";
}) {
  const id = `${name}-${value}`.replace(/[^a-z0-9_-]/gi, "_");
  return (
    <div>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <label htmlFor={id} className={TILE}>
        <span className="text-2xl">{emoji}</span>
        <span className="mt-1 block text-sm font-semibold text-slate-100">{title}</span>
        <span className="block text-xs text-slate-400">{blurb}</span>
      </label>
    </div>
  );
}

function Say({
  emoji,
  children,
  sub,
}: {
  emoji: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mt-6 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 text-xl">
        {emoji}
      </span>
      <div>
        <p className="font-display text-2xl font-medium leading-tight text-slate-50">
          {children}
        </p>
        {sub ? <p className="mt-1 text-sm text-slate-400">{sub}</p> : null}
      </div>
    </div>
  );
}

function Progress({ step }: { step: SetupStep }) {
  const i = SETUP_STEPS.indexOf(step);
  return (
    <div className="mt-3 flex gap-1" aria-hidden>
      {SETUP_STEPS.map((s, k) => (
        <span
          key={s}
          className={`h-1 flex-1 rounded-full ${k <= i ? "bg-amber-300" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(iso + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
function fmtDay(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", {
    weekday: "short",
    timeZone: "UTC",
  });
}
function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
function todayIsoMelbourne(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Search = {
  step?: string;
  options?: string;
  first?: string;
  week?: string;
  planned?: string;
  error?: string;
  source?: string;
  sort?: string;
};

type MemberRow = { id: string; name: string; role: string };
type StandingRow = {
  id: string;
  item: string;
  every_weeks: number | null;
  last_bought_on: string | null;
};
type DayRow = {
  id: string;
  day_date: string;
  eating_at_home: boolean;
  plan_meta: Record<string, unknown> | null;
  breakfast: RecipeRef | null;
  lunch: RecipeRef | null;
  dinner: RecipeRef | null;
};
type RecipeRef = {
  id: string;
  name: string;
  cuisine: string | null;
  prep_time_min: number | null;
  est_cost_aud: number | null;
  dish_id?: string | null;
  variant_id?: string | null;
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx;
  const features = resolveFeatures(household.features);
  if (!features.meals || !features.plan) redirect("/meals");

  const supabase = await createClient();
  const { data: hh } = await supabase
    .from("households")
    .select("plan_prefs")
    .eq("id", household.id)
    .maybeSingle();
  const prefs = resolvePlanPrefs(hh?.plan_prefs ?? null);
  const grownUp = member.role === "parent" || member.role === "partner";

  /* ---------------- 1. Set-up ---------------- */
  const stepParam = sp.step as SetupStep | undefined;
  const inSetup =
    (!hasCompletedSetup(prefs) || (stepParam && SETUP_STEPS.includes(stepParam))) &&
    grownUp;
  if (!hasCompletedSetup(prefs) && !grownUp) {
    return (
      <main className="mx-auto max-w-md px-6 pt-10 pb-24">
        <Header subtitle="Weekly food plan" />
        <Say emoji="👋" sub="A grown-up needs to answer a few questions first. Then dinner shows up here every night.">
          Not set up yet.
        </Say>
      </main>
    );
  }
  if (inSetup) {
    const step: SetupStep =
      stepParam && SETUP_STEPS.includes(stepParam) ? stepParam : "who";
    return (
      <SetupScreen
        step={step}
        prefs={prefs}
        householdId={household.id}
        editing={hasCompletedSetup(prefs)}
        error={sp.error}
      />
    );
  }

  /* ---------------- 2 & 3. The week ---------------- */
  const weekMonday = /^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "")
    ? sp.week!
    : planningWeekMonday();
  const weekSunday = addDaysIso(weekMonday, 6);

  const { data: rows } = await supabase
    .from("meal_plan_days")
    .select(
      `id, day_date, eating_at_home, plan_meta,
       breakfast:recipes!breakfast_recipe_id(id, name, cuisine, prep_time_min, est_cost_aud),
       lunch:recipes!lunch_recipe_id(id, name, cuisine, prep_time_min, est_cost_aud),
       dinner:recipes!dinner_recipe_id(id, name, cuisine, prep_time_min, est_cost_aud, dish_id, variant_id)`,
    )
    .eq("household_id", household.id)
    .gte("day_date", weekMonday)
    .lte("day_date", weekSunday)
    .order("day_date");
  const days = (rows as unknown as DayRow[] | null) ?? [];
  const planned = days.some((d) => d.dinner || !d.eating_at_home);

  const { data: memberRows } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("household_id", household.id)
    .order("name");
  const members = (memberRows as MemberRow[] | null) ?? [];
  const eating = members.filter((m) => !prefs.away.includes(m.id));
  const chain = CHAINS.find((c) => c.id === prefs.chain)!;

  if (!planned || sp.options === "1") {
    return (
      <WeekStartScreen
        prefs={prefs}
        weekMonday={weekMonday}
        eating={eating}
        chainName={chain.name}
        showOptions={sp.options === "1"}
        firstRun={sp.first === "1"}
        householdId={household.id}
        error={sp.error}
        community={features.community}
        source={sp.source === "ours" || sp.source === "everyone" ? sp.source : "all"}
        sort={(CATALOGUE_SORTS.some((x) => x.id === sp.sort) ? sp.sort : "match") as CatalogueSort}
      />
    );
  }

  return (
    <WeekScreen
      prefs={prefs}
      weekMonday={weekMonday}
      days={days}
      eatingCount={eating.length}
      chainName={chain.name}
      householdId={household.id}
      justPlanned={sp.planned === "1"}
      grownUp={grownUp}
      community={features.community}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Set-up screens                                                      */
/* ------------------------------------------------------------------ */

async function SetupScreen({
  step,
  prefs,
  householdId,
  editing,
  error,
}: {
  step: SetupStep;
  prefs: PlanPrefs;
  householdId: string;
  editing: boolean;
  error?: string;
}) {
  const supabase = await createClient();
  const sub: Record<SetupStep, string> = {
    who: "Set-up · who",
    meals: "Set-up · meals",
    likes: "Set-up · what we like",
    avoid: "Set-up · what we avoid",
    budget: "Set-up · budget",
    shop: "Set-up · shopping",
    house: "Set-up · household items",
    rhythm: "Set-up · rhythm",
    call: "Set-up · dinner call",
  };

  let members: MemberRow[] = [];
  if (step === "who") {
    const { data } = await supabase
      .from("members")
      .select("id, name, role")
      .eq("household_id", householdId)
      .order("name");
    members = (data as MemberRow[] | null) ?? [];
  }
  let standing: StandingRow[] = [];
  if (step === "house") {
    const { data } = await supabase
      .from("standing_items")
      .select("id, item, every_weeks, last_bought_on")
      .eq("household_id", householdId)
      .order("item");
    standing = (data as StandingRow[] | null) ?? [];
  }

  const nextLabel = editing ? "Save" : step === "call" ? "Pick some meals you like" : "Next";
  const HOUSE_QUICK = [
    "Toilet paper",
    "Dishwasher tablets",
    "Paper towel",
    "Bin bags",
    "Laundry powder",
    "Dish soap",
    "Tissues",
    "Batteries",
    "Sunscreen",
    "Sponges",
    "Foil / cling wrap",
  ];
  const existingNames = new Set(standing.map((s) => s.item.toLowerCase()));

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-24">
      <Header subtitle={sub[step]} />
      <Progress step={step} />
      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <form action={saveSetupStep} className="space-y-5">
        <input type="hidden" name="step" value={step} />

        {step === "who" ? (
          <>
            <Say emoji="🏠" sub="Untick anyone who's usually away. Per-night changes come each week.">
              Who&apos;s eating at home most nights?
            </Say>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Chip
                  key={m.id}
                  name="eating"
                  value={m.id}
                  label={m.name}
                  checked={!prefs.away.includes(m.id)}
                />
              ))}
            </div>
          </>
        ) : null}

        {step === "meals" ? (
          <>
            <Say emoji="🍽️" sub="Most families only want dinners sorted. Add the rest if it helps.">
              What do you want planned each week?
            </Say>
            <div className="grid grid-cols-2 gap-3">
              <Tile name="meals" value="breakfast" emoji="🥣" title="Breakfasts" blurb="Quick, repeatable" checked={prefs.meals.includes("breakfast")} />
              <Tile name="meals" value="lunch" emoji="🥪" title="Lunches" blurb="School + work" checked={prefs.meals.includes("lunch")} />
              <Tile name="meals" value="dinner" emoji="🍝" title="Dinners" blurb="The main event" checked={prefs.meals.includes("dinner")} />
              <Tile name="meals" value="snacks" emoji="🍎" title="Snacks" blurb="Standing items on the list" checked={prefs.snacks} />
            </div>
          </>
        ) : null}

        {step === "likes" ? (
          <>
            <Say emoji="😋" sub="Pick as many as you like. This steers what Matilda suggests; nothing here is a hard rule.">
              How do you like to eat?
            </Say>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((s) => (
                <Chip key={s} name="styles" value={s} label={s} checked={prefs.styles.includes(s)} />
              ))}
            </div>
          </>
        ) : null}

        {step === "avoid" ? (
          <>
            <Say emoji="🚫" sub="Pick one if it applies. Meals that break it never show up.">
              Does the house follow a diet?
            </Say>
            <div className="flex flex-wrap gap-2">
              <Chip name="diet" value="" label="No" type="radio" checked={prefs.diet == null} />
              {DIET_RULES.map((d) => (
                <Chip key={d} name="diet" value={d} label={d === "Pescatarian" ? "Pescatarian (fish ok)" : d} type="radio" checked={prefs.diet === d} />
              ))}
            </div>
            <Say emoji="⚠️" sub="Allergies, intolerances, or just things you won't eat. Tap the ingredient. Stored on this household only; wipe any time in settings.">
              Anything to keep out of the food?
            </Say>
            <div className="flex flex-wrap gap-2">
              {AVOID_OPTIONS.map((a) => (
                <Chip key={a} name="avoid" value={a} label={a} checked={prefs.avoid.includes(a)} />
              ))}
            </div>
            <input
              name="avoid_note"
              defaultValue={prefs.avoid_note ?? ""}
              placeholder="Anything else, e.g. Alex won't touch mushrooms"
              className={INPUT}
              maxLength={300}
            />
          </>
        ) : null}

        {step === "budget" ? (
          <>
            <Say emoji="💸" sub="A rough number is fine. It's a target line, and you decide what it changes.">
              Roughly what&apos;s the weekly food budget?
            </Say>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <label className={LABEL} htmlFor="budget">Dollars per week</label>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-4xl text-amber-300">$</span>
                <input
                  id="budget"
                  name="budget"
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={2000}
                  step={10}
                  defaultValue={prefs.budget_aud}
                  className={`${INPUT} font-display text-3xl`}
                />
              </div>
            </div>
            <p className={LABEL}>When I change my budget…</p>
            <div className="grid grid-cols-1 gap-2">
              <Tile name="budget_mode" value="meals" type="radio" emoji="🍲" title="Change the meals" blurb="Cheaper or fancier dishes get picked" checked={prefs.budget_mode === "meals"} />
              <Tile name="budget_mode" value="shop" type="radio" emoji="🏷️" title="Change the shop" blurb="Same meals; home brand vs named brands (coming with store pricing)" checked={prefs.budget_mode === "shop"} />
              <Tile name="budget_mode" value="show" type="radio" emoji="📏" title="Just show me" blurb="Plan as normal, show over / under" checked={prefs.budget_mode === "show"} />
            </div>
          </>
        ) : null}

        {step === "shop" ? (
          <>
            <Say emoji="🚗" sub="The store comparison will default to this. Change it any week.">
              How do you usually do the shop?
            </Say>
            <div className="grid grid-cols-3 gap-2">
              <Tile name="shop_style" value="instore" type="radio" emoji="🛒" title="In store" blurb="One big shop" checked={prefs.shop_style === "instore"} />
              <Tile name="shop_style" value="delivered" type="radio" emoji="🚚" title="Delivered" blurb="Fee + minimum" checked={prefs.shop_style === "delivered"} />
              <Tile name="shop_style" value="pickup" type="radio" emoji="🅿️" title="Pick up" blurb="Click & collect" checked={prefs.shop_style === "pickup"} />
            </div>
            <p className={LABEL}>Usual store</p>
            <div className="flex flex-wrap gap-2">
              {CHAINS.map((c) => (
                <Chip key={c.id} name="chain" value={c.id} label={c.name} type="radio" checked={prefs.chain === c.id} />
              ))}
            </div>
            <Say emoji="🏡" sub="Asked once. Used for distances and delivery. Change it in settings.">
              Home address
            </Say>
            <input name="street" defaultValue={prefs.address?.street ?? ""} placeholder="Street" className={INPUT} autoComplete="street-address" />
            <div className="flex gap-2">
              <input name="suburb" defaultValue={prefs.address?.suburb ?? ""} placeholder="Suburb" className={INPUT} autoComplete="address-level2" />
              <input name="postcode" defaultValue={prefs.address?.postcode ?? ""} placeholder="Postcode" inputMode="numeric" maxLength={4} className={`${INPUT} max-w-[110px]`} autoComplete="postal-code" />
            </div>
          </>
        ) : null}

        {step === "house" ? (
          <>
            <Say emoji="🧻" sub="Tap to add. They only go on the list when they're about due.">
              What non-food things do you buy regularly?
            </Say>
            {standing.length ? (
              <div className="space-y-2">
                {standing.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <input type="checkbox" name={`on_${s.id}`} defaultChecked className="h-5 w-5 accent-amber-300" aria-label={`Keep ${s.item}`} />
                    <span className="flex-1 text-sm text-slate-100">{s.item}</span>
                    <label className="flex items-center gap-1 text-xs text-slate-400">
                      every
                      <input
                        name={`every_${s.id}`}
                        type="number"
                        min={1}
                        max={52}
                        defaultValue={s.every_weeks ?? ""}
                        placeholder="–"
                        className="w-12 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-center text-sm text-slate-100"
                      />
                      wks
                    </label>
                  </div>
                ))}
                <p className="text-[11px] text-slate-500">Untick to remove. Leave &quot;every&quot; blank for every shop.</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {HOUSE_QUICK.filter((q) => !existingNames.has(q.toLowerCase())).map((q) => (
                <Chip key={q} name="quick_add" value={q} label={q} />
              ))}
            </div>
            <div className="flex gap-2">
              <input name="new_item" placeholder="Add your own, e.g. cat food" className={INPUT} maxLength={80} />
              <label className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                every
                <input name="new_every" type="number" min={1} max={52} defaultValue={4} className="w-12 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-center text-sm text-slate-100" />
                wks
              </label>
            </div>
          </>
        ) : null}

        {step === "rhythm" ? (
          <>
            <Say emoji="📅" sub="Fixed time is the default; change it any time in settings.">
              When should Matilda start the week&apos;s plan with you?
            </Say>
            <div className="grid grid-cols-1 gap-2">
              <Tile name="rhythm" value="fixed" type="radio" emoji="⏰" title="A fixed day and time" blurb="e.g. Saturday 9am" checked={prefs.rhythm === "fixed"} />
              <Tile name="rhythm" value="afteropen" type="radio" emoji="📲" title="When I open the app after the last shop" blurb="No nag; it just notices" checked={prefs.rhythm === "afteropen"} />
              <Tile name="rhythm" value="runout" type="radio" emoji="🥫" title="A day or two before food runs out" blurb="Matilda estimates from the last plan" checked={prefs.rhythm === "runout"} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className={LABEL}>Day and time (for the fixed option)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((d) => (
                  <Chip key={d} name="rhythm_day" value={d} label={d} type="radio" checked={prefs.rhythm_day === d} />
                ))}
              </div>
              <input name="rhythm_time" type="time" defaultValue={prefs.rhythm_time} className={`${INPUT} mt-3`} aria-label="Time" />
            </div>
          </>
        ) : null}

        {step === "call" ? (
          <>
            <Say emoji="🔔" sub="A push to everyone at that time, plus tonight's dinner on the home screen. Kids stop asking.">
              What time should the house hear &quot;what&apos;s for dinner&quot;?
            </Say>
            <input name="push_time" type="time" defaultValue={prefs.push_time} className={INPUT} aria-label="Push time" />
            <Say emoji="🍔" sub="Optional. That night gets no dinner and nothing on the list.">
              A regular eating-out night?
            </Say>
            <div className="flex flex-wrap gap-2">
              <Chip name="eat_out_dow" value="" label="None" type="radio" checked={prefs.eat_out_dow == null} />
              {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map((d, i) => (
                <Chip key={d} name="eat_out_dow" value={String(i)} label={d} type="radio" checked={prefs.eat_out_dow === i} />
              ))}
            </div>
            {!editing ? <input type="hidden" name="finish" value="1" /> : null}
          </>
        ) : null}

        <button type="submit" className={BTN}>{nextLabel}</button>
        {editing ? (
          <Link href="/plan/settings" className={BTN_GHOST}>Cancel</Link>
        ) : null}
      </form>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Week start: same as last week? / options                            */
/* ------------------------------------------------------------------ */

async function WeekStartScreen({
  prefs,
  weekMonday,
  eating,
  chainName,
  showOptions,
  firstRun,
  householdId,
  error,
  community,
  source,
  sort,
}: {
  prefs: PlanPrefs;
  weekMonday: string;
  eating: MemberRow[];
  chainName: string;
  showOptions: boolean;
  firstRun: boolean;
  householdId: string;
  error?: string;
  community: boolean;
  source: "all" | "ours" | "everyone";
  sort: CatalogueSort;
}) {
  const supabase = await createClient();
  const weekLabel = `${fmtDate(weekMonday)} – ${fmtDate(addDaysIso(weekMonday, 6))}`;

  if (!showOptions) {
    return (
      <main className="mx-auto max-w-md px-6 pt-10 pb-24">
        <Header subtitle={`This week · ${weekLabel}`} />
        <Say emoji="🔁" sub="Tap anything in the box to change it. Otherwise this takes a minute.">
          Same as last week?
        </Say>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">{error}</p>
        ) : null}
        <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <SummaryRow k="Who's home" v={eating.map((m) => m.name).join(", ") || "everyone"} href="/plan?step=who" />
          <SummaryRow k="Meals" v={[...prefs.meals, ...(prefs.snacks ? ["snacks"] : [])].join(", ")} href="/plan?step=meals" />
          <SummaryRow k="We like" v={prefs.styles.slice(0, 4).join(", ") + (prefs.styles.length > 4 ? ` +${prefs.styles.length - 4}` : "") || "no preference"} href="/plan?step=likes" />
          <SummaryRow k="Food rules" v={describeRules(prefs)} href="/plan?step=avoid" />
          <SummaryRow k="Budget" v={`$${prefs.budget_aud} · ${{ meals: "changes the meals", shop: "changes the shop", show: "just shows over/under" }[prefs.budget_mode]}`} href="/plan?step=budget" />
          <SummaryRow k="Shop" v={`${{ instore: "In store", delivered: "Delivered", pickup: "Pick up" }[prefs.shop_style]} · ${chainName}`} href="/plan?step=shop" />
          <SummaryRow k="Eating out" v={prefs.eat_out_dow == null ? "no regular night" : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][prefs.eat_out_dow]} href="/plan?step=call" />
        </div>
        <form action={generateWeek} className="mt-6 space-y-3">
          <input type="hidden" name="week_monday" value={weekMonday} />
          <button type="submit" className={BTN}>Yes, plan it</button>
          <Link href={`/plan?options=1&week=${weekMonday}`} className={BTN_GHOST}>
            Give me some options (2–3 min)
          </Link>
        </form>
        <p className="mt-6 text-center text-[11px] text-slate-500">
          <Link href="/meals" className="hover:text-slate-300">All 4 weeks →</Link>
          {" · "}
          <Link href="/plan/settings" className="hover:text-slate-300">Settings</Link>
        </p>
      </main>
    );
  }

  // Options: a hand of allowed dinners. Tick "sounds good"; everything
  // unticked is simply not preferred (not disliked) — one tap is enough.
  // With the community catalogue on, the hand draws from OURS + EVERYONE
  // (one card per dish) and can be sorted by rating / complexity / cost.
  let cards: CatalogueCard[];
  if (community) {
    await ensureStarterCatalogue();
    await linkHouseholdRecipes(householdId);
    cards = await loadCatalogueCards(householdId);
  } else {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, name, cuisine, meal_types, prep_time_min, contains, style_tags, est_cost_aud, is_kid_favourite")
      .eq("household_id", householdId)
      .eq("is_active", true);
    const list = (recipes as Omit<EngineRecipe, "ingredients">[] | null) ?? [];
    const { data: ings } = list.length
      ? await supabase
          .from("recipe_ingredients")
          .select("recipe_id, name")
          .in("recipe_id", list.map((r) => r.id))
      : { data: [] };
    const byRecipe = new Map<string, string[]>();
    for (const i of (ings as { recipe_id: string; name: string }[] | null) ?? []) {
      if (!byRecipe.has(i.recipe_id)) byRecipe.set(i.recipe_id, []);
      byRecipe.get(i.recipe_id)!.push(i.name.toLowerCase());
    }
    cards = list.map((r) => ({
      source: "ours",
      recipeId: r.id,
      dishId: null,
      dishName: r.name,
      variant: null,
      variantCount: 0,
      engine: { ...r, ingredients: byRecipe.get(r.id) ?? [] },
      rating_avg: null,
      rating_count: 0,
      kid_avg: null,
      complexity: 2,
      costBand: null,
      costEst: r.est_cost_aud,
      verified: false,
    }));
  }

  // Recently served → so "NEW" means new to this household.
  const { data: hist } = await supabase
    .from("meal_plan_days")
    .select("dinner_recipe_id")
    .eq("household_id", householdId)
    .lt("day_date", weekMonday);
  const seen = new Set(
    ((hist as { dinner_recipe_id: string | null }[] | null) ?? [])
      .map((r) => r.dinner_recipe_id)
      .filter((x): x is string => !!x),
  );

  const allowedCards = cards.filter(
    (c) =>
      (c.engine.meal_types ?? ["dinner"]).includes("dinner") &&
      recipeAllowed(c.engine, prefs) &&
      (source === "all" || c.source === source),
  );
  const allowed = allowedCards.map((c) => c.engine);
  const isSeen = (c: CatalogueCard) => (c.recipeId ? seen.has(c.recipeId) : false);
  // Sort. "Matilda's pick": style matches float up, random ties, at least 3 unseen up front.
  let ranked: CatalogueCard[];
  const byMatch = shuffle(allowedCards).sort((a, b) => styleScore(b.engine, prefs.styles) - styleScore(a.engine, prefs.styles));
  const bump = (c: CatalogueCard) => (c.source === "ours" ? 0.15 : 0); // our own recipes win ties
  switch (sort) {
    case "rating":
      ranked = byMatch.slice().sort((a, b) => (b.rating_avg ?? 0) + Math.min(0.3, b.rating_count * 0.05) + bump(b) - ((a.rating_avg ?? 0) + Math.min(0.3, a.rating_count * 0.05) + bump(a)));
      break;
    case "easiest":
      ranked = byMatch.slice().sort((a, b) => a.complexity - b.complexity || (a.engine.prep_time_min ?? 99) - (b.engine.prep_time_min ?? 99));
      break;
    case "fanciest":
      ranked = byMatch.slice().sort((a, b) => b.complexity - a.complexity || (b.engine.prep_time_min ?? 0) - (a.engine.prep_time_min ?? 0));
      break;
    case "cheapest":
      ranked = byMatch.slice().sort((a, b) => (a.costEst ?? 999) - (b.costEst ?? 999));
      break;
    case "priciest":
      ranked = byMatch.slice().sort((a, b) => (b.costEst ?? -1) - (a.costEst ?? -1));
      break;
    default: {
      const unseen = byMatch.filter((c) => !isSeen(c));
      const lead = unseen.slice(0, 3);
      ranked = [...lead, ...byMatch.filter((c) => !lead.includes(c))];
    }
  }
  const hand = ranked.slice(0, community ? 12 : 8);
  const optionsBase = `/plan?options=1&week=${weekMonday}${firstRun ? "&first=1" : ""}`;
  const ctl = (k: "source" | "sort", v: string) =>
    `${optionsBase}&source=${k === "source" ? v : source}&sort=${k === "sort" ? v : sort}`;

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-24">
      <Header subtitle={`This week · ${weekLabel}`} />
      <Say emoji="👍" sub={firstRun ? "Tick anything that sounds good. Matilda builds the week around your picks." : "Tick what sounds good this week. Untouched cards just sit this one out."}>
        {firstRun ? "Which of these sound good?" : "Some options for this week."}
      </Say>
      {allowed.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          No recipes pass the food rules yet.{" "}
          <Link href="/recipes/new" className="underline">Add a few recipes</Link> or{" "}
          <Link href="/plan?step=avoid" className="underline">loosen the rules</Link>.
        </div>
      ) : (
        <form action={generateWeek} className="mt-5 space-y-4">
          <input type="hidden" name="week_monday" value={weekMonday} />
          {community ? (
            <div className="space-y-2">
              <div className="flex gap-1.5 text-[11px]">
                {(["all", "ours", "everyone"] as const).map((v) => (
                  <Link key={v} href={ctl("source", v)} className={`rounded-full border px-3 py-1 ${source === v ? "border-amber-300 bg-amber-300 font-semibold text-slate-950" : "border-white/10 text-slate-300"}`}>
                    {{ all: "Ours + everyone", ours: "Ours", everyone: "Everyone's" }[v]}
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {CATALOGUE_SORTS.map((o) => (
                  <Link key={o.id} href={ctl("sort", o.id)} className={`rounded-full border px-2.5 py-1 ${sort === o.id ? "border-sky-300 bg-sky-300 font-semibold text-slate-950" : "border-white/10 text-slate-400"}`}>
                    {o.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {hand.map((c) => {
              const r = c.engine;
              const st = recipeStyle(c.dishName, r.cuisine);
              const id = `liked-${r.id}`;
              const isNew = !isSeen(c);
              return (
                <div key={r.id} className="relative">
                  <input id={id} type="checkbox" name="liked" value={r.id} className="peer sr-only" />
                  <label
                    htmlFor={id}
                    className="relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-transparent p-3 text-white transition peer-checked:border-emerald-300 peer-checked:shadow-[0_0_0_3px_rgba(52,211,153,.25)]"
                    style={{ background: st.gradient, minHeight: 150 }}
                  >
                    {isNew ? (
                      <span className="absolute right-2 top-2 rounded-md bg-sky-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-950">NEW</span>
                    ) : null}
                    {c.source === "everyone" ? (
                      <span className="absolute left-2 top-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90">Everyone&apos;s</span>
                    ) : null}
                    <span className={`block text-3xl drop-shadow ${c.source === "everyone" ? "mt-4" : ""}`}>{st.emoji}</span>
                    <span className="mt-2 block text-sm font-semibold leading-tight drop-shadow">{c.dishName}</span>
                    <span className="mt-1 block text-[11px] opacity-90">
                      {[r.cuisine, r.prep_time_min ? `${r.prep_time_min} min` : null].filter(Boolean).join(" · ")}
                    </span>
                    {community ? (
                      <span className="mt-1.5 block text-[11px] leading-tight drop-shadow">
                        <span className={c.rating_avg != null ? "text-amber-200" : "text-white/50"}>
                          {c.rating_avg != null ? `★ ${Number(c.rating_avg).toFixed(1)}` : "☆ –"}
                        </span>
                        {c.kid_avg != null ? <span className="ml-1 text-sky-200">kids {Number(c.kid_avg).toFixed(1)}</span> : null}
                        <span className="ml-1.5">{"🔪".repeat(Math.max(1, Math.min(5, Math.round(c.complexity))))}</span>
                        <span className="ml-1.5 text-emerald-200">{costGlyph(c.costBand)}</span>
                        {c.variantCount > 1 ? <span className="ml-1.5 text-white/80">{c.variantCount} ways</span> : null}
                      </span>
                    ) : r.est_cost_aud != null ? (
                      <span className="mt-1 block text-[11px] opacity-90">≈${Math.round(r.est_cost_aud)}</span>
                    ) : null}
                  </label>
                  {community && c.dishId ? (
                    <Link
                      href={`/dish/${c.dishId}?${c.variant ? `v=${c.variant.id}&` : ""}back=${encodeURIComponent(ctl("sort", sort))}`}
                      className="absolute bottom-2 right-2 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] text-white/90 hover:bg-black/60"
                      aria-label={`See ${c.dishName}`}
                    >
                      see ↗
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
          {community && hand.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing here for that filter. Try “Ours + everyone”.</p>
          ) : null}
          <button type="submit" className={BTN}>Plan the week</button>
          <Link href={`/plan?week=${weekMonday}`} className={BTN_GHOST}>Back</Link>
        </form>
      )}
    </main>
  );
}

function SummaryRow({ k, v, href }: { k: string; v: string; href: string }) {
  return (
    <Link href={href} className="flex items-baseline justify-between gap-3 py-2.5 text-sm hover:text-amber-200">
      <span className="text-slate-400">{k}</span>
      <span className="text-right font-medium text-slate-100">{v}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* The planned week                                                    */
/* ------------------------------------------------------------------ */

async function WeekScreen({
  prefs,
  weekMonday,
  days,
  eatingCount,
  chainName,
  householdId,
  justPlanned,
  grownUp,
  community,
}: {
  prefs: PlanPrefs;
  weekMonday: string;
  days: DayRow[];
  eatingCount: number;
  chainName: string;
  householdId: string;
  justPlanned: boolean;
  grownUp: boolean;
  community: boolean;
}) {
  const supabase = await createClient();
  const byDate = new Map(days.map((d) => [d.day_date, d]));
  const today = todayIsoMelbourne();
  const weekLabel = `${fmtDate(weekMonday)} – ${fmtDate(addDaysIso(weekMonday, 6))}`;

  // Swap menu: allowed dinners, for the <select>.
  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, cuisine, meal_types, prep_time_min, contains, style_tags, est_cost_aud, is_kid_favourite")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("name");
  const list = (recipes as Omit<EngineRecipe, "ingredients">[] | null) ?? [];
  const { data: ings } = list.length
    ? await supabase.from("recipe_ingredients").select("recipe_id, name").in("recipe_id", list.map((r) => r.id))
    : { data: [] };
  const byRecipe = new Map<string, string[]>();
  for (const i of (ings as { recipe_id: string; name: string }[] | null) ?? []) {
    if (!byRecipe.has(i.recipe_id)) byRecipe.set(i.recipe_id, []);
    byRecipe.get(i.recipe_id)!.push(i.name.toLowerCase());
  }
  const swapOptions = list
    .map((r) => ({ ...r, ingredients: byRecipe.get(r.id) ?? [] }))
    .filter((r) => (r.meal_types ?? ["dinner"]).includes("dinner") && recipeAllowed(r, prefs));

  const dinnerRefs = Array.from({ length: 7 }, (_, i) => {
    const row = byDate.get(addDaysIso(weekMonday, i));
    return row && row.eating_at_home ? row.dinner : null;
  });
  const est = estimateWeekCost(
    dinnerRefs.map((r) => (r ? ({ est_cost_aud: r.est_cost_aud } as EngineRecipe) : null)),
    eatingCount,
  );
  const dinnerShare = prefs.budget_aud * DINNER_SHARE;
  const back = `/plan?week=${weekMonday}`;

  // Other ways to make each planned dish (for the one-week switch).
  const dishIds = Array.from(new Set(dinnerRefs.map((r) => r?.dish_id).filter((x): x is string => !!x)));
  const { data: vRows } = community && dishIds.length
    ? await supabase
        .from("community_variants")
        .select("id, dish_id, label, author_display, rating_avg, rating_count, complexity_shown, cost_band, cost_override_band, prep_time_min")
        .in("dish_id", dishIds)
        .in("status", ["unverified", "verified"])
    : { data: [] };
  const variantsByDish = new Map<string, Pick<CommunityVariant, "id" | "dish_id" | "label" | "author_display" | "rating_avg" | "rating_count" | "complexity_shown" | "cost_band" | "cost_override_band" | "prep_time_min">[]>();
  for (const v of (vRows as Pick<CommunityVariant, "id" | "dish_id" | "label" | "author_display" | "rating_avg" | "rating_count" | "complexity_shown" | "cost_band" | "cost_override_band" | "prep_time_min">[] | null) ?? []) {
    if (!variantsByDish.has(v.dish_id)) variantsByDish.set(v.dish_id, []);
    variantsByDish.get(v.dish_id)!.push(v);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-24">
      <Header subtitle={`This week · ${weekLabel}`} />
      <Say emoji="✅" sub="Tap a night to swap it, or say yes / no to a new one. The grocery list follows.">
        {justPlanned ? "Here's your week." : "This week's food."}
      </Say>

      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-baseline justify-between">
          <span className={LABEL}>Dinners, estimated</span>
          <b className="text-xl tabular-nums text-slate-50">
            {est.pricedDays ? `$${Math.round(est.total)}` : "—"}
          </b>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <span
            className={`block h-full rounded-full ${est.total > dinnerShare ? "bg-orange-400" : "bg-emerald-400"}`}
            style={{ width: `${Math.min(100, (est.total / dinnerShare) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {est.pricedDays
            ? `${est.total <= dinnerShare ? `$${Math.round(dinnerShare - est.total)} under` : `$${Math.round(est.total - dinnerShare)} over`} the dinner share of your $${prefs.budget_aud} · ${est.pricedDays} of 7 nights have a cost estimate · ${chainName}`
            : `No cost estimates on these recipes yet · ${chainName}`}
        </p>
      </section>

      <ol className="mt-5 space-y-3">
        {Array.from({ length: 7 }, (_, i) => {
          const iso = addDaysIso(weekMonday, i);
          const row = byDate.get(iso);
          const out = row ? !row.eating_at_home : false;
          const r = row?.dinner ?? null;
          const surprise = (row?.plan_meta?.surprise as string | undefined) ?? null;
          const st = r ? recipeStyle(r.name, r.cuisine) : null;
          const isToday = iso === today;
          const past = iso < today;
          return (
            <li key={iso} className={`rounded-2xl border ${isToday ? "border-amber-300/60 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.03]"} ${past ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-11 shrink-0">
                  <p className="font-display text-xl leading-none text-amber-300">{fmtDay(iso)}</p>
                  <p className="text-[10px] text-slate-500">{isToday ? "tonight" : i < 5 ? "school" : "weekend"}</p>
                </div>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ background: out ? "rgba(255,255,255,.06)" : st?.gradient ?? "rgba(255,255,255,.06)" }}
                >
                  {out ? "🍔" : st?.emoji ?? "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {out ? "Eating out" : r ? (
                      <Link href={`/recipes/${r.id}`} className="hover:text-amber-200">{row?.plan_meta?.variant_for_week ? r.name.split(" · ")[0] : r.name}</Link>
                    ) : "Nothing planned"}
                    {surprise === "pending" ? <span className="ml-2 rounded-md bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">NEW · yes or no?</span> : null}
                    {surprise === "yes" ? <span className="ml-2 text-[10px] font-bold text-sky-300">NEW ✓</span> : null}
                    {row?.plan_meta?.from_community && !surprise ? <span className="ml-2 rounded-md bg-emerald-300/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">from everyone&apos;s</span> : null}
                    {row?.plan_meta?.variant_for_week ? <span className="ml-2 rounded-md bg-amber-300/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">{String(row.plan_meta.variant_for_week)} · this week</span> : null}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {out ? "Nothing on the list for this night" : r ? `${r.cuisine ?? ""}${r.prep_time_min ? ` · ${r.prep_time_min} min` : ""}${r.est_cost_aud != null ? ` · ≈$${Math.round(r.est_cost_aud * Math.max(1, eatingCount / 4))}` : ""}` : ""}
                    {row?.lunch ? ` · lunch: ${row.lunch.name}` : ""}
                    {row?.breakfast ? ` · brekkie: ${row.breakfast.name}` : ""}
                  </p>
                </div>
              </div>

              {grownUp ? (
                <details className="border-t border-white/10 px-3 py-2">
                  <summary className="cursor-pointer list-none text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300">
                    🔀 Switch this night
                  </summary>
                  <div className="mt-2 space-y-2">
                    {surprise === "pending" && r ? (
                      <div className="grid grid-cols-2 gap-2">
                        <form action={surpriseDecision}>
                          <input type="hidden" name="day_date" value={iso} />
                          <input type="hidden" name="decision" value="yes" />
                          <input type="hidden" name="back" value={back} />
                          <button className="w-full rounded-xl bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950">✓ Yes, let&apos;s try it</button>
                        </form>
                        <form action={surpriseDecision}>
                          <input type="hidden" name="day_date" value={iso} />
                          <input type="hidden" name="decision" value="no" />
                          <input type="hidden" name="back" value={back} />
                          <button className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300">No thanks, something familiar</button>
                        </form>
                      </div>
                    ) : null}
                    <form action={swapDinner} className="flex gap-2">
                      <input type="hidden" name="day_date" value={iso} />
                      <input type="hidden" name="back" value={back} />
                      <select name="recipe_id" defaultValue="random" className={`${INPUT} flex-1`} aria-label="Swap for">
                        <option value="random">🎲 Surprise me (random)</option>
                        {swapOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}{o.prep_time_min ? ` · ${o.prep_time_min}m` : ""}
                          </option>
                        ))}
                      </select>
                      <button className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">Swap</button>
                    </form>
                    {community && r?.dish_id && (variantsByDish.get(r.dish_id)?.length ?? 0) > 1 ? (
                      <form action={useVariantForNight} className="flex gap-2">
                        <input type="hidden" name="day_date" value={iso} />
                        <input type="hidden" name="back" value={back} />
                        <select name="variant_id" defaultValue={r.variant_id ?? ""} className={`${INPUT} flex-1`} aria-label="Make it a different way this week">
                          {variantsByDish.get(r.dish_id)!.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.id === r.variant_id ? "✓ " : ""}{v.label}{v.author_display ? ` · ${v.author_display}` : ""}{v.rating_avg != null ? ` · ★${Number(v.rating_avg).toFixed(1)}` : ""} · {costGlyph(v.cost_override_band ?? v.cost_band)}
                            </option>
                          ))}
                        </select>
                        <button className="shrink-0 rounded-xl border border-amber-300/50 px-3 py-2 text-xs font-bold text-amber-200">This week only</button>
                      </form>
                    ) : null}
                    <form action={toggleEatOut}>
                      <input type="hidden" name="day_date" value={iso} />
                      <input type="hidden" name="back" value={back} />
                      <button className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]">
                        {out ? "🍳 Eat in — put a meal back" : "🍔 Eating out / takeaway this night"}
                      </button>
                    </form>
                  </div>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/grocery" className={BTN}>🛒 Grocery list</Link>
        <Link href={`/plan?options=1&week=${weekMonday}`} className={BTN_GHOST}>Re-plan with options</Link>
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-500">
        <Link href={`/plan?week=${addDaysIso(weekMonday, 7)}`} className="hover:text-slate-300">Next week →</Link>
        {" · "}
        <Link href="/meals" className="hover:text-slate-300">All 4 weeks</Link>
        {" · "}
        <Link href="/plan/settings" className="hover:text-slate-300">Settings</Link>
        {" · "}
        <span>Dinner call {fmtClock(prefs.push_time)}</span>
      </p>
    </main>
  );
}
