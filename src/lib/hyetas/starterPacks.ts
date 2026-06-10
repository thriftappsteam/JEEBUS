/**
 * Starter content offered as pick-lists in the creator wizard.
 * Only what the creator ticks gets inserted — no junk to delete later.
 *
 * Chore names stay plain text (matches ChoreForm); emoji is wizard-UI only.
 * Aisle strings must match AISLE_OPTIONS in GroceryItemForm.
 */

export type StarterChore = {
  key: string;
  emoji: string;
  name: string;
  cadence: "Daily" | "Weekly" | "Fortnightly" | "Monthly" | "OnDemand";
  day_hint: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | "Anytime";
  instructions_md: string | null;
  /** Pre-ticked in the wizard. */
  suggested: boolean;
};

export const STARTER_CHORES: StarterChore[] = [
  {
    key: "dishes",
    emoji: "🍽️",
    name: "Do the dishes",
    cadence: "Daily",
    day_hint: "Anytime",
    instructions_md: "Stack the dishwasher (or wash up), wipe the sink out.",
    suggested: true,
  },
  {
    key: "benches",
    emoji: "✨",
    name: "Wipe the kitchen benches",
    cadence: "Daily",
    day_hint: "Anytime",
    instructions_md: null,
    suggested: false,
  },
  {
    key: "table",
    emoji: "🍴",
    name: "Set the table",
    cadence: "Daily",
    day_hint: "Anytime",
    instructions_md: null,
    suggested: false,
  },
  {
    key: "pets",
    emoji: "🐾",
    name: "Feed the pets",
    cadence: "Daily",
    day_hint: "Anytime",
    instructions_md: null,
    suggested: true,
  },
  {
    key: "lunches",
    emoji: "🥪",
    name: "Pack school lunches",
    cadence: "Daily",
    day_hint: "Anytime",
    instructions_md: null,
    suggested: false,
  },
  {
    key: "bins",
    emoji: "🗑️",
    name: "Take the bins out",
    cadence: "Weekly",
    day_hint: "Sun",
    instructions_md:
      "Both bins to the kerb the night before collection. Check which bin week it is.",
    suggested: true,
  },
  {
    key: "washing",
    emoji: "👕",
    name: "Run a load of washing",
    cadence: "Weekly",
    day_hint: "Thu",
    instructions_md: null,
    suggested: true,
  },
  {
    key: "bathroom",
    emoji: "🛁",
    name: "Clean the bathroom",
    cadence: "Weekly",
    day_hint: "Sat",
    instructions_md: "Toilet, sink, mirror, shower glass. Spray and wipe.",
    suggested: true,
  },
  {
    key: "vacuum",
    emoji: "🧹",
    name: "Vacuum the floors",
    cadence: "Weekly",
    day_hint: "Wed",
    instructions_md: null,
    suggested: true,
  },
  {
    key: "room",
    emoji: "🛏️",
    name: "Tidy your room",
    cadence: "Weekly",
    day_hint: "Sun",
    instructions_md: null,
    suggested: false,
  },
  {
    key: "sheets",
    emoji: "🛌",
    name: "Change the bed sheets",
    cadence: "Fortnightly",
    day_hint: "Sun",
    instructions_md: null,
    suggested: false,
  },
  {
    key: "lawn",
    emoji: "🌱",
    name: "Mow the lawn",
    cadence: "Fortnightly",
    day_hint: "Sat",
    instructions_md: null,
    suggested: false,
  },
];

export type StarterIngredient = {
  name: string;
  quantity: string;
  aisle:
    | "Produce"
    | "Protein"
    | "Dairy & Eggs"
    | "Bakery"
    | "Pantry"
    | "Frozen"
    | "Beverages"
    | "Household"
    | "Other";
  is_pantry_staple?: boolean;
};

export type StarterRecipe = {
  key: string;
  emoji: string;
  name: string;
  prep_time_min: number;
  is_kid_favourite: boolean;
  instructions_md: string;
  ingredients: StarterIngredient[];
  /** Pre-ticked in the wizard. */
  suggested: boolean;
};

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    key: "spagbol",
    emoji: "🍝",
    name: "Spaghetti bolognese",
    prep_time_min: 35,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown the mince with diced onion and garlic.\n2. Add grated carrot and passata, simmer 20 min.\n3. Cook spaghetti, serve with cheese on top.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "spaghetti", quantity: "1 packet", aisle: "Pantry" },
      { name: "passata", quantity: "700 ml", aisle: "Pantry" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      { name: "garlic", quantity: "2 cloves", aisle: "Produce" },
      { name: "carrot", quantity: "1", aisle: "Produce" },
      {
        name: "grated cheese",
        quantity: "1 cup",
        aisle: "Dairy & Eggs",
      },
    ],
    suggested: true,
  },
  {
    key: "tacos",
    emoji: "🌮",
    name: "Taco night",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown the mince, stir through the taco seasoning.\n2. Chop lettuce and tomato, grate the cheese.\n3. Everyone builds their own at the table.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "taco kit", quantity: "1 box", aisle: "Pantry" },
      { name: "lettuce", quantity: "1/2", aisle: "Produce" },
      { name: "tomatoes", quantity: "2", aisle: "Produce" },
      {
        name: "grated cheese",
        quantity: "1 cup",
        aisle: "Dairy & Eggs",
      },
      {
        name: "sour cream",
        quantity: "1 tub",
        aisle: "Dairy & Eggs",
      },
    ],
    suggested: true,
  },
  {
    key: "stirfry",
    emoji: "🥦",
    name: "Chicken stir-fry",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Slice chicken, fry in a hot wok until golden.\n2. Add the veg mix, splash of soy and a little water.\n3. Toss through noodles and serve.",
    ingredients: [
      { name: "chicken breast", quantity: "500 g", aisle: "Protein" },
      { name: "stir-fry veg mix", quantity: "1 bag", aisle: "Produce" },
      { name: "noodles", quantity: "1 packet", aisle: "Pantry" },
      {
        name: "soy sauce",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: true,
  },
  {
    key: "sausages",
    emoji: "🌭",
    name: "Sausages & mash",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Pan-fry or BBQ the sausages.\n2. Boil and mash the potatoes with butter and milk.\n3. Microwave the peas, gravy over everything.",
    ingredients: [
      { name: "sausages", quantity: "8", aisle: "Protein" },
      { name: "potatoes", quantity: "1 kg", aisle: "Produce" },
      { name: "frozen peas", quantity: "1 bag", aisle: "Frozen" },
      {
        name: "gravy powder",
        quantity: "1 tin",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      {
        name: "butter",
        quantity: "50 g",
        aisle: "Dairy & Eggs",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },
  {
    key: "pizza",
    emoji: "🍕",
    name: "Homemade pizza",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Spread passata on the bases.\n2. Top with ham, capsicum and cheese — kids decorate their own.\n3. Bake at 220°C for ~12 min.",
    ingredients: [
      { name: "pizza bases", quantity: "2", aisle: "Bakery" },
      { name: "passata", quantity: "1/2 jar", aisle: "Pantry" },
      { name: "ham", quantity: "200 g", aisle: "Protein" },
      { name: "capsicum", quantity: "1", aisle: "Produce" },
      {
        name: "grated cheese",
        quantity: "2 cups",
        aisle: "Dairy & Eggs",
      },
    ],
    suggested: true,
  },
  {
    key: "friedrice",
    emoji: "🍚",
    name: "Fried rice",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Cook rice (or use yesterday's — it's better).\n2. Fry chopped bacon, push aside, scramble the eggs in the same pan.\n3. Add rice, peas & corn, splash of soy, toss until hot.",
    ingredients: [
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "eggs", quantity: "3", aisle: "Dairy & Eggs" },
      { name: "bacon", quantity: "200 g", aisle: "Protein" },
      {
        name: "frozen peas & corn",
        quantity: "1 bag",
        aisle: "Frozen",
      },
      {
        name: "soy sauce",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },
];

/** Closed options for the "what's making it hard?" wizard question. */
export const PAIN_OPTIONS: { key: string; emoji: string; label: string }[] = [
  {
    key: "asking",
    emoji: "🗣️",
    label: "Nothing happens unless I ask — and asking is exhausting",
  },
  {
    key: "mental-load",
    emoji: "🧠",
    label: "I'm the only one who knows what needs doing",
  },
  {
    key: "meals",
    emoji: "🍽️",
    label: "“What's for dinner?” every single night",
  },
  {
    key: "grocery",
    emoji: "🛒",
    label: "Shopping lists live in my head",
  },
  {
    key: "kid-money",
    emoji: "💸",
    label: "Pocket money is chaos — who earned what?",
  },
  {
    key: "shifts",
    emoji: "🌙",
    label: "Shift work scrambles our week",
  },
  {
    key: "curious",
    emoji: "👀",
    label: "Just curious — a friend sent me this",
  },
];
