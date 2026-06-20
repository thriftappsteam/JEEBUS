"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleGotIt(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("grocery_items").update({ got_it: next }).eq("id", id);
  revalidatePath("/grocery");
}

type ConsolidatedRow = {
  aisle: string | null;
  name: string;
  qty_unit: string | null;
  total_qty: number | null;
  has_unquantified: boolean | null;
  display_quantity: string | null;
  for_recipes: string | null;
  is_hannah_home: boolean | null;
  target_servings: number | null;
};

type StandingItemRow = {
  item: string;
  quantity: string | null;
  aisle: string | null;
  notes: string | null;
  home_only: boolean;
};

type GroceryInsert = {
  household_id: string;
  week_of: string;
  item: string;
  quantity: string | null;
  aisle: string | null;
  for_recipes: string | null;
  is_standing: boolean;
  is_manual: boolean;
  got_it: boolean;
  notes: string | null;
};

/**
 * Rebuild the grocery list for a given week from the meal plan.
 * - Wipes existing rows for the week where `is_manual = FALSE`.
 *   Rows the user added or edited (`is_manual = TRUE`) survive.
 * - Inserts consolidated rows from `consolidate_grocery_for_week`, skipping
 *   any whose name (case-insensitive) matches a surviving manual row so we
 *   don't end up with a duplicate "carrots" / "manual carrots".
 * - Adds every entry from `standing_items` (respecting home_only flag),
 *   with the same manual-name skip rule.
 */
export async function rebuildGrocery(formData: FormData) {
  const weekMonday = String(formData.get("week") ?? "");
  const slot = String(formData.get("slot") ?? "current"); // 'current' | 'next'
  if (!weekMonday) return;

  const supabase = await createClient();

  // 1. Household.
  const { data: hh } = await supabase
    .from("households")
    .select("id")
    .limit(1)
    .single();
  if (!hh) return;
  const householdId = hh.id as string;

  // 2. Read existing manual rows so we can skip duplicates on insert.
  const { data: manualRows } = await supabase
    .from("grocery_items")
    .select("item")
    .eq("household_id", householdId)
    .eq("week_of", weekMonday)
    .eq("is_manual", true);

  const manualNames = new Set(
    ((manualRows ?? []) as { item: string }[]).map((r) =>
      r.item.toLowerCase().trim(),
    ),
  );

  // 3. Call the consolidator.
  const { data: rows, error } = await supabase.rpc(
    "consolidate_grocery_for_week",
    {
      p_household_id: householdId,
      p_week_monday: weekMonday,
    },
  );
  if (error) {
    console.error("consolidate_grocery_for_week failed", error);
    return;
  }

  const consolidated = (rows ?? []) as ConsolidatedRow[];
  const isHannahHome = consolidated[0]?.is_hannah_home ?? false;

  // 4. Wipe non-manual rows only.
  await supabase
    .from("grocery_items")
    .delete()
    .eq("household_id", householdId)
    .eq("week_of", weekMonday)
    .eq("is_manual", false);

  // 5. Build the insert payload from consolidator rows, skipping any whose
  //    name collides with a manual row.
  const inserts: GroceryInsert[] = consolidated
    .filter((r) => !manualNames.has(r.name.toLowerCase().trim()))
    .map((r) => ({
      household_id: householdId,
      week_of: weekMonday,
      item: r.name,
      quantity: r.display_quantity,
      aisle: r.aisle,
      for_recipes: r.for_recipes,
      is_standing: false,
      is_manual: false,
      got_it: false,
      notes: null,
    }));

  // 6. Standing items from the user-managed table, same skip rule.
  const { data: standingRows } = await supabase
    .from("standing_items")
    .select("item, quantity, aisle, notes, home_only")
    .eq("household_id", householdId)
    .order("item");

  for (const s of (standingRows ?? []) as StandingItemRow[]) {
    if (s.home_only && !isHannahHome) continue;
    if (manualNames.has(s.item.toLowerCase().trim())) continue;
    inserts.push({
      household_id: householdId,
      week_of: weekMonday,
      item: s.item,
      quantity: s.quantity,
      aisle: s.aisle,
      for_recipes: null,
      is_standing: true,
      is_manual: false,
      got_it: false,
      notes: s.notes,
    });
  }

  if (inserts.length > 0) {
    await supabase.from("grocery_items").insert(inserts);
  }

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&rebuilt=1`);
}

// -- Manual grocery item CRUD --------------------------------------------------

export async function addGroceryItem(formData: FormData) {
  const weekMonday = String(formData.get("week") ?? "");
  const slot = String(formData.get("slot") ?? "current");
  const item = String(formData.get("item") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const aisle = String(formData.get("aisle") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!item || !weekMonday) return;

  const supabase = await createClient();
  const { data: hh } = await supabase
    .from("households")
    .select("id")
    .limit(1)
    .single();
  if (!hh) return;

  await supabase.from("grocery_items").insert({
    household_id: hh.id,
    week_of: weekMonday,
    item,
    quantity,
    aisle,
    for_recipes: null,
    is_standing: false,
    is_manual: true,
    got_it: false,
    notes,
  });

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&added=1`);
}

export async function updateGroceryItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const slot = String(formData.get("slot") ?? "current");
  const item = String(formData.get("item") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const aisle = String(formData.get("aisle") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id || !item) return;

  const supabase = await createClient();
  await supabase
    .from("grocery_items")
    .update({
      item,
      quantity,
      aisle,
      notes,
      is_manual: true,
    })
    .eq("id", id);

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&saved=1`);
}

export async function removeGroceryItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const slot = String(formData.get("slot") ?? "current");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("grocery_items").delete().eq("id", id);

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&removed=1`);
}

// -- Weekly price comparison ---------------------------------------------------

/** Parse a price field: "$2.50" / "2.5" / "" -> number | null (>= 0). */
function parsePrice(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "")
    .trim()
    .replace(/^\$/, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Save Coles/Woolies prices for a week's grocery list.
 * Expects hidden `ids` (comma-separated) plus `coles_<id>` / `woolies_<id>`
 * fields. For each row we store both prices and derive:
 *   - best_price: the cheaper of the two (or the only one entered)
 *   - cheaper_at: 'coles' | 'woolworths' | 'tie' when BOTH are known, else null
 *   - price_checked_at: now
 */
export async function saveGroceryPrices(formData: FormData) {
  const weekMonday = String(formData.get("week") ?? "");
  const slot = String(formData.get("slot") ?? "current");
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const supabase = await createClient();
  const now = new Date().toISOString();

  for (const id of ids) {
    const coles = parsePrice(formData.get(`coles_${id}`));
    const woolies = parsePrice(formData.get(`woolies_${id}`));

    let best_price: number | null = null;
    let cheaper_at: "coles" | "woolworths" | "tie" | null = null;
    if (coles != null && woolies != null) {
      best_price = Math.min(coles, woolies);
      cheaper_at =
        coles < woolies ? "coles" : woolies < coles ? "woolworths" : "tie";
    } else if (coles != null) {
      best_price = coles;
    } else if (woolies != null) {
      best_price = woolies;
    }

    await supabase
      .from("grocery_items")
      .update({
        coles_price: coles,
        woolies_price: woolies,
        best_price,
        cheaper_at,
        price_checked_at: coles != null || woolies != null ? now : null,
      })
      .eq("id", id);
  }

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&priced=1`);
}

/**
 * Log a request to refresh this week's Coles/Woolies prices. The actual scrape
 * runs from a real browser (it can't run on Vercel — the store sites block
 * data-centre IPs), so this just records the ask. The grocery page treats the
 * week as "refresh pending" until newer prices land (price_checked_at).
 */
export async function requestPriceRefresh(formData: FormData) {
  const weekMonday = String(formData.get("week") ?? "");
  const slot = String(formData.get("slot") ?? "current");
  if (!weekMonday) return;

  const { getCurrentMember } = await import("@/lib/hyetas/whoami");
  const me = await getCurrentMember();
  if (!me) return;

  const supabase = await createClient();
  await supabase.from("price_refresh_requests").insert({
    household_id: me.household_id,
    week_of: weekMonday,
    requested_by_member_id: me.id,
  });

  revalidatePath("/grocery");
  redirect(`/grocery?week=${slot}&refresh_requested=1`);
}

// -- Standing items (unchanged) -----------------------------------------------

export async function addStandingItem(formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const aisle = String(formData.get("aisle") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const homeOnly = formData.get("home_only") === "on";
  if (!item) return;

  const supabase = await createClient();
  const { data: hh } = await supabase
    .from("households")
    .select("id")
    .limit(1)
    .single();
  if (!hh) return;

  await supabase.from("standing_items").insert({
    household_id: hh.id,
    item,
    quantity,
    aisle,
    notes,
    home_only: homeOnly,
  });

  revalidatePath("/grocery");
}

export async function updateStandingItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const item = String(formData.get("item") ?? "").trim();
  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const aisle = String(formData.get("aisle") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const homeOnly = formData.get("home_only") === "on";
  if (!id || !item) return;

  const supabase = await createClient();
  await supabase
    .from("standing_items")
    .update({
      item,
      quantity,
      aisle,
      notes,
      home_only: homeOnly,
    })
    .eq("id", id);

  revalidatePath("/grocery");
  redirect(`/grocery?standing_saved=1`);
}

export async function removeStandingItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("standing_items").delete().eq("id", id);

  revalidatePath("/grocery");
  redirect(`/grocery?standing_removed=1`);
}
