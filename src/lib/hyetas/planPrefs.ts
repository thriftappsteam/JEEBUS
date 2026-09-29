/**
 * Weekly food plan preferences — the answers to Matilda's set-up questions.
 *
 * Stored once in `households.plan_prefs` (jsonb), edited in settings, and
 * re-used every week so the weekly flow is "same as last week?" + one tap.
 *
 * Two kinds of answer live here and the engine treats them differently:
 *   - HARD rules (`diet`, `avoid`): a recipe that breaks one never shows up.
 *   - SOFT preferences (`styles`): recipes that match more of them are picked
 *     first, but nothing is excluded.
 *
 * Everything has a sensible default so a household that skips set-up still
 * gets a plan.
 */

/** Set-up wizard order. One screen per step, one server-action call per screen. */
export const SETUP_STEPS = [
  "who",
  "meals",
  "likes",
  "avoid",
  "budget",
  "shop",
  "house",
  "rhythm",
  "call",
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

/** "Does the house follow a diet?" — pick one. */
export const DIET_RULES = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Halal",
  "Kosher",
] as const;
export type DietRule = (typeof DIET_RULES)[number];

/** "Anything to keep out of the food?" — the ingredient itself, multi-select. */
export const AVOID_OPTIONS = [
  "Nuts",
  "Dairy",
  "Gluten",
  "Eggs",
  "Shellfish",
  "Soy",
  "Sesame",
  "Red meat",
  "Pork",
  "Onion & garlic",
  "Mushrooms",
  "Coriander",
  "Chilli",
] as const;
export type AvoidKey = (typeof AVOID_OPTIONS)[number];

/** "How do you like to eat?" — soft, multi-select. Order = display order. */
export const STYLE_OPTIONS = [
  "Extra healthy",
  "Lots of protein",
  "More veg",
  "Low carb / keto",
  "Mediterranean",
  "Low sugar",
  "High fibre",
  "Less processed",
  "Gut-friendly",
  "Anti-inflammatory",
  "Smaller portions (GLP-1)",
  "Diabetic-friendly",
  "Heart-healthy",
  "Low salt",
  "Spicy food",
  "Not spicy",
  "Seafood",
  "Meat lovers",
  "Plant-forward",
  "Asian flavours",
  "Italian favourites",
  "Kid-friendly",
  "Fussy eaters",
  "Toddler-friendly",
  "Pregnancy-safe",
  "Quick weeknights",
  "One-pan",
  "Slow cooker",
  "Air fryer",
  "BBQ",
  "Comfort food",
  "Budget-friendly",
  "Batch cook / leftovers",
] as const;
export type StyleKey = (typeof STYLE_OPTIONS)[number];

export const BUDGET_MODES = ["meals", "shop", "show"] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export const SHOP_STYLES = ["instore", "delivered", "pickup"] as const;
export type ShopStyle = (typeof SHOP_STYLES)[number];

export const CHAINS = [
  { id: "woolies", name: "Woolworths", delivers: true },
  { id: "coles", name: "Coles", delivers: true },
  { id: "aldi", name: "ALDI", delivers: false },
  { id: "iga", name: "IGA", delivers: false },
  { id: "other", name: "Somewhere else", delivers: false },
] as const;
export type ChainId = (typeof CHAINS)[number]["id"];

export const RHYTHMS = ["fixed", "afteropen", "runout"] as const;
export type Rhythm = (typeof RHYTHMS)[number];

export type PlanPrefs = {
  /** Which slots Matilda plans each week. */
  meals: MealSlot[];
  /** Snacks = standing items, not recipes. */
  snacks: boolean;
  /** Member ids usually away (not eating most nights). */
  away: string[];
  styles: StyleKey[];
  diet: DietRule | null;
  avoid: AvoidKey[];
  /** Free text ("Alex won't touch mushrooms"). Shown, not parsed. */
  avoid_note: string | null;
  budget_aud: number;
  budget_mode: BudgetMode;
  shop_style: ShopStyle;
  chain: ChainId;
  address: { street: string; suburb: string; postcode: string } | null;
  rhythm: Rhythm;
  rhythm_day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  rhythm_time: string; // "09:00"
  push_time: string; // "16:00"
  /** Which weekday is usually eating out (0 = Mon … 6 = Sun), or null. */
  eat_out_dow: number | null;
  setup_completed_at: string | null;
};

export const DEFAULT_PLAN_PREFS: PlanPrefs = {
  meals: ["dinner"],
  snacks: false,
  away: [],
  styles: [],
  diet: null,
  avoid: [],
  avoid_note: null,
  budget_aud: 220,
  budget_mode: "meals",
  shop_style: "instore",
  chain: "woolies",
  address: null,
  rhythm: "fixed",
  rhythm_day: "Sat",
  rhythm_time: "09:00",
  push_time: "16:00",
  eat_out_dow: null,
  setup_completed_at: null,
};

function pickFrom<T extends string>(
  list: readonly T[],
  raw: unknown,
): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is T => list.includes(x as T));
}

/** Turn whatever is in the jsonb column into a complete PlanPrefs. */
export function resolvePlanPrefs(raw: unknown): PlanPrefs {
  const d = DEFAULT_PLAN_PREFS;
  if (!raw || typeof raw !== "object") return { ...d };
  const o = raw as Record<string, unknown>;
  const meals = pickFrom(MEAL_SLOTS, o.meals);
  const addr = o.address as Record<string, unknown> | null | undefined;
  return {
    meals: meals.length ? meals : d.meals,
    snacks: typeof o.snacks === "boolean" ? o.snacks : d.snacks,
    away: Array.isArray(o.away) ? o.away.map(String) : d.away,
    styles: pickFrom(STYLE_OPTIONS, o.styles),
    diet: DIET_RULES.includes(o.diet as DietRule) ? (o.diet as DietRule) : null,
    avoid: pickFrom(AVOID_OPTIONS, o.avoid),
    avoid_note: typeof o.avoid_note === "string" && o.avoid_note ? o.avoid_note : null,
    budget_aud:
      typeof o.budget_aud === "number" && o.budget_aud > 0 ? o.budget_aud : d.budget_aud,
    budget_mode: BUDGET_MODES.includes(o.budget_mode as BudgetMode)
      ? (o.budget_mode as BudgetMode)
      : d.budget_mode,
    shop_style: SHOP_STYLES.includes(o.shop_style as ShopStyle)
      ? (o.shop_style as ShopStyle)
      : d.shop_style,
    chain: CHAINS.some((c) => c.id === o.chain) ? (o.chain as ChainId) : d.chain,
    address:
      addr && typeof addr === "object"
        ? {
            street: String(addr.street ?? ""),
            suburb: String(addr.suburb ?? ""),
            postcode: String(addr.postcode ?? ""),
          }
        : null,
    rhythm: RHYTHMS.includes(o.rhythm as Rhythm) ? (o.rhythm as Rhythm) : d.rhythm,
    rhythm_day: (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).includes(
      o.rhythm_day as PlanPrefs["rhythm_day"],
    )
      ? (o.rhythm_day as PlanPrefs["rhythm_day"])
      : d.rhythm_day,
    rhythm_time: /^\d{2}:\d{2}$/.test(String(o.rhythm_time ?? ""))
      ? String(o.rhythm_time)
      : d.rhythm_time,
    push_time: /^\d{2}:\d{2}$/.test(String(o.push_time ?? ""))
      ? String(o.push_time)
      : d.push_time,
    eat_out_dow:
      typeof o.eat_out_dow === "number" && o.eat_out_dow >= 0 && o.eat_out_dow <= 6
        ? o.eat_out_dow
        : null,
    setup_completed_at:
      typeof o.setup_completed_at === "string" ? o.setup_completed_at : null,
  };
}

export function hasCompletedSetup(prefs: PlanPrefs): boolean {
  return prefs.setup_completed_at != null;
}

/** "4:00pm" from "16:00". */
export function fmtClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${ap}`;
}

/** Plain-English read-back of the hard rules, e.g. "Vegetarian · no nuts, no mushrooms". */
export function describeRules(prefs: PlanPrefs): string {
  const parts: string[] = [];
  if (prefs.diet) parts.push(prefs.diet);
  if (prefs.avoid.length)
    parts.push(prefs.avoid.map((a) => `no ${a.toLowerCase()}`).join(", "));
  return parts.join(" · ") || "no food rules";
}
