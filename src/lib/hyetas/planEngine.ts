/**
 * The weekly plan engine — pure functions, no DB.
 *
 * Given the household's recipes and their PlanPrefs, decide what to eat.
 * Rules, in order:
 *   1. HARD filters (diet + avoid) against ingredient names and legacy
 *      `contains` tags — a recipe that fails never appears.
 *   2. Nothing from last week.
 *   3. Budget mode "meals": drop dishes whose estimated cost is out of range.
 *   4. Liked picks (from "give me options") go in first.
 *   5. The rest are shuffled, then ranked by how many of the household's
 *      soft styles they match — ties stay random, so weeks differ.
 *   6. Spread cuisines (max 2 per cuisine before relaxing).
 *   7. One "surprise" — a dish the household hasn't been served before.
 *   8. Quick dishes on school nights, slow ones on the weekend.
 */

import type { PlanPrefs, AvoidKey, StyleKey } from "./planPrefs";

export type EngineRecipe = {
  id: string;
  name: string;
  cuisine: string | null;
  meal_types: string[] | null;
  prep_time_min: number | null;
  contains: string[] | null;
  style_tags: string[] | null;
  est_cost_aud: number | null;
  is_kid_favourite: boolean;
  /** Lower-cased ingredient names. */
  ingredients: string[];
};

/* ------------------------------------------------------------------ */
/* Hard rules                                                          */
/* ------------------------------------------------------------------ */

const KW = {
  redMeat: ["beef", "lamb", "steak", "mince", "chuck", "sausage", "bacon", "ham", "pork", "prosciutto", "salami", "chorizo", "veal"],
  pork: ["pork", "bacon", "ham", "prosciutto", "salami", "chorizo"],
  poultry: ["chicken", "turkey", "duck"],
  fish: ["salmon", "tuna", "fish", "barramundi", "snapper", "basa", "cod", "sardine", "anchov"],
  shellfish: ["prawn", "shrimp", "crab", "lobster", "mussel", "oyster", "squid", "calamari", "scallop", "clam"],
  dairy: ["milk", "cheese", "butter", "cream", "yoghurt", "yogurt", "parmesan", "mozzarella", "feta", "haloumi", "halloumi", "tzatziki", "ricotta", "ghee"],
  eggs: ["egg"],
  gluten: ["bread", "flour", "pasta", "spaghetti", "penne", "noodle", "wrap", "tortilla", "naan", "pizza base", "bun", "crumb", "couscous", "barley", "soy sauce", "crouton", "wheat", "pastry"],
  nuts: ["peanut", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "nut"],
  soy: ["soy", "tofu", "edamame", "teriyaki", "miso", "tempeh", "oyster sauce", "hoisin"],
  sesame: ["sesame", "tahini"],
  onionGarlic: ["onion", "garlic", "leek", "shallot", "chive"],
  mushrooms: ["mushroom"],
  coriander: ["coriander", "cilantro"],
  chilli: ["chilli", "chili", "jalape", "sriracha", "cayenne", "hot sauce", "harissa"],
  honey: ["honey"],
};

function hasAny(ings: string[], words: string[]): boolean {
  return ings.some((i) => words.some((w) => i.includes(w)));
}

const AVOID_KW: Record<AvoidKey, string[]> = {
  Nuts: KW.nuts,
  Dairy: KW.dairy,
  Gluten: KW.gluten,
  Eggs: KW.eggs,
  Shellfish: KW.shellfish,
  Soy: KW.soy,
  Sesame: KW.sesame,
  "Red meat": KW.redMeat,
  Pork: KW.pork,
  "Onion & garlic": KW.onionGarlic,
  Mushrooms: KW.mushrooms,
  Coriander: KW.coriander,
  Chilli: KW.chilli,
};

/** Does this recipe pass every hard rule? */
export function recipeAllowed(r: EngineRecipe, prefs: PlanPrefs): boolean {
  const ings = r.ingredients;
  const contains = r.contains ?? [];
  const tags = r.style_tags ?? [];

  switch (prefs.diet) {
    case "Vegetarian":
      if (hasAny(ings, [...KW.redMeat, ...KW.poultry, ...KW.fish, ...KW.shellfish])) return false;
      break;
    case "Vegan":
      if (hasAny(ings, [...KW.redMeat, ...KW.poultry, ...KW.fish, ...KW.shellfish, ...KW.dairy, ...KW.eggs, ...KW.honey])) return false;
      break;
    case "Pescatarian":
      if (hasAny(ings, [...KW.redMeat, ...KW.poultry])) return false;
      break;
    case "Halal":
      if (hasAny(ings, KW.pork)) return false;
      break;
    case "Kosher":
      if (hasAny(ings, [...KW.pork, ...KW.shellfish])) return false;
      break;
  }

  for (const a of prefs.avoid) {
    if (hasAny(ings, AVOID_KW[a])) return false;
    if (a === "Nuts" && contains.includes("peanut")) return false;
    if (a === "Chilli" && tags.includes("Spicy food")) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Soft ranking                                                        */
/* ------------------------------------------------------------------ */

export function styleScore(r: EngineRecipe, styles: StyleKey[]): number {
  if (!styles.length) return 0;
  const tags = r.style_tags ?? [];
  let s = styles.filter((x) => tags.includes(x)).length;
  // Cheap derived signals so untagged recipes still respond a little.
  if (styles.includes("Quick weeknights") && (r.prep_time_min ?? 99) <= 25) s += 0.5;
  if (styles.includes("Kid-friendly") && r.is_kid_favourite) s += 0.5;
  if (styles.includes("Fussy eaters") && r.is_kid_favourite) s += 0.5;
  return s;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* Week assembly                                                       */
/* ------------------------------------------------------------------ */

export type WeekPick = {
  /** 7 entries, Mon..Sun. null = eating out / nothing. */
  days: (EngineRecipe | null)[];
  /** Index into `days` of the surprise dish, or -1. */
  surpriseDay: number;
};

export type PickOptions = {
  /** Recipe ids served last week (never repeat). */
  lastWeekIds: Set<string>;
  /** Recipe ids served in the last couple of months (surprise prefers others). */
  seenIds: Set<string>;
  /** Recipe ids the household said "sounds good" to this week. */
  likedIds: Set<string>;
  /** Recipe ids the household said "nah" to this week. */
  dislikedIds: Set<string>;
  /** How many people are eating most nights. Scales the budget cap. */
  headcount: number;
};

/** Share of a weekly food budget that dinners take, roughly. */
export const DINNER_SHARE = 0.65;

function perMealCap(prefs: PlanPrefs, headcount: number): number {
  // Budget mode "meals": how much can one dinner cost? The cap is generous
  // on purpose — it's there to keep the $40 salmon nights rare on a tight
  // week, not to make every night lentils.
  const dinners = 7 - (prefs.eat_out_dow == null ? 0 : 1);
  const perDinner = (prefs.budget_aud * DINNER_SHARE) / dinners;
  const scale = Math.max(1, headcount / 4);
  return perDinner * scale * 1.6;
}

export function pickDinners(
  all: EngineRecipe[],
  prefs: PlanPrefs,
  opts: PickOptions,
): WeekPick {
  const empty: WeekPick = { days: Array(7).fill(null), surpriseDay: -1 };
  let pool = all.filter(
    (r) =>
      (r.meal_types ?? ["dinner"]).includes("dinner") &&
      recipeAllowed(r, prefs) &&
      !opts.dislikedIds.has(r.id),
  );
  if (!pool.length) return empty;

  // Rule 2: nothing from last week (relax if that empties the pool).
  const fresh = pool.filter((r) => !opts.lastWeekIds.has(r.id));
  if (fresh.length >= 4) pool = fresh;

  const need = 7 - (prefs.eat_out_dow == null ? 0 : 1);

  // Rule 3: budget cap (only in "meals" mode). Liked picks always survive —
  // the household chose them on purpose. Unknown costs pass. If the cap
  // leaves too few dishes, keep the cheapest instead of dropping the rule.
  if (prefs.budget_mode === "meals") {
    const cap = perMealCap(prefs, opts.headcount);
    const within = pool.filter(
      (r) => opts.likedIds.has(r.id) || r.est_cost_aud == null || r.est_cost_aud <= cap,
    );
    if (within.length >= need + 1) pool = within;
    else {
      const byCost = pool
        .slice()
        .sort((a, b) => (a.est_cost_aud ?? cap) - (b.est_cost_aud ?? cap));
      const keep = new Set([...within, ...byCost.slice(0, need + 1)].map((r) => r.id));
      pool = pool.filter((r) => keep.has(r.id));
    }
  }

  const liked = pool.filter((r) => opts.likedIds.has(r.id));
  const rest = shuffle(pool.filter((r) => !opts.likedIds.has(r.id))).sort(
    (a, b) => styleScore(b, prefs.styles) - styleScore(a, prefs.styles),
  );

  const chosen: EngineRecipe[] = [];
  const cuisineCount = new Map<string, number>();
  const take = (r: EngineRecipe) => {
    chosen.push(r);
    const c = r.cuisine ?? "?";
    cuisineCount.set(c, (cuisineCount.get(c) ?? 0) + 1);
  };
  liked.forEach(take);

  // Leave one seat for the surprise if the pool can afford it.
  const surpriseCands = rest.filter((r) => !opts.seenIds.has(r.id) && !liked.includes(r));
  const wantSurprise = surpriseCands.length > 0 && pool.length > need;
  const target = wantSurprise ? need - 1 : need;

  // Rule 6: cuisine spread, then relax.
  for (const r of rest) {
    if (chosen.length >= target) break;
    if (chosen.includes(r)) continue;
    if ((cuisineCount.get(r.cuisine ?? "?") ?? 0) >= 2) continue;
    take(r);
  }
  for (const r of rest) {
    if (chosen.length >= target) break;
    if (!chosen.includes(r)) take(r);
  }

  let surprise: EngineRecipe | null = null;
  if (wantSurprise) {
    surprise = shuffle(surpriseCands.filter((r) => !chosen.includes(r)))[0] ?? null;
    if (surprise) chosen.push(surprise);
  }

  // Rule 8: quick on school nights, slow on the weekend.
  const isQuick = (r: EngineRecipe) => (r.prep_time_min ?? 30) <= 35;
  const quick = shuffle(chosen.filter(isQuick));
  const slow = shuffle(chosen.filter((r) => !isQuick(r)));
  const days: (EngineRecipe | null)[] = Array(7).fill(null);
  const order = [5, 6, 0, 1, 2, 3, 4]; // fill weekend first so slow dishes land there
  for (const d of order) {
    if (d === prefs.eat_out_dow) continue;
    const weekend = d >= 5;
    const src = weekend ? (slow.length ? slow : quick) : quick.length ? quick : slow;
    const r = src.shift();
    if (r) days[d] = r;
  }
  // Pool too small? Repeat rather than leave holes.
  if (chosen.length) {
    let k = 0;
    for (let d = 0; d < 7; d++) {
      if (d === prefs.eat_out_dow) continue;
      if (!days[d]) days[d] = chosen[k++ % chosen.length];
    }
  }

  return {
    days,
    surpriseDay: surprise ? days.findIndex((r) => r?.id === surprise!.id) : -1,
  };
}

/** Breakfasts and lunches: a small rotation of 3, no hard-rule breakers. */
export function pickSimpleSlot(
  all: EngineRecipe[],
  slot: "breakfast" | "lunch",
  prefs: PlanPrefs,
): (EngineRecipe | null)[] {
  const pool = shuffle(
    all.filter(
      (r) => (r.meal_types ?? []).includes(slot) && recipeAllowed(r, prefs),
    ),
  ).slice(0, 3);
  if (!pool.length) return Array(7).fill(null);
  return Array.from({ length: 7 }, (_, i) => pool[i % pool.length]);
}

/** Estimated cost of a week's dinners (only where recipes carry a cost). */
export function estimateWeekCost(
  days: (EngineRecipe | null)[],
  headcount: number,
): { total: number; pricedDays: number } {
  const scale = Math.max(1, headcount / 4);
  let total = 0;
  let pricedDays = 0;
  for (const r of days) {
    if (r?.est_cost_aud != null) {
      total += r.est_cost_aud * scale;
      pricedDays++;
    }
  }
  return { total, pricedDays };
}
