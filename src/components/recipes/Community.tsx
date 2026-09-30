// Server components for the community layer: badges, the rating form,
// the "other ways to make this" list. No client JS — plain forms.

import Link from "next/link";
import { rateVariant, reportVariant, setOurWay } from "@/app/community/actions";
import {
  COMPLEXITY_LEVELS,
  complexityName,
  costGlyph,
  shownCostBand,
  starsGlyph,
  statusLabel,
  type CommunityVariant,
} from "@/lib/hyetas/community";

const INPUT =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300 focus:outline-none";

export function Stars({ avg, count, size = "text-sm" }: { avg: number | null; count: number; size?: string }) {
  return (
    <span className={`${size} tabular-nums`} title={avg != null ? `${avg} from ${count} grown-up${count === 1 ? "" : "s"}` : "No ratings yet"}>
      <span className={avg != null ? "text-amber-300" : "text-slate-600"}>{starsGlyph(avg)}</span>
      {avg != null ? <span className="ml-1 text-slate-300">{Number(avg).toFixed(1)}</span> : null}
      <span className="ml-1 text-[10px] text-slate-500">{count ? `(${count})` : "no ratings"}</span>
    </span>
  );
}

export function KidsBadge({ avg, count }: { avg: number | null; count: number }) {
  if (avg == null || !count) return null;
  return (
    <span className="rounded-full border border-sky-700/40 bg-sky-900/20 px-2 py-0.5 text-[10px] text-sky-300" title={`${count} kid rating${count === 1 ? "" : "s"}`}>
      Kids ★ {Number(avg).toFixed(1)}
    </span>
  );
}

export function ComplexityBadge({ level }: { level: number }) {
  const l = Math.round(Number(level));
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200" title={COMPLEXITY_LEVELS[l - 1]?.blurb}>
      {"🔪".repeat(Math.max(1, Math.min(5, l)))} {complexityName(l)}
    </span>
  );
}

export function CostBadge({ band, est }: { band: number | null; est: number | null }) {
  return (
    <span className="rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2 py-0.5 text-[10px] text-emerald-300" title={est != null ? `≈$${Math.round(est)} for the recipe as written` : "No estimate yet"}>
      {costGlyph(band)}{est != null ? ` · ≈$${Math.round(Number(est))}` : ""}
    </span>
  );
}

export function StatusBadge({ status }: { status: CommunityVariant["status"] }) {
  const cls =
    status === "verified"
      ? "border-emerald-700/40 bg-emerald-900/20 text-emerald-300"
      : status === "unverified"
        ? "border-amber-700/40 bg-amber-900/20 text-amber-200"
        : "border-rose-700/40 bg-rose-900/20 text-rose-300";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>{status === "verified" ? "✓ " : ""}{statusLabel(status)}</span>;
}

/** The strip under a recipe title: who made it, stars, kids, knives, cost, status. */
export function VariantStrip({ v, isOurWay }: { v: CommunityVariant; isOurWay: boolean }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-slate-400">
        <b className="text-slate-200">{v.label}</b>
        {v.author_display ? ` · by ${v.author_display}` : ""}
        {isOurWay ? <span className="ml-2 rounded-md bg-amber-300/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">OUR WAY</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Stars avg={v.rating_avg} count={v.rating_count} />
        <KidsBadge avg={v.kid_avg} count={v.kid_count} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ComplexityBadge level={Number(v.complexity_shown)} />
        <CostBadge band={shownCostBand(v)} est={v.cost_est_aud} />
        <StatusBadge status={v.status} />
      </div>
      {v.cost_unmatched.length && v.cost_override_band == null ? (
        <p className="text-[10px] text-slate-500">Cost guess leaves out: {v.cost_unmatched.slice(0, 4).join(", ")}{v.cost_unmatched.length > 4 ? "…" : ""}</p>
      ) : null}
    </div>
  );
}

export function RatingForm({
  variantId,
  back,
  mine,
  grownUp,
}: {
  variantId: string;
  back: string;
  mine: { stars: number; complexity_vote: number | null; cost_flag: boolean } | null;
  grownUp: boolean;
}) {
  return (
    <form action={rateVariant} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="back" value={back} />
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{mine ? "Your rating" : "Rate it"}</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="stars" value={n} defaultChecked={mine?.stars === n} className="peer sr-only" required />
            <span className="block rounded-xl border border-white/10 px-3 py-2 text-lg text-slate-500 peer-checked:border-amber-300 peer-checked:bg-amber-300/10 peer-checked:text-amber-300">
              {"★".repeat(n)}
            </span>
          </label>
        ))}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] text-slate-400">How hard was it really? (optional)</summary>
        <select name="complexity_vote" defaultValue={mine?.complexity_vote ?? ""} className={`${INPUT} mt-2`}>
          <option value="">— skip —</option>
          {COMPLEXITY_LEVELS.map((c) => (
            <option key={c.level} value={c.level}>{"🔪".repeat(c.level)} {c.name}</option>
          ))}
        </select>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" name="cost_flag" defaultChecked={mine?.cost_flag} /> The cost guess seems off
        </label>
      </details>
      <button className="mt-3 w-full rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">{mine ? "Update rating" : "Rate"}</button>
      <p className="mt-2 text-[10px] text-slate-500">
        {grownUp ? "Grown-up ratings set the stars everyone sees." : "Kid ratings show up as a separate Kids ★ score."}
      </p>
    </form>
  );
}

export function OtherWays({
  dishId,
  dishName,
  variants,
  currentVariantId,
  ourWayVariantId,
  grownUp,
}: {
  dishId: string;
  dishName: string;
  variants: CommunityVariant[];
  currentVariantId: string | null;
  ourWayVariantId: string | null;
  grownUp: boolean;
}) {
  const others = variants.filter((v) => v.id !== currentVariantId);
  return (
    <section className="px-6 mt-8">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        Other ways to make {dishName} <span className="text-slate-600">· {others.length}</span>
      </h2>
      {others.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Just this one so far. Got a better way? Make it yours.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {others.map((v) => (
            <li key={v.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">
                    {v.label}
                    {v.id === ourWayVariantId ? <span className="ml-2 rounded-md bg-amber-300/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">OUR WAY</span> : null}
                  </p>
                  <p className="text-[11px] text-slate-400">{v.author_display ?? "Someone"}{v.prep_time_min ? ` · ${v.prep_time_min} min` : ""}</p>
                </div>
                <Stars avg={v.rating_avg} count={v.rating_count} size="text-xs" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ComplexityBadge level={Number(v.complexity_shown)} />
                <CostBadge band={shownCostBand(v)} est={v.cost_est_aud} />
                <KidsBadge avg={v.kid_avg} count={v.kid_count} />
                <StatusBadge status={v.status} />
              </div>
              <div className="mt-2 flex gap-2">
                <Link href={`/dish/${dishId}?v=${v.id}`} className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-center text-xs text-slate-200 hover:bg-white/[0.04]">
                  See it
                </Link>
                {grownUp && v.id !== ourWayVariantId ? (
                  <form action={setOurWay} className="flex-1">
                    <input type="hidden" name="variant_id" value={v.id} />
                    <button className="w-full rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950">Make this our way</button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReportLink({ variantId, back }: { variantId: string; back: string }) {
  return (
    <details className="mt-6 px-6">
      <summary className="cursor-pointer text-[11px] text-slate-600 hover:text-slate-400">Report this recipe</summary>
      <form action={reportVariant} className="mt-2 flex gap-2">
        <input type="hidden" name="variant_id" value={variantId} />
        <input type="hidden" name="back" value={back} />
        <input name="reason" placeholder="What's wrong with it?" className={`${INPUT} flex-1`} maxLength={300} />
        <button className="shrink-0 rounded-xl border border-rose-700/40 px-3 py-2 text-xs text-rose-300">Report</button>
      </form>
    </details>
  );
}
