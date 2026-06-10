import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import {
  addStandingItem,
  removeStandingItem,
} from "@/app/actions/grocery";

const AISLE_OPTIONS = [
  "Produce",
  "Protein",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Beverages",
  "Household",
  "Other",
];

type StandingRow = {
  id: string;
  item: string;
  quantity: string | null;
  aisle: string | null;
  notes: string | null;
  home_only: boolean;
};

export async function StandingItemsPanel() {
  // Household-scoped: standing items belong to the signed-in family only.
  const me = await getCurrentMember();
  if (!me) return null;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("standing_items")
    .select("id, item, quantity, aisle, notes, home_only")
    .eq("household_id", me.household_id)
    .order("item");

  const items = (rows as StandingRow[] | null) ?? [];

  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
          Standing items
        </p>
        <span className="text-[10px] text-slate-500">{items.length}</span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
            >
              <span className="flex-1 text-sm text-slate-200">
                {it.item}
                {it.quantity ? (
                  <span className="ml-2 text-xs text-slate-500">
                    {it.quantity}
                  </span>
                ) : null}
                {it.aisle ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                    {it.aisle}
                  </span>
                ) : null}
                {it.home_only ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300/80">
                    HOME only
                  </span>
                ) : null}
                {it.notes ? (
                  <span className="block text-[11px] text-slate-500">
                    {it.notes}
                  </span>
                ) : null}
              </span>
              <Link
                href={`/grocery/standing/${it.id}/edit`}
                aria-label={`Edit ${it.item}`}
                title="Edit"
                className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-amber-900/30 hover:text-amber-300"
              >
                ✏
              </Link>
              <form action={removeStandingItem}>
                <input type="hidden" name="id" value={it.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${it.item}`}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:bg-rose-900/30 hover:text-rose-200"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          No standing items yet. Add one below.
        </p>
      )}

      <form action={addStandingItem} className="mt-3 space-y-2 border-t border-white/5 pt-3">
        <input
          name="item"
          required
          placeholder="Item (e.g. laundry detergent)"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            name="quantity"
            placeholder="Qty (optional)"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
          />
          <select
            name="aisle"
            defaultValue="Household"
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm text-slate-100 focus:border-amber-400/50 focus:outline-none"
          >
            {AISLE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <input
          name="notes"
          placeholder="Note (optional)"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            name="home_only"
            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-amber-400"
          />
          HOME weeks only (skip when Hannah&apos;s away)
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-300 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
        >
          + Add standing item
        </button>
      </form>
    </section>
  );
}
