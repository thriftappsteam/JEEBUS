/**
 * Fallback supermarket prices (AUD, ballpark 2026, Coles/Woolies own-brand
 * where it exists). Used to auto-estimate a community variant's cost when
 * the household's own price-checked grocery rows don't cover an ingredient.
 * Good enough to put a dish in a $ / $$ / $$$ / $$$$ band, not to budget to
 * the dollar — the UI says so.
 *
 * `per: "kg"` / `"L"` = price per kilo / litre; `"each"` = per typical pack
 * or item as you'd buy it; `"cup"` = per cup (dry goods you'd measure).
 */

import type { PriceEntry } from "./community";

const P: Record<string, PriceEntry> = {
  // Protein
  "chicken breast": { price: 13, per: "kg" },
  "chicken thigh": { price: 12, per: "kg" },
  "chicken drumstick": { price: 6, per: "kg" },
  "whole chicken": { price: 12, per: "each" },
  chicken: { price: 12, per: "kg" },
  "beef mince": { price: 14, per: "kg" },
  "lamb mince": { price: 17, per: "kg" },
  "pork mince": { price: 12, per: "kg" },
  mince: { price: 14, per: "kg" },
  "beef strips": { price: 24, per: "kg" },
  "chuck steak": { price: 20, per: "kg" },
  steak: { price: 30, per: "kg" },
  "lamb chops": { price: 28, per: "kg" },
  "pork chops": { price: 14, per: "kg" },
  sausages: { price: 10, per: "kg" },
  bacon: { price: 18, per: "kg" },
  pancetta: { price: 40, per: "kg" },
  guanciale: { price: 55, per: "kg" },
  prosciutto: { price: 60, per: "kg" },
  ham: { price: 16, per: "kg" },
  "fish fillets": { price: 28, per: "kg" },
  "crumbed fish fillets": { price: 16, per: "kg" },
  salmon: { price: 38, per: "kg" },
  barramundi: { price: 32, per: "kg" },
  "white fish": { price: 26, per: "kg" },
  tuna: { price: 2, per: "each" },
  prawns: { price: 30, per: "kg" },
  tofu: { price: 4, per: "each" },
  // Dairy & eggs
  eggs: { price: 0.6, per: "each" },
  "egg yolks": { price: 0.6, per: "each" },
  egg: { price: 0.6, per: "each" },
  milk: { price: 2.2, per: "L" },
  cream: { price: 8, per: "L" },
  "sour cream": { price: 3, per: "each" },
  butter: { price: 14, per: "kg" },
  cheese: { price: 14, per: "kg" },
  "grated cheese": { price: 14, per: "kg" },
  "cheddar cheese": { price: 14, per: "kg" },
  parmesan: { price: 40, per: "kg" },
  pecorino: { price: 48, per: "kg" },
  mozzarella: { price: 16, per: "kg" },
  feta: { price: 20, per: "kg" },
  ricotta: { price: 10, per: "kg" },
  haloumi: { price: 30, per: "kg" },
  yoghurt: { price: 6, per: "kg" },
  // Pantry
  pasta: { price: 2.5, per: "kg" },
  spaghetti: { price: 2.5, per: "kg" },
  penne: { price: 2.5, per: "kg" },
  lasagne: { price: 3, per: "each" },
  "lasagne sheets": { price: 3, per: "each" },
  gnocchi: { price: 4, per: "each" },
  noodles: { price: 2.5, per: "each" },
  rice: { price: 3, per: "kg" },
  "jasmine rice": { price: 3, per: "kg" },
  couscous: { price: 6, per: "kg" },
  flour: { price: 2, per: "kg" },
  "tinned tomatoes": { price: 1.3, per: "each" },
  "passata": { price: 2.5, per: "each" },
  "tomato paste": { price: 1.5, per: "each" },
  "coconut milk": { price: 2, per: "each" },
  "coconut cream": { price: 2, per: "each" },
  "red lentils": { price: 5, per: "kg" },
  lentils: { price: 5, per: "kg" },
  chickpeas: { price: 1.3, per: "each" },
  "black beans": { price: 1.5, per: "each" },
  "kidney beans": { price: 1.3, per: "each" },
  "refried beans": { price: 2.5, per: "each" },
  "chicken stock": { price: 2.5, per: "L" },
  "beef stock": { price: 2.5, per: "L" },
  stock: { price: 2.5, per: "L" },
  "curry paste": { price: 4, per: "each" },
  "green curry paste": { price: 4, per: "each" },
  "butter chicken sauce": { price: 4, per: "each" },
  "taco seasoning": { price: 1.5, per: "each" },
  "taco shells": { price: 4, per: "each" },
  tortillas: { price: 4, per: "each" },
  wraps: { price: 4, per: "each" },
  "corn chips": { price: 4, per: "each" },
  "pizza bases": { price: 5, per: "each" },
  "pizza base": { price: 2.5, per: "each" },
  breadcrumbs: { price: 3, per: "each" },
  "panko breadcrumbs": { price: 4, per: "each" },
  "peanut butter": { price: 5, per: "each" },
  honey: { price: 6, per: "each" },
  "soy sauce": { price: 3, per: "each" },
  "oyster sauce": { price: 3.5, per: "each" },
  "teriyaki sauce": { price: 4, per: "each" },
  "bbq sauce": { price: 3, per: "each" },
  "olive oil": { price: 12, per: "L" },
  // Bakery
  bread: { price: 3.5, per: "each" },
  "bread rolls": { price: 0.7, per: "each" },
  "burger buns": { price: 4, per: "each" },
  // Produce
  onion: { price: 2.5, per: "kg" },
  onions: { price: 2.5, per: "kg" },
  "brown onion": { price: 2.5, per: "kg" },
  garlic: { price: 0.8, per: "each" },
  ginger: { price: 3, per: "each" },
  carrot: { price: 2, per: "kg" },
  carrots: { price: 2, per: "kg" },
  celery: { price: 4, per: "each" },
  potato: { price: 3, per: "kg" },
  potatoes: { price: 3, per: "kg" },
  "sweet potato": { price: 4, per: "kg" },
  pumpkin: { price: 3, per: "kg" },
  zucchini: { price: 6, per: "kg" },
  broccoli: { price: 6, per: "kg" },
  capsicum: { price: 2.5, per: "each" },
  "red capsicum": { price: 2.5, per: "each" },
  tomato: { price: 7, per: "kg" },
  tomatoes: { price: 7, per: "kg" },
  "cherry tomatoes": { price: 4, per: "each" },
  lettuce: { price: 3.5, per: "each" },
  "baby spinach": { price: 3.5, per: "each" },
  spinach: { price: 3.5, per: "each" },
  "coleslaw mix": { price: 4, per: "each" },
  "salad mix": { price: 4, per: "each" },
  "mixed salad leaves": { price: 4, per: "each" },
  mushrooms: { price: 12, per: "kg" },
  cucumber: { price: 2, per: "each" },
  avocado: { price: 2.5, per: "each" },
  lemon: { price: 1, per: "each" },
  lemons: { price: 1, per: "each" },
  lime: { price: 1, per: "each" },
  corn: { price: 1.5, per: "each" },
  "corn cobs": { price: 1.5, per: "each" },
  "frozen peas": { price: 4, per: "each" },
  "frozen mixed veg": { price: 4, per: "each" },
  "oven chips": { price: 5, per: "each" },
  "stir-fry veg": { price: 5, per: "each" },
  "stir fry veg": { price: 5, per: "each" },
  basil: { price: 3.5, per: "each" },
  "thai basil": { price: 3.5, per: "each" },
  coriander: { price: 3, per: "each" },
  parsley: { price: 3, per: "each" },
  chilli: { price: 1, per: "each" },
  "spring onion": { price: 3, per: "each" },
  "black pepper": { price: 4, per: "each" },
};

/**
 * Look up a price by ingredient name: exact match first, then the longest
 * key contained in the name ("free-range eggs" → eggs, "smoked bacon" →
 * bacon), then singular/plural nudges.
 */
export function fallbackPrice(nameLower: string): PriceEntry | null {
  const n = nameLower.trim();
  if (P[n]) return P[n];
  let best: { k: string; v: PriceEntry } | null = null;
  for (const k of Object.keys(P)) {
    if (n.includes(k) && (!best || k.length > best.k.length)) best = { k, v: P[k] };
  }
  if (best) return best.v;
  if (n.endsWith("s") && P[n.slice(0, -1)]) return P[n.slice(0, -1)];
  if (P[n + "s"]) return P[n + "s"];
  return null;
}
