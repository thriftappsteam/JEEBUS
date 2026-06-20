/**
 * Starter content offered as pick-lists in the creator wizard.
 * Only what the creator ticks gets inserted — no junk to delete later.
 *
 * Chore names stay plain text (matches ChoreForm); emoji is wizard-UI only.
 * Aisle strings must match AISLE_OPTIONS in GroceryItemForm.
 *
 * Recipes: 36 dinners across cuisines, ordered so every page of six in the
 * wizard's carousel mixes cuisines (page 1 = the six originals). Ticking a
 * spread of pages tells us which cuisines the family is into — `cuisine`
 * is saved onto each recipe row.
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
  cuisine: string;
  prep_time_min: number;
  is_kid_favourite: boolean;
  instructions_md: string;
  ingredients: StarterIngredient[];
  /** Pre-ticked in the wizard. */
  suggested: boolean;
};

export const STARTER_RECIPES: StarterRecipe[] = [
  /* ---------------- Page 1 — the originals ---------------- */
  {
    key: "spagbol",
    emoji: "🍝",
    name: "Spaghetti bolognese",
    cuisine: "Italian",
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
      { name: "grated cheese", quantity: "1 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: true,
  },
  {
    key: "tacos",
    emoji: "🌮",
    name: "Taco night",
    cuisine: "Mexican",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown the mince, stir through the taco seasoning.\n2. Chop lettuce and tomato, grate the cheese.\n3. Everyone builds their own at the table.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "taco kit", quantity: "1 box", aisle: "Pantry" },
      { name: "lettuce", quantity: "1/2", aisle: "Produce" },
      { name: "tomatoes", quantity: "2", aisle: "Produce" },
      { name: "grated cheese", quantity: "1 cup", aisle: "Dairy & Eggs" },
      { name: "sour cream", quantity: "1 tub", aisle: "Dairy & Eggs" },
    ],
    suggested: true,
  },
  {
    key: "stirfry",
    emoji: "🥦",
    name: "Chicken stir-fry",
    cuisine: "Chinese",
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
    cuisine: "Aussie",
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
    cuisine: "Italian",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Spread passata on the bases.\n2. Top with ham, capsicum and cheese — kids decorate their own.\n3. Bake at 220°C for ~12 min.",
    ingredients: [
      { name: "pizza bases", quantity: "2", aisle: "Bakery" },
      { name: "passata", quantity: "1/2 jar", aisle: "Pantry" },
      { name: "ham", quantity: "200 g", aisle: "Protein" },
      { name: "capsicum", quantity: "1", aisle: "Produce" },
      { name: "grated cheese", quantity: "2 cups", aisle: "Dairy & Eggs" },
    ],
    suggested: true,
  },
  {
    key: "friedrice",
    emoji: "🍚",
    name: "Fried rice",
    cuisine: "Chinese",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Cook rice (or use yesterday's — it's better).\n2. Fry chopped bacon, push aside, scramble the eggs in the same pan.\n3. Add rice, peas & corn, splash of soy, toss until hot.",
    ingredients: [
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "eggs", quantity: "3", aisle: "Dairy & Eggs" },
      { name: "bacon", quantity: "200 g", aisle: "Protein" },
      { name: "frozen peas & corn", quantity: "1 bag", aisle: "Frozen" },
      {
        name: "soy sauce",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },

  /* ---------------- Page 2 ---------------- */
  {
    key: "butter-chicken",
    emoji: "🍛",
    name: "Butter chicken",
    cuisine: "Indian",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown diced chicken thigh in a big pan.\n2. Pour in the simmer sauce, lid on, 15 min.\n3. Serve over rice with warm naan and a spoon of yoghurt.",
    ingredients: [
      { name: "chicken thigh", quantity: "600 g", aisle: "Protein" },
      { name: "butter chicken simmer sauce", quantity: "1 jar", aisle: "Pantry" },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "naan bread", quantity: "4", aisle: "Bakery" },
      { name: "greek yoghurt", quantity: "1/2 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "burgers",
    emoji: "🍔",
    name: "Beef burgers",
    cuisine: "American",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Shape mince into patties, season, fry or BBQ.\n2. Oven chips in while they cook; toast the buns.\n3. Build with cheese, lettuce and tomato — sauce bar on the table.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "burger buns", quantity: "4", aisle: "Bakery" },
      { name: "cheese slices", quantity: "1 packet", aisle: "Dairy & Eggs" },
      { name: "lettuce", quantity: "1/2", aisle: "Produce" },
      { name: "tomatoes", quantity: "2", aisle: "Produce" },
      { name: "oven chips", quantity: "1 bag", aisle: "Frozen" },
    ],
    suggested: false,
  },
  {
    key: "green-curry",
    emoji: "🍲",
    name: "Thai green curry",
    cuisine: "Thai",
    prep_time_min: 30,
    is_kid_favourite: false,
    instructions_md:
      "1. Fry curry paste in a splash of the coconut milk until fragrant.\n2. Add chicken, brown, then the rest of the coconut milk.\n3. Beans in for the last 5 min; serve on rice.",
    ingredients: [
      { name: "green curry paste", quantity: "1 jar", aisle: "Pantry" },
      { name: "coconut milk", quantity: "400 ml", aisle: "Pantry" },
      { name: "chicken thigh", quantity: "600 g", aisle: "Protein" },
      { name: "green beans", quantity: "200 g", aisle: "Produce" },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
    ],
    suggested: false,
  },
  {
    key: "roast-chicken",
    emoji: "🍗",
    name: "Roast chicken & veg",
    cuisine: "Aussie",
    prep_time_min: 75,
    is_kid_favourite: true,
    instructions_md:
      "1. Whole chicken into a 200°C oven, oil and salt the skin.\n2. Potatoes, pumpkin and carrots around it for the last 45 min.\n3. Rest 10 min, make gravy with the pan juices.",
    ingredients: [
      { name: "whole chicken", quantity: "1", aisle: "Protein" },
      { name: "potatoes", quantity: "1 kg", aisle: "Produce" },
      { name: "pumpkin", quantity: "1/2", aisle: "Produce" },
      { name: "carrots", quantity: "3", aisle: "Produce" },
      {
        name: "gravy powder",
        quantity: "1 tin",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },
  {
    key: "lasagne",
    emoji: "🫕",
    name: "Beef lasagne",
    cuisine: "Italian",
    prep_time_min: 70,
    is_kid_favourite: true,
    instructions_md:
      "1. Make a quick bolognese with the mince, onion and passata.\n2. Layer sauce, sheets and cheese sauce; repeat.\n3. Cheese on top, bake 40 min at 180°C.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "lasagne sheets", quantity: "1 packet", aisle: "Pantry" },
      { name: "passata", quantity: "700 ml", aisle: "Pantry" },
      { name: "cheese sauce", quantity: "1 jar", aisle: "Pantry" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      { name: "grated cheese", quantity: "1 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "teriyaki",
    emoji: "🍱",
    name: "Teriyaki chicken bowls",
    cuisine: "Japanese",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Fry diced chicken thigh until golden.\n2. Add teriyaki sauce, bubble until sticky.\n3. Serve on rice with cucumber and a sprinkle of sesame.",
    ingredients: [
      { name: "chicken thigh", quantity: "600 g", aisle: "Protein" },
      { name: "teriyaki sauce", quantity: "1/2 cup", aisle: "Pantry" },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "cucumber", quantity: "1", aisle: "Produce" },
      {
        name: "sesame seeds",
        quantity: "1 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },

  /* ---------------- Page 3 ---------------- */
  {
    key: "quesadillas",
    emoji: "🧀",
    name: "Cheesy quesadillas",
    cuisine: "Mexican",
    prep_time_min: 20,
    is_kid_favourite: true,
    instructions_md:
      "1. Fill tortillas with chicken and cheese.\n2. Toast in a dry pan until golden both sides.\n3. Cut into wedges, dip in salsa; avocado on the side.",
    ingredients: [
      { name: "tortillas", quantity: "8", aisle: "Bakery" },
      { name: "grated cheese", quantity: "2 cups", aisle: "Dairy & Eggs" },
      { name: "cooked chicken", quantity: "2 cups", aisle: "Protein" },
      { name: "salsa", quantity: "1 jar", aisle: "Pantry" },
      { name: "avocado", quantity: "1", aisle: "Produce" },
    ],
    suggested: false,
  },
  {
    key: "honey-soy",
    emoji: "🍯",
    name: "Honey soy drumsticks",
    cuisine: "Chinese",
    prep_time_min: 45,
    is_kid_favourite: true,
    instructions_md:
      "1. Toss drumsticks in honey, soy and a little garlic.\n2. Bake 40 min at 190°C, turning once.\n3. Serve with rice and cucumber sticks.",
    ingredients: [
      { name: "chicken drumsticks", quantity: "1 kg", aisle: "Protein" },
      {
        name: "honey",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      {
        name: "soy sauce",
        quantity: "1/4 cup",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "cucumber", quantity: "1", aisle: "Produce" },
    ],
    suggested: false,
  },
  {
    key: "souvlaki",
    emoji: "🥙",
    name: "Chicken souvlaki wraps",
    cuisine: "Greek",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Marinate chicken in lemon, oregano and oil; grill.\n2. Warm the pitas.\n3. Wrap with tzatziki, lettuce and tomato.",
    ingredients: [
      { name: "chicken thigh", quantity: "600 g", aisle: "Protein" },
      { name: "pita bread", quantity: "6", aisle: "Bakery" },
      { name: "tzatziki", quantity: "1 tub", aisle: "Dairy & Eggs" },
      { name: "lettuce", quantity: "1/2", aisle: "Produce" },
      { name: "tomatoes", quantity: "2", aisle: "Produce" },
      { name: "lemon", quantity: "1", aisle: "Produce" },
    ],
    suggested: false,
  },
  {
    key: "mac-cheese",
    emoji: "🧈",
    name: "Mac & cheese",
    cuisine: "American",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Cook the macaroni.\n2. Melt butter, stir in flour then milk for a white sauce; add most of the cheese.\n3. Combine, top with cheese and breadcrumbs, grill until golden.",
    ingredients: [
      { name: "macaroni", quantity: "500 g", aisle: "Pantry" },
      { name: "milk", quantity: "600 ml", aisle: "Dairy & Eggs" },
      {
        name: "butter",
        quantity: "50 g",
        aisle: "Dairy & Eggs",
        is_pantry_staple: true,
      },
      {
        name: "plain flour",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "grated cheese", quantity: "2 cups", aisle: "Dairy & Eggs" },
      {
        name: "breadcrumbs",
        quantity: "1/2 cup",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },
  {
    key: "dahl",
    emoji: "🫘",
    name: "Red lentil dahl",
    cuisine: "Indian",
    prep_time_min: 35,
    is_kid_favourite: false,
    instructions_md:
      "1. Soften onion and garlic with curry powder.\n2. Add lentils, tinned tomatoes and coconut milk; simmer 20 min.\n3. Serve with rice — cheap, cosy, freezes well.",
    ingredients: [
      { name: "red lentils", quantity: "1.5 cups", aisle: "Pantry" },
      { name: "tinned tomatoes", quantity: "400 g", aisle: "Pantry" },
      { name: "coconut milk", quantity: "400 ml", aisle: "Pantry" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      {
        name: "curry powder",
        quantity: "1 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
    ],
    suggested: false,
  },
  {
    key: "fish-chips",
    emoji: "🐟",
    name: "Oven fish & chips",
    cuisine: "Aussie",
    prep_time_min: 30,
    is_kid_favourite: true,
    instructions_md:
      "1. Crumbed fish and chips on trays, into a hot oven.\n2. Peas in the microwave at the end.\n3. Lemon wedges and tomato sauce on the table.",
    ingredients: [
      { name: "crumbed fish fillets", quantity: "4", aisle: "Frozen" },
      { name: "oven chips", quantity: "1 bag", aisle: "Frozen" },
      { name: "frozen peas", quantity: "1 bag", aisle: "Frozen" },
      { name: "lemon", quantity: "1", aisle: "Produce" },
    ],
    suggested: false,
  },

  /* ---------------- Page 4 ---------------- */
  {
    key: "creamy-pasta",
    emoji: "🥛",
    name: "Creamy chicken pasta",
    cuisine: "Italian",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Fry sliced chicken with garlic.\n2. Add cream, simmer 5 min, stir in spinach to wilt.\n3. Toss with cooked pasta and parmesan.",
    ingredients: [
      { name: "chicken breast", quantity: "500 g", aisle: "Protein" },
      { name: "pasta", quantity: "500 g", aisle: "Pantry" },
      { name: "cream", quantity: "300 ml", aisle: "Dairy & Eggs" },
      { name: "garlic", quantity: "2 cloves", aisle: "Produce" },
      { name: "baby spinach", quantity: "1 bag", aisle: "Produce" },
      { name: "parmesan", quantity: "1/2 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "burrito-bowls",
    emoji: "🥗",
    name: "Burrito bowls",
    cuisine: "Mexican",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Cook rice; season and fry the chicken.\n2. Warm the corn and beans.\n3. Everyone builds a bowl — sour cream and cheese on top.",
    ingredients: [
      { name: "chicken thigh", quantity: "500 g", aisle: "Protein" },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      {
        name: "taco seasoning",
        quantity: "1 sachet",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "tinned corn", quantity: "1", aisle: "Pantry" },
      { name: "black beans", quantity: "1 tin", aisle: "Pantry" },
      { name: "sour cream", quantity: "1 tub", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "katsu",
    emoji: "🍤",
    name: "Chicken katsu",
    cuisine: "Japanese",
    prep_time_min: 35,
    is_kid_favourite: true,
    instructions_md:
      "1. Flatten chicken, dip in egg then panko.\n2. Shallow-fry until golden; slice.\n3. Serve on rice with slaw and katsu (or BBQ) sauce.",
    ingredients: [
      { name: "chicken breast", quantity: "500 g", aisle: "Protein" },
      { name: "panko breadcrumbs", quantity: "2 cups", aisle: "Pantry" },
      { name: "eggs", quantity: "2", aisle: "Dairy & Eggs" },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
      { name: "coleslaw mix", quantity: "1 bag", aisle: "Produce" },
    ],
    suggested: false,
  },
  {
    key: "shepherds",
    emoji: "🥧",
    name: "Shepherd's pie",
    cuisine: "Aussie",
    prep_time_min: 50,
    is_kid_favourite: false,
    instructions_md:
      "1. Brown mince with onion, stir in peas & corn and gravy.\n2. Top with mash, rough up the surface with a fork.\n3. Cheese over, bake until golden.",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "potatoes", quantity: "1 kg", aisle: "Produce" },
      { name: "frozen peas & corn", quantity: "1 cup", aisle: "Frozen" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      {
        name: "gravy powder",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "grated cheese", quantity: "1/2 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "thai-basil",
    emoji: "🌿",
    name: "Thai basil chicken",
    cuisine: "Thai",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Chicken mince into a screaming-hot wok with garlic.\n2. Soy and oyster sauce, splash of water.\n3. Basil in last, serve on rice (fried egg on top if you're fancy).",
    ingredients: [
      { name: "chicken mince", quantity: "500 g", aisle: "Protein" },
      { name: "basil", quantity: "1 bunch", aisle: "Produce" },
      { name: "garlic", quantity: "3 cloves", aisle: "Produce" },
      {
        name: "oyster sauce",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      {
        name: "soy sauce",
        quantity: "1 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
    ],
    suggested: false,
  },
  {
    key: "chicken-soup",
    emoji: "🍜",
    name: "Chicken noodle soup",
    cuisine: "Comfort",
    prep_time_min: 35,
    is_kid_favourite: true,
    instructions_md:
      "1. Simmer chicken in stock with carrot and celery 15 min.\n2. Shred the chicken back in.\n3. Noodles in for the last 5 — sick-day magic.",
    ingredients: [
      { name: "chicken breast", quantity: "400 g", aisle: "Protein" },
      { name: "egg noodles", quantity: "250 g", aisle: "Pantry" },
      { name: "carrots", quantity: "2", aisle: "Produce" },
      { name: "celery", quantity: "2 sticks", aisle: "Produce" },
      { name: "chicken stock", quantity: "1 L", aisle: "Pantry" },
    ],
    suggested: false,
  },

  /* ---------------- Page 5 ---------------- */
  {
    key: "nachos",
    emoji: "🌶️",
    name: "Family nachos",
    cuisine: "Mexican",
    prep_time_min: 20,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown mince with seasoning, stir in beans.\n2. Corn chips on a tray, mince over, cheese over that.\n3. Grill until melty; sour cream to finish.",
    ingredients: [
      { name: "corn chips", quantity: "1 bag", aisle: "Pantry" },
      { name: "beef mince", quantity: "400 g", aisle: "Protein" },
      {
        name: "taco seasoning",
        quantity: "1 sachet",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "red kidney beans", quantity: "1 tin", aisle: "Pantry" },
      { name: "grated cheese", quantity: "2 cups", aisle: "Dairy & Eggs" },
      { name: "sour cream", quantity: "1 tub", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "beef-broccoli",
    emoji: "🥩",
    name: "Beef & broccoli",
    cuisine: "Chinese",
    prep_time_min: 25,
    is_kid_favourite: false,
    instructions_md:
      "1. Sear beef strips hard and fast; set aside.\n2. Broccoli and garlic in the same pan with a splash of water.\n3. Beef back in with oyster sauce; serve on rice.",
    ingredients: [
      { name: "beef strips", quantity: "500 g", aisle: "Protein" },
      { name: "broccoli", quantity: "1 head", aisle: "Produce" },
      { name: "garlic", quantity: "2 cloves", aisle: "Produce" },
      {
        name: "oyster sauce",
        quantity: "3 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "rice", quantity: "2 cups", aisle: "Pantry" },
    ],
    suggested: false,
  },
  {
    key: "baked-fish",
    emoji: "🍋",
    name: "Lemon baked fish",
    cuisine: "Greek",
    prep_time_min: 35,
    is_kid_favourite: false,
    instructions_md:
      "1. Baby potatoes into the oven first (they take longest).\n2. Fish on a tray with lemon, oil and oregano; bake 15 min.\n3. Steam the beans, squeeze more lemon over everything.",
    ingredients: [
      { name: "white fish fillets", quantity: "4", aisle: "Protein" },
      { name: "lemons", quantity: "2", aisle: "Produce" },
      { name: "baby potatoes", quantity: "750 g", aisle: "Produce" },
      { name: "green beans", quantity: "250 g", aisle: "Produce" },
      {
        name: "olive oil",
        quantity: "2 tbsp",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
    ],
    suggested: false,
  },
  {
    key: "zucchini-slice",
    emoji: "🥒",
    name: "Zucchini slice",
    cuisine: "Aussie",
    prep_time_min: 40,
    is_kid_favourite: false,
    instructions_md:
      "1. Grate zucchini, squeeze out the water.\n2. Mix with eggs, chopped bacon, flour and cheese.\n3. Bake 30 min — dinner tonight, lunchboxes tomorrow.",
    ingredients: [
      { name: "zucchini", quantity: "2", aisle: "Produce" },
      { name: "eggs", quantity: "5", aisle: "Dairy & Eggs" },
      { name: "bacon", quantity: "150 g", aisle: "Protein" },
      {
        name: "self-raising flour",
        quantity: "1 cup",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "grated cheese", quantity: "1 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "carbonara",
    emoji: "🥓",
    name: "Spaghetti carbonara",
    cuisine: "Italian",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Crisp the bacon while the spaghetti cooks.\n2. Whisk eggs with parmesan.\n3. Toss everything off the heat with a splash of pasta water — no cream needed.",
    ingredients: [
      { name: "spaghetti", quantity: "500 g", aisle: "Pantry" },
      { name: "bacon", quantity: "250 g", aisle: "Protein" },
      { name: "eggs", quantity: "3", aisle: "Dairy & Eggs" },
      { name: "parmesan", quantity: "1/2 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "sloppy-joes",
    emoji: "🥪",
    name: "Sloppy joes",
    cuisine: "American",
    prep_time_min: 25,
    is_kid_favourite: true,
    instructions_md:
      "1. Brown the mince with onion.\n2. Tinned tomatoes and BBQ sauce, simmer until thick.\n3. Pile into rolls; slaw on the side (or on top, live dangerously).",
    ingredients: [
      { name: "beef mince", quantity: "500 g", aisle: "Protein" },
      { name: "bread rolls", quantity: "6", aisle: "Bakery" },
      {
        name: "BBQ sauce",
        quantity: "1/3 cup",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "tinned tomatoes", quantity: "400 g", aisle: "Pantry" },
      { name: "coleslaw mix", quantity: "1 bag", aisle: "Produce" },
    ],
    suggested: false,
  },

  /* ---------------- Page 6 ---------------- */
  {
    key: "tuna-bake",
    emoji: "🐠",
    name: "Tuna pasta bake",
    cuisine: "Italian",
    prep_time_min: 35,
    is_kid_favourite: false,
    instructions_md:
      "1. Cook the pasta; mix with tuna, corn and sour cream.\n2. Into a dish, cheese on top.\n3. Bake 20 min until bubbling — pantry dinner champion.",
    ingredients: [
      { name: "pasta", quantity: "500 g", aisle: "Pantry" },
      { name: "tinned tuna", quantity: "425 g", aisle: "Pantry" },
      { name: "tinned corn", quantity: "1", aisle: "Pantry" },
      { name: "sour cream", quantity: "1 cup", aisle: "Dairy & Eggs" },
      { name: "grated cheese", quantity: "1 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "gnocchi",
    emoji: "🥟",
    name: "Gnocchi pomodoro",
    cuisine: "Italian",
    prep_time_min: 20,
    is_kid_favourite: true,
    instructions_md:
      "1. Pan-fry gnocchi in a little oil until golden (better than boiling).\n2. Add passata and a pinch of sugar, simmer 5 min.\n3. Tear mozzarella over, lid on until melted; basil on top.",
    ingredients: [
      { name: "gnocchi", quantity: "500 g", aisle: "Pantry" },
      { name: "passata", quantity: "400 ml", aisle: "Pantry" },
      { name: "mozzarella", quantity: "1 ball", aisle: "Dairy & Eggs" },
      { name: "basil", quantity: "1 bunch", aisle: "Produce" },
    ],
    suggested: false,
  },
  {
    key: "beef-stew",
    emoji: "🍖",
    name: "Slow-cooker beef stew",
    cuisine: "Comfort",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Brown the beef (worth it), then everything into the slow cooker.\n2. Low for 8 hours — set it in the morning.\n3. Crusty bread for the gravy. House smells incredible.",
    ingredients: [
      { name: "chuck steak", quantity: "800 g", aisle: "Protein" },
      { name: "potatoes", quantity: "750 g", aisle: "Produce" },
      { name: "carrots", quantity: "3", aisle: "Produce" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      {
        name: "beef stock cubes",
        quantity: "2",
        aisle: "Pantry",
        is_pantry_staple: true,
      },
      { name: "crusty bread", quantity: "1 loaf", aisle: "Bakery" },
    ],
    suggested: false,
  },
  {
    key: "pumpkin-soup",
    emoji: "🎃",
    name: "Pumpkin soup",
    cuisine: "Comfort",
    prep_time_min: 35,
    is_kid_favourite: false,
    instructions_md:
      "1. Soften onion, add chopped pumpkin and stock.\n2. Simmer 20 min, blend smooth.\n3. Swirl of cream, buttered toast for dunking.",
    ingredients: [
      { name: "pumpkin", quantity: "1.2 kg", aisle: "Produce" },
      { name: "onion", quantity: "1", aisle: "Produce" },
      { name: "chicken stock", quantity: "1 L", aisle: "Pantry" },
      { name: "cream", quantity: "300 ml", aisle: "Dairy & Eggs" },
      { name: "crusty bread", quantity: "1 loaf", aisle: "Bakery" },
    ],
    suggested: false,
  },
  {
    key: "caesar-wraps",
    emoji: "🌯",
    name: "Chicken caesar wraps",
    cuisine: "American",
    prep_time_min: 20,
    is_kid_favourite: false,
    instructions_md:
      "1. Grill the chicken and crisp the bacon.\n2. Slice everything; shred the cos.\n3. Build wraps with caesar dressing and parmesan.",
    ingredients: [
      { name: "chicken breast", quantity: "400 g", aisle: "Protein" },
      { name: "wraps", quantity: "6", aisle: "Bakery" },
      { name: "cos lettuce", quantity: "1", aisle: "Produce" },
      { name: "bacon", quantity: "150 g", aisle: "Protein" },
      { name: "caesar dressing", quantity: "1 bottle", aisle: "Pantry" },
      { name: "parmesan", quantity: "1/2 cup", aisle: "Dairy & Eggs" },
    ],
    suggested: false,
  },
  {
    key: "bbq-chops",
    emoji: "🔥",
    name: "BBQ chops & salad",
    cuisine: "Aussie",
    prep_time_min: 25,
    is_kid_favourite: false,
    instructions_md:
      "1. Chops on the BBQ or grill pan.\n2. Throw the salad together while they cook.\n3. Buttered rolls, sauce of choice, done.",
    ingredients: [
      { name: "lamb chops", quantity: "6", aisle: "Protein" },
      { name: "salad mix", quantity: "1 bag", aisle: "Produce" },
      { name: "tomatoes", quantity: "2", aisle: "Produce" },
      { name: "bread rolls", quantity: "4", aisle: "Bakery" },
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
