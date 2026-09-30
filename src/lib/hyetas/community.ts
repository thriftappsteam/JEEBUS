/**
 * Community recipe catalogue — pure helpers, no DB.
 *
 * Model: a DISH ("Carbonara") has many VARIANTS ("The safe one", "Nonna's
 * way"). Each household picks one variant per dish as "our way"; the plan
 * and grocery list use that copy. Anyone can rate any variant; only grown-up
 * ratings feed the star average and the verification gate, kids' ratings
 * roll up into a separate "Kids ★" badge.
 */

import type { StyleKey } from "./planPrefs";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type VariantIngredient = {
  name: string;
  quantity: string | null;
  qty_value: number | null;
  qty_unit: string | null;
  aisle: string | null;
  is_pantry_staple: boolean;
  is_optional: boolean;
};

export type VariantStatus = "unverified" | "verified" | "hidden" | "removed";

export type CommunityVariant = {
  id: string;
  dish_id: string;
  label: string;
  based_on_variant_id: string | null;
  author_member_id: string | null;
  author_household_id: string | null;
  author_display: string | null;
  is_starter: boolean;
  cuisine: string | null;
  prep_time_min: number | null;
  servings: number;
  ingredients: VariantIngredient[];
  instructions_md: string | null;
  notes: string | null;
  contains: string[];
  style_tags: string[];
  complexity_submitted: number;
  complexity_shown: number;
  cost_est_aud: number | null;
  cost_band: number | null;
  cost_override_band: number | null;
  cost_unmatched: string[];
  status: VariantStatus;
  rating_avg: number | null;
  rating_count: number;
  households_rated: number;
  kid_avg: number | null;
  kid_count: number;
  cost_flags: number;
  report_count: number;
  created_at: string;
};

export type CommunityDish = {
  id: string;
  name: string;
  cuisine: string | null;
  default_variant_id: string | null;
};

export type RatingRow = {
  member_id: string;
  household_id: string;
  is_grownup: boolean;
  stars: number;
  complexity_vote: number | null;
  cost_flag: boolean;
};

/* ------------------------------------------------------------------ */
/* Complexity                                                          */
/* ------------------------------------------------------------------ */

export const COMPLEXITY_LEVELS: { level: number; name: string; blurb: string }[] = [
  { level: 1, name: "Basic", blurb: "Boil, fry, assemble. First-timer friendly." },
  { level: 2, name: "Easy", blurb: "A few steps, nothing to time carefully." },
  { level: 3, name: "Home cook", blurb: "Some timing and technique — sauces, browning." },
  { level: 4, name: "Confident", blurb: "Several things at once, needs attention." },
  { level: 5, name: "Chef", blurb: "Technique-heavy. Michelin energy." },
];

export function complexityName(level: number): string {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  return COMPLEXITY_LEVELS[l - 1].name;
}

/** Knife icons: one per level. */
export function complexityGlyph(level: number): string {
  const l = Math.min(5, Math.max(1, Math.round(level)));
  return "🔪".repeat(l);
}

/**
 * The shown complexity drifts toward the peer median once there are enough
 * votes. Below the threshold the submitter's level stands.
 */
export const COMPLEXITY_VOTES_TO_DRIFT = 3;

export function blendedComplexity(submitted: number, votes: number[]): number {
  if (votes.length < COMPLEXITY_VOTES_TO_DRIFT) return submitted;
  const sorted = votes.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  // Weighted: peers dominate as votes grow, submitter keeps a small say.
  const w = Math.min(0.85, votes.length / (votes.length + 2));
  return Math.round((w * median + (1 - w) * submitted) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Cost                                                                */
/* ------------------------------------------------------------------ */

/** Cost bands, AUD for the recipe as written (feeds ~4). */
export const COST_BANDS: { band: number; glyph: string; label: string; maxAud: number }[] = [
  { band: 1, glyph: "$", label: "Cheap as chips", maxAud: 14 },
  { band: 2, glyph: "$$", label: "Everyday", maxAud: 22 },
  { band: 3, glyph: "$$$", label: "Treat", maxAud: 34 },
  { band: 4, glyph: "$$$$", label: "Splash out", maxAud: Infinity },
];

export function costBandFor(aud: number | null): number | null {
  if (aud == null || !Number.isFinite(aud)) return null;
  return COST_BANDS.find((b) => aud <= b.maxAud)!.band;
}

export function costGlyph(band: number | null): string {
  if (band == null) return "$?";
  return COST_BANDS[Math.min(4, Math.max(1, band)) - 1].glyph;
}

/** The band we SHOW: submitter override beats the estimate. */
export function shownCostBand(v: Pick<CommunityVariant, "cost_band" | "cost_override_band">): number | null {
  return v.cost_override_band ?? v.cost_band;
}

/**
 * Parse "500 g", "1/2 cup", "2 cloves", "1 bag", "3" into value + unit.
 * Units are normalised to the vocabulary the grocery consolidator knows.
 */
export function parseQuantity(q: string | null | undefined): { value: number | null; unit: string | null } {
  if (!q) return { value: null, unit: null };
  const s = q.trim().toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?|\d+\s*\/\s*\d+|\d+\s+\d+\/\d+)?\s*([a-z]+.*)?$/);
  if (!m) return { value: null, unit: null };
  let value: number | null = null;
  if (m[1]) {
    const t = m[1].replace(/\s+/g, " ").trim();
    if (t.includes("/")) {
      const [whole, frac] = t.includes(" ") ? t.split(" ") : [null, t];
      const [n, d] = frac.split("/").map(Number);
      value = (whole ? Number(whole) : 0) + (d ? n / d : 0);
    } else value = Number(t);
  }
  let unit = (m[2] ?? "").trim() || null;
  if (unit) {
    const u = unit.replace(/\.$/, "");
    const map: Record<string, string> = {
      g: "g", gram: "g", grams: "g", kg: "kg", kilo: "kg", kilos: "kg",
      ml: "ml", l: "L", litre: "L", litres: "L", liter: "L",
      cup: "cup", cups: "cup", tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
      tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
      clove: "clove", cloves: "clove", slice: "slice", slices: "slice",
      rasher: "rasher", rashers: "rasher", bunch: "bunch", bunches: "bunch",
      packet: "packet", packets: "packet", pack: "packet", bag: "bag", bags: "bag",
      tin: "tin", tins: "tin", can: "tin", cans: "tin", head: "head", heads: "head",
      whole: "whole", sachet: "sachet", jar: "jar", punnet: "punnet", loaf: "loaf",
    };
    const first = u.split(/\s+/)[0];
    unit = map[first] ?? first;
  }
  return { value, unit };
}

export type PriceEntry = { price: number; per: "kg" | "L" | "each" | "cup" };

/**
 * Estimate the cost of a variant from its ingredient lines and a price
 * lookup (lower-cased ingredient name → price). Pantry staples are skipped
 * (you already own the soy sauce). Unmatched lines are returned so the UI
 * can be honest about what the number doesn't include.
 */
export function estimateCost(
  ingredients: VariantIngredient[],
  lookup: (name: string) => PriceEntry | null,
): { total: number | null; matched: number; unmatched: string[] } {
  let total = 0;
  let matched = 0;
  const unmatched: string[] = [];
  for (const ing of ingredients) {
    if (ing.is_pantry_staple || ing.is_optional) continue;
    const p = lookup(ing.name.toLowerCase());
    if (!p) {
      unmatched.push(ing.name);
      continue;
    }
    const { value, unit } = ing.qty_value != null ? { value: ing.qty_value, unit: ing.qty_unit } : parseQuantity(ing.quantity);
    let line: number;
    if (p.per === "kg" && (unit === "g" || unit === "kg")) line = p.price * (unit === "g" ? (value ?? 500) / 1000 : value ?? 1);
    else if (p.per === "L" && (unit === "ml" || unit === "L")) line = p.price * (unit === "ml" ? (value ?? 500) / 1000 : value ?? 1);
    else if (p.per === "cup" && unit === "cup") line = p.price * (value ?? 1);
    else if (p.per === "kg" || p.per === "L") line = p.price * 0.5; // "1 bag", "2 fillets" → half a kilo-ish
    else line = p.price * (unit == null || ["whole", "each", "bag", "packet", "tin", "jar", "punnet", "head", "bunch", "loaf"].includes(unit) ? Math.max(1, Math.ceil(value ?? 1)) : 1);
    total += line;
    matched++;
  }
  return { total: matched ? Math.round(total * 100) / 100 : null, matched, unmatched };
}

/* ------------------------------------------------------------------ */
/* Auto-checks (the publish gate)                                      */
/* ------------------------------------------------------------------ */

const BANNED = ["fuck", "shit", "cunt", "bitch", "nigg", "faggot", "retard", "whore", "slut", "porn", "xxx", "rape"];

export type RemixInput = {
  dishName: string;
  variantLabel: string;
  isNewDish: boolean;
  ingredients: VariantIngredient[];
  instructions_md: string;
  notes: string | null;
  complexity: number;
};

/** Returns a list of plain-English problems; empty = passes. */
export function autoChecks(input: RemixInput): string[] {
  const problems: string[] = [];
  const text = [input.dishName, input.variantLabel, input.instructions_md, input.notes ?? "", ...input.ingredients.map((i) => i.name)]
    .join(" ")
    .toLowerCase();
  if (input.isNewDish && input.dishName.trim().length < 3) problems.push("Give the dish a name (3+ letters).");
  if (!input.isNewDish && input.variantLabel.trim().length < 2) problems.push("Give your version a short label, like “Nonna's way”.");
  const real = input.ingredients.filter((i) => i.name.trim().length > 0);
  if (real.length < 2) problems.push("A recipe needs at least two ingredients.");
  if (input.instructions_md.trim().split(/\n+/).filter((l) => l.trim()).length < 1) problems.push("Add at least one step.");
  if (!Number.isInteger(input.complexity) || input.complexity < 1 || input.complexity > 5) problems.push("Pick a complexity from 1 to 5.");
  if (BANNED.some((w) => text.includes(w))) problems.push("Keep it family-friendly — some words in there won't fly.");
  if (text.length > 20000) problems.push("That's a novel, not a recipe — trim it down.");
  return problems;
}

/**
 * Allergen / dietary tags derived from ingredient names so the plan's hard
 * filters and the warning banners work without asking the submitter.
 */
export function detectContains(ingredients: VariantIngredient[]): string[] {
  const names = ingredients.map((i) => i.name.toLowerCase());
  const has = (words: string[]) => names.some((n) => words.some((w) => n.includes(w)));
  const out: string[] = [];
  if (has(["peanut"])) out.push("peanut");
  if (has(["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia"])) out.push("tree_nuts");
  if (has(["milk", "cheese", "butter", "cream", "yoghurt", "yogurt", "parmesan", "pecorino", "mozzarella", "feta", "ricotta"])) out.push("dairy");
  if (has(["egg"])) out.push("egg");
  if (has(["pasta", "spaghetti", "flour", "bread", "noodle", "wrap", "tortilla", "couscous", "pastry", "soy sauce"])) out.push("gluten");
  if (has(["prawn", "shrimp", "crab", "lobster", "mussel", "oyster", "squid", "scallop"])) out.push("shellfish");
  if (has(["salmon", "tuna", "fish", "barramundi", "anchov", "sardine"])) out.push("fish");
  if (has(["soy", "tofu", "edamame", "miso"])) out.push("soy");
  if (has(["sesame", "tahini"])) out.push("sesame");
  if (has(["pork", "bacon", "ham", "guanciale", "pancetta", "prosciutto", "salami", "chorizo"])) out.push("pork");
  if (has(["avocado"])) out.push("avocado");
  return out;
}

/* ------------------------------------------------------------------ */
/* Ratings → aggregates + verification                                 */
/* ------------------------------------------------------------------ */

/** Verified once this many distinct grown-up households have rated it… */
export const VERIFY_MIN_HOUSEHOLDS = 3;
/** …with at least this grown-up average. */
export const VERIFY_MIN_AVG = 3.5;
/** Auto-hide when reports reach this many (pending Thrift Apps review). */
export const HIDE_AT_REPORTS = 2;

export function aggregateRatings(
  rows: RatingRow[],
  complexitySubmitted: number,
  current: { status: VariantStatus; report_count: number },
) {
  const grown = rows.filter((r) => r.is_grownup);
  const kids = rows.filter((r) => !r.is_grownup);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const rating_avg = avg(grown.map((r) => r.stars));
  const households_rated = new Set(grown.map((r) => r.household_id)).size;
  const complexity_shown = blendedComplexity(
    complexitySubmitted,
    rows.map((r) => r.complexity_vote).filter((x): x is number => x != null),
  );
  let status: VariantStatus = current.status;
  if (status === "unverified" && households_rated >= VERIFY_MIN_HOUSEHOLDS && (rating_avg ?? 0) >= VERIFY_MIN_AVG) status = "verified";
  if (status === "verified" && (households_rated < VERIFY_MIN_HOUSEHOLDS || (rating_avg ?? 0) < VERIFY_MIN_AVG)) status = "unverified";
  if (current.report_count >= HIDE_AT_REPORTS && status !== "removed") status = "hidden";
  return {
    rating_avg,
    rating_count: grown.length,
    households_rated,
    kid_avg: avg(kids.map((r) => r.stars)),
    kid_count: kids.length,
    cost_flags: rows.filter((r) => r.cost_flag).length,
    complexity_shown,
    status,
  };
}

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

export function starsGlyph(avg: number | null): string {
  if (avg == null) return "☆☆☆☆☆";
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function statusLabel(s: VariantStatus): string {
  return { unverified: "Unverified", verified: "Community verified", hidden: "Hidden · under review", removed: "Removed" }[s];
}

/** Ingredient names for the plan engine (lower-cased). */
export function engineIngredientNames(ings: VariantIngredient[]): string[] {
  return ings.map((i) => i.name.toLowerCase());
}

export type CatalogueSort = "match" | "rating" | "easiest" | "fanciest" | "cheapest" | "priciest";
export const CATALOGUE_SORTS: { id: CatalogueSort; label: string }[] = [
  { id: "match", label: "Matilda's pick" },
  { id: "rating", label: "Top rated" },
  { id: "easiest", label: "Easiest" },
  { id: "fanciest", label: "Fanciest" },
  { id: "cheapest", label: "Cheapest" },
  { id: "priciest", label: "Priciest" },
];

export type StyleKeyList = StyleKey[];
