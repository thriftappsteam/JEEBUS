import { Fragment } from "react";
import { saveGroceryPrices } from "@/app/actions/grocery";

export type PriceEntryItem = {
  id: string;
  item: string;
  quantity: string | null;
  coles_price: number | null;
  woolies_price: number | null;
};

type Props = {
  items: PriceEntryItem[];
  weekMonday: string;
  slot: "current" | "next";
};

/**
 * Collapsible weekly price sheet: one row per grocery item with a Coles and a
 * Woolies price field, saved together. Drives the whole-basket comparison on
 * the grocery page.
 */
export function PriceEntryPanel({ items, weekMonday, slot }: Props) {
  if (items.length === 0) return null;
  const ids = items.map((i) => i.id).join(",");

  return (
    <details className="mt-3 overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-900/10">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-900/20">
        💲 Enter prices &amp; compare
      </summary>
      <form action={saveGroceryPrices} className="px-4 pb-4">
        <input type="hidden" name="week" value={weekMonday} />
        <input type="hidden" name="slot" value={slot} />
        <input type="hidden" name="ids" value={ids} />

        <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-x-2 gap-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Item
          </span>
          <span className="text-center text-[10px] uppercase tracking-wider text-slate-400">
            Coles
          </span>
          <span className="text-center text-[10px] uppercase tracking-wider text-slate-400">
            Woolies
          </span>

          {items.map((i) => (
            <Fragment key={i.id}>
              <span className="min-w-0 truncate text-sm text-slate-200">
                {i.item}
                {i.quantity ? (
                  <span className="ml-1 text-xs text-slate-500">
                    {i.quantity}
                  </span>
                ) : null}
              </span>
              <PriceInput name={`coles_${i.id}`} value={i.coles_price} />
              <PriceInput name={`woolies_${i.id}`} value={i.woolies_price} />
            </Fragment>
          ))}
        </div>

        <button
          type="submit"
          className="mt-4 w-full rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
        >
          Save prices
        </button>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Leave a field blank if you&apos;re not pricing that item. Only items
          with both prices count toward the basket comparison.
        </p>
      </form>
    </details>
  );
}

function PriceInput({
  name,
  value,
}: {
  name: string;
  value: number | null;
}) {
  return (
    <span className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
        $
      </span>
      <input
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={value != null ? value.toFixed(2) : ""}
        placeholder="0.00"
        className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-5 pr-2 text-right text-sm text-slate-100 outline-none focus:border-emerald-400/60"
      />
    </span>
  );
}
