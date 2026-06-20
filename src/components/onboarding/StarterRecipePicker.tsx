"use client";

// Paged starter-recipe carousel. Six recipes per page, Back/More cycles
// (with wrap-around) through the multi-cuisine catalog; ticks survive
// paging because selection lives in React state and is posted as hidden
// inputs. Used in the creator wizard AND on /recipes/new (where recipes
// the family already owns are filtered out via excludeNames).

import { useState } from "react";
import { STARTER_RECIPES } from "@/lib/hyetas/starterPacks";

const PAGE_SIZE = 6;

export function StarterRecipePicker({
  action,
  excludeNames = [],
  pretickSuggested = true,
  allowEmptySubmit = true,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Recipe names the household already has — hidden from the carousel. */
  excludeNames?: string[];
  /** Pre-tick the catalog's suggested picks (wizard behaviour). */
  pretickSuggested?: boolean;
  /** When false, the submit button disables at zero ticks. */
  allowEmptySubmit?: boolean;
}) {
  const exclude = new Set(excludeNames.map((n) => n.toLowerCase()));
  const catalog = STARTER_RECIPES.filter(
    (r) => !exclude.has(r.name.toLowerCase()),
  );

  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        pretickSuggested
          ? catalog.filter((r) => r.suggested).map((r) => r.key)
          : [],
      ),
  );

  if (catalog.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
        You&apos;ve already added every starter — nice cookbook. 🧑‍🍳
      </p>
    );
  }

  const pageCount = Math.ceil(catalog.length / PAGE_SIZE);
  const safePage = Math.min(page, pageCount - 1);
  const visible = catalog.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const prevPage = () => setPage((safePage - 1 + pageCount) % pageCount);
  const nextPage = () => setPage((safePage + 1) % pageCount);

  const none = selected.size === 0;

  return (
    <form action={action} className="mt-6 space-y-5">
      {/* Selections ride along as hidden inputs — same field name the
          server actions read. */}
      {[...selected].map((key) => (
        <input key={key} type="hidden" name="starter_recipes" value={key} />
      ))}

      <div className="space-y-2">
        {visible.map((r) => (
          <label
            key={r.key}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/10"
          >
            <input
              type="checkbox"
              checked={selected.has(r.key)}
              onChange={() => toggle(r.key)}
              className="h-4 w-4 accent-emerald-300"
            />
            <span className="flex-1 text-sm text-slate-200">
              <span className="mr-1.5">{r.emoji}</span>
              {r.name}
            </span>
            <span className="text-right text-[10px] uppercase tracking-wider text-slate-500">
              {r.cuisine}
              <br />
              {r.prep_time_min} min
            </span>
          </label>
        ))}
      </div>

      {/* Pager */}
      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevPage}
            className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/[0.1]"
          >
            ← Back
          </button>
          <p className="text-center text-[11px] uppercase tracking-wider text-slate-500">
            {safePage + 1} of {pageCount}
            <br />
            <span className="text-emerald-300/90">
              {selected.size} ticked
            </span>
          </p>
          <button
            type="button"
            onClick={nextPage}
            className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/[0.1]"
          >
            More →
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-end pt-1">
        <button
          type="submit"
          disabled={none && !allowEmptySubmit}
          className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {none
            ? allowEmptySubmit
              ? "Continue without recipes →"
              : "Tick recipes to add →"
            : `Add ${selected.size} ticked recipe${selected.size === 1 ? "" : "s"} →`}
        </button>
      </div>
    </form>
  );
}
