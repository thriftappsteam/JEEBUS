/**
 * Soft "how we like to eat" tags + a rough cost (AUD, feeds 4) for each
 * starter recipe, keyed by name. Kept separate from starterPacks.ts so the
 * pick-list stays readable. Costs are ballpark 2026 supermarket figures
 * for the main ingredients — good enough to rank, not to budget to the
 * dollar. Tags must be STYLE_OPTIONS values (planPrefs.ts).
 */

import type { StyleKey } from "./planPrefs";

export const STARTER_STYLE: Record<string, { tags: StyleKey[]; cost: number }> = {
  "Spaghetti bolognese": { tags: ["Kid-friendly", "Comfort food", "Budget-friendly", "Batch cook / leftovers", "Italian favourites", "Fussy eaters", "Toddler-friendly", "Meat lovers"], cost: 20 },
  "Taco night": { tags: ["Kid-friendly", "Quick weeknights", "Lots of protein", "Meat lovers", "Fussy eaters"], cost: 26 },
  "Chicken stir-fry": { tags: ["Lots of protein", "Quick weeknights", "Kid-friendly", "More veg", "Asian flavours", "One-pan", "Not spicy"], cost: 22 },
  "Sausages & mash": { tags: ["Kid-friendly", "Comfort food", "Budget-friendly", "Fussy eaters", "Toddler-friendly", "BBQ"], cost: 18 },
  "Homemade pizza": { tags: ["Kid-friendly", "Comfort food", "Budget-friendly", "Italian favourites", "Toddler-friendly", "Not spicy"], cost: 16 },
  "Fried rice": { tags: ["More veg", "Budget-friendly", "Quick weeknights", "Asian flavours", "One-pan", "Plant-forward", "High fibre"], cost: 15 },
  "Butter chicken": { tags: ["Kid-friendly", "Comfort food", "Lots of protein", "Not spicy", "Fussy eaters", "Slow cooker"], cost: 24 },
  "Beef burgers": { tags: ["Kid-friendly", "Meat lovers", "BBQ", "Comfort food", "Quick weeknights"], cost: 24 },
  "Thai green curry": { tags: ["Spicy food", "Asian flavours", "More veg", "Quick weeknights", "One-pan"], cost: 24 },
  "Roast chicken & veg": { tags: ["Lots of protein", "Less processed", "Batch cook / leftovers", "Comfort food", "One-pan", "Meat lovers", "Low salt", "Toddler-friendly"], cost: 23 },
  "Beef lasagne": { tags: ["Comfort food", "Batch cook / leftovers", "Italian favourites", "Kid-friendly", "Meat lovers"], cost: 28 },
  "Teriyaki chicken bowls": { tags: ["Lots of protein", "Asian flavours", "Quick weeknights", "Kid-friendly", "Not spicy"], cost: 22 },
  "Cheesy quesadillas": { tags: ["Kid-friendly", "Quick weeknights", "Budget-friendly", "Fussy eaters", "Toddler-friendly", "Comfort food"], cost: 14 },
  "Honey soy drumsticks": { tags: ["Kid-friendly", "Budget-friendly", "One-pan", "Not spicy", "Meat lovers", "Air fryer"], cost: 16 },
  "Chicken souvlaki wraps": { tags: ["Mediterranean", "Lots of protein", "Quick weeknights", "BBQ", "Extra healthy"], cost: 24 },
  "Mac & cheese": { tags: ["Kid-friendly", "Comfort food", "Budget-friendly", "Fussy eaters", "Toddler-friendly"], cost: 12 },
  "Red lentil dahl": { tags: ["Plant-forward", "Budget-friendly", "High fibre", "Gut-friendly", "Extra healthy", "Batch cook / leftovers", "Diabetic-friendly", "Heart-healthy", "One-pan"], cost: 10 },
  "Oven fish & chips": { tags: ["Seafood", "Kid-friendly", "Quick weeknights", "Fussy eaters", "Air fryer"], cost: 22 },
  "Creamy chicken pasta": { tags: ["Comfort food", "Kid-friendly", "Quick weeknights", "Italian favourites"], cost: 20 },
  "Burrito bowls": { tags: ["Lots of protein", "High fibre", "More veg", "Extra healthy", "Batch cook / leftovers", "Diabetic-friendly"], cost: 24 },
  "Chicken katsu": { tags: ["Asian flavours", "Kid-friendly", "Comfort food", "Air fryer", "Not spicy"], cost: 22 },
  "Shepherd's pie": { tags: ["Comfort food", "Batch cook / leftovers", "Kid-friendly", "Meat lovers", "Budget-friendly"], cost: 22 },
  "Thai basil chicken": { tags: ["Spicy food", "Asian flavours", "Quick weeknights", "Lots of protein", "One-pan", "Low carb / keto"], cost: 20 },
  "Chicken noodle soup": { tags: ["Comfort food", "Kid-friendly", "Low salt", "Batch cook / leftovers", "Toddler-friendly", "Gut-friendly"], cost: 16 },
  "Family nachos": { tags: ["Kid-friendly", "Quick weeknights", "Comfort food", "Budget-friendly"], cost: 20 },
  "Beef & broccoli": { tags: ["Asian flavours", "Lots of protein", "More veg", "Quick weeknights", "Low carb / keto", "Meat lovers"], cost: 26 },
  "Lemon baked fish": { tags: ["Seafood", "Extra healthy", "Heart-healthy", "Low carb / keto", "Diabetic-friendly", "Mediterranean", "Pregnancy-safe", "Less processed", "One-pan"], cost: 28 },
  "Zucchini slice": { tags: ["More veg", "Budget-friendly", "Batch cook / leftovers", "Kid-friendly", "Plant-forward", "Low carb / keto"], cost: 12 },
  "Spaghetti carbonara": { tags: ["Italian favourites", "Comfort food", "Quick weeknights", "Kid-friendly"], cost: 16 },
  "Sloppy joes": { tags: ["Kid-friendly", "Budget-friendly", "Quick weeknights", "Comfort food", "Meat lovers"], cost: 18 },
  "Tuna pasta bake": { tags: ["Seafood", "Budget-friendly", "Batch cook / leftovers", "Kid-friendly", "Comfort food"], cost: 14 },
  "Gnocchi pomodoro": { tags: ["Italian favourites", "Plant-forward", "Quick weeknights", "Budget-friendly", "Toddler-friendly"], cost: 14 },
  "Slow-cooker beef stew": { tags: ["Slow cooker", "Comfort food", "Batch cook / leftovers", "Less processed", "Lots of protein", "Meat lovers"], cost: 28 },
  "Pumpkin soup": { tags: ["Plant-forward", "Budget-friendly", "More veg", "Gut-friendly", "Anti-inflammatory", "Batch cook / leftovers", "Toddler-friendly", "Low salt"], cost: 10 },
  "Chicken caesar wraps": { tags: ["Lots of protein", "Quick weeknights", "Kid-friendly"], cost: 20 },
  "BBQ chops & salad": { tags: ["BBQ", "Meat lovers", "Lots of protein", "Low carb / keto", "Quick weeknights", "Less processed"], cost: 26 },
};

export function starterStyle(name: string): { tags: StyleKey[]; cost: number | null } {
  const hit = STARTER_STYLE[name];
  return hit ? hit : { tags: [], cost: null };
}
