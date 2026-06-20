import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import { rebuildGrocery, requestPriceRefresh } from "@/app/actions/grocery";
import {
  planningWeekMonday,
  nextPlanningWeekMonday,
} from "@/lib/utils/rules";
import { Header } from "@/components/brand/Header";
import { ShopModeBanner } from "@/components/grocery/ShopModeBanner";
import { ShopRow, type ShopRowItem } from "@/components/grocery/ShopRow";
import { StandingItemsPanel } from "@/components/grocery/StandingItemsPanel";
import { PriceEntryPanel } from "@/components/grocery/PriceEntryPanel";

export const dynamic = "force-dynamic";

type Item = ShopRowItem & {
  aisle: string | null;
  best_price: number | null;
  price_checked_at: string | null;
};

type ShopMode = "coles" | "woolies" | null;

const AISLE_ORDER = [
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

const AISLE_EMOJI: Record<string, string> = {
  Produce: "🥬",
  Protein: "🍗",
  "Dairy & Eggs": "🥛",
  Bakery: "🍞",
  Pantry: "🥫",
  Frozen: "🧊",
  Beverages: "🥤",
  Household: "🧴",
  Other: "🛒",
};

function shopUrl(item: string, mode: ShopMode): string | null {
  if (!mode) return null;
  const q = encodeURIComponent(item);
  if (mode === "coles") {
    return `https://www.coles.com.au/search?q=${q}`;
  }
  return `https://www.woolworths.com.au/shop/search/products?searchTerm=${q}`;
}

export default async function GroceryPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    rebuilt?: string;
    shop?: string;
    added?: string;
    saved?: string;
    removed?: string;
    priced?: string;
    refresh_requested?: string;
    standing_saved?: string;
    standing_removed?: string;
  }>;
}) {
  const sp = await searchParams;
  const slot: "current" | "next" = sp.week === "next" ? "next" : "current";
  const justRebuilt = sp.rebuilt === "1";
  const justAdded = sp.added === "1";
  const justSaved = sp.saved === "1";
  const justRemoved = sp.removed === "1";
  const justPriced = sp.priced === "1";
  const justRefreshRequested = sp.refresh_requested === "1";
  const justStandingSaved = sp.standing_saved === "1";
  const justStandingRemoved = sp.standing_removed === "1";
  const shopMode: ShopMode =
    sp.shop === "coles" ? "coles" : sp.shop === "woolies" ? "woolies" : null;

  const thisMonday = planningWeekMonday();
  const nextMonday = nextPlanningWeekMonday();
  const monday = slot === "next" ? nextMonday : thisMonday;

  const me = await getCurrentMember();
  if (!me) redirect("/");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("grocery_items")
    .select(
      "id, item, quantity, aisle, for_recipes, notes, coles_price, woolies_price, best_price, cheaper_at, price_checked_at, got_it, is_standing, is_manual",
    )
    .eq("household_id", me!.household_id)
    .eq("week_of", monday)
    .order("aisle")
    .order("item");

  const items = (rows as Item[] | null) ?? [];

  // Latest "refresh prices" request for this week (if any).
  const { data: latestRefresh } = await supabase
    .from("price_refresh_requests")
    .select("requested_at")
    .eq("household_id", me!.household_id)
    .eq("week_of", monday)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const byAisle = new Map<string, Item[]>();
  for (const it of items) {
    const a = it.aisle ?? "Other";
    if (!byAisle.has(a)) byAisle.set(a, []);
    byAisle.get(a)!.push(it);
  }
  const orderedAisles = [
    ...AISLE_ORDER.filter((a) => byAisle.has(a)),
    ...[...byAisle.keys()].filter((a) => !AISLE_ORDER.includes(a)),
  ];

  // Flat list in display order — drives the "next unticked" chain for Shop Mode.
  const orderedItems: Item[] = [];
  for (const aisle of orderedAisles) {
    for (const it of byAisle.get(aisle)!) {
      orderedItems.push(it);
    }
  }

  // For each row id, that row's own shop URL — tapping the row opens THIS item.
  const ownShopUrlByRowId = new Map<string, string | null>();
  for (const it of orderedItems) {
    ownShopUrlByRowId.set(it.id, shopUrl(it.item, shopMode));
  }

  const unticked = orderedItems.filter((i) => !i.got_it);
  const firstShopUrl =
    unticked.length > 0 ? shopUrl(unticked[0].item, shopMode) : null;

  // Whole-basket comparison: only count items priced at BOTH stores so the
  // two totals are apples-to-apples.
  const comparableItems = items.filter(
    (i) => i.coles_price != null && i.woolies_price != null,
  );
  const colesTotal = comparableItems.reduce(
    (s, i) => s + (i.coles_price ?? 0),
    0,
  );
  const wooliesTotal = comparableItems.reduce(
    (s, i) => s + (i.woolies_price ?? 0),
    0,
  );
  const comparableCount = comparableItems.length;
  const anyPriced = items.some(
    (i) => i.coles_price != null || i.woolies_price != null,
  );
  const basketDiff = Math.abs(colesTotal - wooliesTotal);
  const basketWinner: "coles" | "woolies" | "tie" | null =
    comparableCount === 0
      ? null
      : colesTotal < wooliesTotal
        ? "coles"
        : wooliesTotal < colesTotal
          ? "woolies"
          : "tie";
  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.got_it).length;

  // Price freshness + whether a refresh has been requested but not yet run.
  const lastCheckedMs = items.reduce((max, i) => {
    const t = i.price_checked_at ? Date.parse(i.price_checked_at) : 0;
    return t > max ? t : max;
  }, 0);
  const lastChecked = lastCheckedMs > 0 ? new Date(lastCheckedMs) : null;
  const requestedMs = latestRefresh?.requested_at
    ? Date.parse(latestRefresh.requested_at)
    : 0;
  const refreshPending = requestedMs > 0 && requestedMs > lastCheckedMs;

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle={`Week of ${fmt(monday)} · ${checkedCount} of ${totalCount} ticked`}
      />

      {justRebuilt ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Rebuilt from meal plan
        </div>
      ) : null}
      {justAdded ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Item added
        </div>
      ) : null}
      {justSaved ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Saved
        </div>
      ) : null}
      {justPriced ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Prices saved
        </div>
      ) : null}
      {justRefreshRequested ? (
        <div className="mt-4 rounded-2xl border border-sky-400/40 bg-sky-900/20 px-4 py-2.5 text-sm text-sky-200">
          🔄 Refresh requested — prices will update next time Claude runs a
          price check.
        </div>
      ) : null}
      {justRemoved ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Removed
        </div>
      ) : null}
      {justStandingSaved ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Standing item saved
        </div>
      ) : null}
      {justStandingRemoved ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-900/20 px-4 py-2.5 text-sm text-emerald-200">
          ✓ Standing item removed
        </div>
      ) : null}

      {/* Week toggle */}
      <div className="mt-5 flex gap-2">
        <WeekPill
          label="This week"
          dateLabel={fmt(thisMonday)}
          href={`/grocery?week=current${shopMode ? `&shop=${shopMode}` : ""}`}
          active={slot === "current"}
        />
        <WeekPill
          label="Next week"
          dateLabel={fmt(nextMonday)}
          href={`/grocery?week=next${shopMode ? `&shop=${shopMode}` : ""}`}
          active={slot === "next"}
        />
      </div>

      {/* Add a one-off item */}
      <Link
        href={`/grocery/new?week=${slot}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-400/40 bg-violet-900/15 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-900/30"
      >
        + Add item to {slot === "next" ? "next" : "this"} week
      </Link>

      {/* Shop Mode banner / starter */}
      <ShopModeBanner
        shopMode={shopMode}
        weekParam={slot}
        firstShopUrl={firstShopUrl}
        remainingCount={unticked.length}
      />

      {/* Standing items management */}
      <StandingItemsPanel />

      {/* Rebuild button */}
      <form action={rebuildGrocery} className="mt-3">
        <input type="hidden" name="week" value={monday} />
        <input type="hidden" name="slot" value={slot} />
        <button
          type="submit"
          className="w-full rounded-2xl border border-amber-400/40 bg-amber-900/20 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-900/30"
        >
          🔄 Rebuild from meal plan
        </button>
        <p className="mt-1.5 text-[11px] text-slate-500">
          Wipes this week&apos;s list and refills it from the planned meals
          {totalCount > 0 ? ` (${totalCount} items will be replaced)` : ""}.
        </p>
      </form>

      {/* Weekly Coles vs Woolies price entry */}
      <PriceEntryPanel items={orderedItems} weekMonday={monday} slot={slot} />

      {/* Auto price refresh (runs via Claude in a real browser, not Vercel) */}
      {totalCount > 0 ? (
        <div className="mt-3 rounded-2xl border border-sky-400/30 bg-sky-900/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-sky-100">
                Coles &amp; Woolies prices
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {lastChecked
                  ? `Updated ${timeAgo(lastChecked)}`
                  : "Not fetched yet"}
                {refreshPending ? " · refresh requested" : ""}
              </p>
            </div>
            <form action={requestPriceRefresh} className="shrink-0">
              <input type="hidden" name="week" value={monday} />
              <input type="hidden" name="slot" value={slot} />
              <button
                type="submit"
                disabled={refreshPending}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  refreshPending
                    ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-slate-500"
                    : "border-sky-400/50 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30"
                }`}
              >
                {refreshPending ? "Requested ✓" : "🔄 Refresh prices"}
              </button>
            </form>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Pulls live prices from Coles &amp; Woolworths. Runs through a real
            browser (the stores block automated servers), so prices update next
            time a price check runs — not instantly.
          </p>
        </div>
      ) : null}

      {anyPriced ? (
        <section
          className="mt-6 overflow-hidden rounded-3xl border border-white/10 p-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,113,133,0.10))",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
            This week&apos;s basket
          </p>
          {comparableCount > 0 ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <Total
                  label="Coles"
                  amount={colesTotal}
                  winner={basketWinner === "coles"}
                />
                <Total
                  label="Woolworths"
                  amount={wooliesTotal}
                  winner={basketWinner === "woolies"}
                />
              </div>
              <p className="mt-3 text-center text-sm font-medium text-emerald-200">
                {basketWinner === "tie"
                  ? "Line ball — same price at both."
                  : `${basketWinner === "coles" ? "Coles" : "Woolworths"} is $${basketDiff.toFixed(2)} cheaper this week.`}
              </p>
              <p className="mt-1 text-center text-[11px] text-slate-400">
                Based on {comparableCount} of {totalCount} item
                {totalCount === 1 ? "" : "s"} priced at both stores.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              Add both a Coles and a Woolies price to the same items to see which
              shop wins.
            </p>
          )}
        </section>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-500">
          No items for this week yet. Tap{" "}
          <span className="text-amber-300">Rebuild from meal plan</span> to fill
          it in.
        </p>
      ) : null}

      <section className="mt-6 space-y-7">
        {orderedAisles.map((aisle) => (
          <div key={aisle}>
            <h2 className="flex items-center gap-2 text-sm font-display font-bold uppercase tracking-[0.16em] text-slate-300">
              <span aria-hidden>{AISLE_EMOJI[aisle] ?? "🛒"}</span>
              {aisle}
            </h2>
            <ul className="mt-2 space-y-1.5">
              {byAisle.get(aisle)!.map((it) => (
                <li key={it.id}>
                  <ShopRow
                    row={it}
                    shopMode={shopMode}
                    ownShopUrl={ownShopUrlByRowId.get(it.id) ?? null}
                    slot={slot}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

function WeekPill({
  label,
  dateLabel,
  href,
  active,
}: {
  label: string;
  dateLabel: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-2xl border px-3 py-2 text-center transition ${
        active
          ? "border-amber-400 bg-amber-500/20 text-amber-100"
          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20"
      }`}
    >
      <span className="block text-[11px] uppercase tracking-[0.14em]">
        {label}
      </span>
      <span className="block text-sm font-medium">{dateLabel}</span>
    </Link>
  );
}

function Total({
  label,
  amount,
  winner,
}: {
  label: string;
  amount: number;
  winner: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 ${
        winner
          ? "border-emerald-400/60 bg-emerald-900/20"
          : "border-white/10 bg-black/20"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-xl font-bold ${
          winner ? "text-emerald-300" : "text-slate-100"
        }`}
      >
        ${amount.toFixed(2)}
      </p>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}
