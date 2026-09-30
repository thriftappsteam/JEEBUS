"use client";

import { useEffect, useMemo, useState } from "react";
import { publishRemix } from "@/app/community/actions";
import { COMPLEXITY_LEVELS, COST_BANDS, type VariantIngredient } from "@/lib/hyetas/community";

const AISLES = ["Produce", "Protein", "Dairy & Eggs", "Bakery", "Pantry", "Frozen", "Beverages", "Household", "Other"];

const INPUT =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300 focus:outline-none";
const LABEL = "text-[11px] uppercase tracking-[0.16em] text-slate-400";
const BTN = "block w-full rounded-2xl bg-amber-300 px-5 py-3.5 text-center text-sm font-bold text-slate-950 transition hover:bg-amber-200";

type Row = { name: string; quantity: string; aisle: string; staple: boolean; optional: boolean; removed: boolean };

export type RemixBase = {
  recipeId: string;
  dishId: string | null;
  dishName: string;
  variantId: string | null;
  variantLabel: string | null;
  cuisine: string | null;
  prep_time_min: number | null;
  servings: number;
  ingredients: VariantIngredient[];
  instructions_md: string;
  notes: string;
  complexity: number;
};

export function RemixEditor({ base, error }: { base: RemixBase; error?: string }) {
  // No dish behind this recipe yet → it can only become a new dish (or be
  // attached to a matching one via the name check).
  const [mode, setMode] = useState<"variant" | "new">(base.dishId ? "variant" : "new");
  const [dishId, setDishId] = useState<string | null>(base.dishId);
  const [dishName, setDishName] = useState(base.dishId ? "" : base.dishName);
  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<Row[]>(
    base.ingredients.map((i) => ({ name: i.name, quantity: i.quantity ?? "", aisle: i.aisle ?? "Other", staple: i.is_pantry_staple, optional: i.is_optional, removed: false })),
  );
  const [check, setCheck] = useState<{ exact: { id: string; name: string } | null; similar: { id: string; name: string }[] } | null>(null);

  useEffect(() => {
    if (mode !== "new" || dishName.trim().length < 2) {
      setCheck(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/name-check?q=${encodeURIComponent(dishName.trim())}`);
        if (res.ok) setCheck(await res.json());
      } catch {
        /* offline — the server re-checks on publish anyway */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dishName, mode]);

  const changed = useMemo(() => {
    const orig = new Map(base.ingredients.map((i) => [i.name.toLowerCase(), i]));
    let n = 0;
    for (const r of rows) {
      const o = orig.get(r.name.toLowerCase());
      if (r.removed) n++;
      else if (!o) n++;
      else if ((o.quantity ?? "") !== r.quantity) n++;
    }
    return n;
  }, [rows, base.ingredients]);

  const nameTaken = mode === "new" && !!check?.exact;
  const live = rows.filter((r) => !r.removed);

  return (
    <form action={publishRemix} className="mt-6 space-y-6">
      <input type="hidden" name="base_recipe_id" value={base.recipeId} />
      <input type="hidden" name="base_variant_id" value={base.variantId ?? ""} />
      <input type="hidden" name="base_dish_id" value={dishId ?? ""} />
      <input type="hidden" name="mode" value={mode} />

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">{error}</p>
      ) : null}

      {/* ---- Still this dish, or a new one? ---- */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className={LABEL}>What is this?</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mode === "variant" ? "border-amber-300 bg-amber-300/10" : "border-white/10"} ${!dishId ? "opacity-50" : ""}`}>
            <input type="radio" name="_mode" checked={mode === "variant"} disabled={!dishId} onChange={() => setMode("variant")} className="mt-1" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">Still {base.dishName} — my way</span>
              <span className="block text-[11px] text-slate-400">Everyone sees it as another way to make {base.dishName}.</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mode === "new" ? "border-amber-300 bg-amber-300/10" : "border-white/10"}`}>
            <input type="radio" name="_mode" checked={mode === "new"} onChange={() => setMode("new")} className="mt-1" />
            <span>
              <span className="block text-sm font-semibold text-slate-100">A different dish with its own name</span>
              <span className="block text-[11px] text-slate-400">Took the cream out and put guanciale in? That&apos;s a carbonara, not a creamy pasta.</span>
            </span>
          </label>
        </div>

        {mode === "variant" ? (
          <div className="mt-4">
            <label className={LABEL} htmlFor="variant_label">Call your version</label>
            <input id="variant_label" name="variant_label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Nonna's way · Dad's no-cream version" className={`${INPUT} mt-1.5`} maxLength={60} required />
          </div>
        ) : (
          <div className="mt-4">
            <label className={LABEL} htmlFor="dish_name">New dish name</label>
            <input id="dish_name" name="dish_name" value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="e.g. Guanciale carbonara" className={`${INPUT} mt-1.5 ${nameTaken ? "border-rose-500" : check && !check.exact && dishName.length >= 3 ? "border-emerald-500" : ""}`} maxLength={80} required />
            {check?.exact ? (
              <div className="mt-2 rounded-xl border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
                “{check.exact.name}” is already a dish.{" "}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => {
                    setDishId(check.exact!.id);
                    setMode("variant");
                  }}
                >
                  Make mine a variant of it instead
                </button>
              </div>
            ) : check && dishName.trim().length >= 3 ? (
              <p className="mt-2 text-xs text-emerald-300">✓ Nobody&apos;s used that name. It&apos;s yours.</p>
            ) : null}
            {check?.similar?.length ? (
              <p className="mt-1 text-[11px] text-slate-500">Similar: {check.similar.map((s) => s.name).join(" · ")}</p>
            ) : null}
            <input type="hidden" name="variant_label" value="The original" />
          </div>
        )}
      </section>

      {/* ---- Ingredients ---- */}
      <section>
        <div className="flex items-baseline justify-between">
          <p className={LABEL}>Ingredients</p>
          <span className="text-[11px] text-slate-500">{changed ? `${changed} changed` : "as the original"}</span>
        </div>
        <ul className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <li key={i} className={`rounded-xl border border-white/10 bg-white/[0.03] p-2.5 ${r.removed ? "opacity-40" : ""}`}>
              {r.removed ? (
                <>
                  {/* keep the arrays aligned for the server: a removed row posts an empty name */}
                  <input type="hidden" name="ing_name" value="" />
                  <input type="hidden" name="ing_qty" value="" />
                  <input type="hidden" name="ing_aisle" value={r.aisle} />
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="line-through">{r.name || "(blank)"}{r.quantity ? ` · ${r.quantity}` : ""}</span>
                    <button type="button" onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, removed: false } : x)))} className="rounded-lg border border-white/10 px-2 py-1 text-xs">↩ put back</button>
                  </div>
                </>
              ) : (
              <div className="flex gap-2">
                <input
                  name="ing_name"
                  value={r.name}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="ingredient"
                  className={`${INPUT} flex-1`}
                  maxLength={80}
                />
                <input
                  name="ing_qty"
                  value={r.quantity}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                  placeholder="250 g"
                  className={`${INPUT} w-24`}
                  maxLength={30}
                />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, removed: true } : x)))}
                  className="w-9 shrink-0 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/[0.06]"
                >
                  ✕
                </button>
              </div>
              )}
              {!r.removed ? (
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                  <select name="ing_aisle" value={r.aisle} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, aisle: e.target.value } : x)))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200">
                    {AISLES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1"><input type="checkbox" name="ing_staple" value={String(i)} checked={r.staple} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, staple: e.target.checked } : x)))} /> pantry staple</label>
                  <label className="flex items-center gap-1"><input type="checkbox" name="ing_optional" value={String(i)} checked={r.optional} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, optional: e.target.checked } : x)))} /> optional</label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setRows([...rows, { name: "", quantity: "", aisle: "Other", staple: false, optional: false, removed: false }])}
          className="mt-2 w-full rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.04]"
        >
          + Add an ingredient
        </button>
        {live.length < 2 ? <p className="mt-1 text-[11px] text-rose-300">Needs at least two ingredients.</p> : null}
      </section>

      {/* ---- Steps ---- */}
      <section>
        <label className={LABEL} htmlFor="instructions_md">Steps</label>
        <textarea id="instructions_md" name="instructions_md" defaultValue={base.instructions_md} rows={7} className={`${INPUT} mt-1.5 leading-relaxed`} placeholder={"1. …\n2. …"} required />
        <label className={`${LABEL} mt-4 block`} htmlFor="notes">The secret (optional)</label>
        <textarea id="notes" name="notes" defaultValue={base.notes} rows={2} className={`${INPUT} mt-1.5`} placeholder="Off the heat before the eggs go in. Always." />
      </section>

      {/* ---- Details ---- */}
      <section className="grid grid-cols-3 gap-2">
        <div>
          <label className={LABEL} htmlFor="cuisine">Cuisine</label>
          <input id="cuisine" name="cuisine" defaultValue={base.cuisine ?? ""} className={`${INPUT} mt-1.5`} maxLength={40} />
        </div>
        <div>
          <label className={LABEL} htmlFor="prep_time_min">Minutes</label>
          <input id="prep_time_min" name="prep_time_min" type="number" min={5} max={600} defaultValue={base.prep_time_min ?? 30} className={`${INPUT} mt-1.5`} />
        </div>
        <div>
          <label className={LABEL} htmlFor="servings">Serves</label>
          <input id="servings" name="servings" type="number" min={1} max={20} defaultValue={base.servings} className={`${INPUT} mt-1.5`} />
        </div>
      </section>

      {/* ---- Complexity ---- */}
      <section>
        <p className={LABEL}>How hard is it, honestly?</p>
        <div className="mt-2 space-y-1.5">
          {COMPLEXITY_LEVELS.map((c) => (
            <label key={c.level} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3 py-2 has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/10">
              <input type="radio" name="complexity" value={c.level} defaultChecked={c.level === base.complexity} />
              <span className="w-24 shrink-0 text-sm">{"🔪".repeat(c.level)}</span>
              <span className="text-sm text-slate-100">{c.name} <span className="text-[11px] text-slate-400">— {c.blurb}</span></span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">Other cooks vote too; the shown level drifts to what people actually found.</p>
      </section>

      {/* ---- Cost ---- */}
      <section>
        <label className={LABEL} htmlFor="cost_override">Cost</label>
        <select id="cost_override" name="cost_override" defaultValue="0" className={`${INPUT} mt-1.5`}>
          <option value="0">Let Matilda work it out from the ingredients</option>
          {COST_BANDS.map((b) => (
            <option key={b.band} value={b.band}>{b.glyph} · {b.label}{b.maxAud !== Infinity ? ` (under $${b.maxAud})` : ""}</option>
          ))}
        </select>
      </section>

      <button type="submit" className={BTN} disabled={nameTaken || live.length < 2}>
        {mode === "new" ? "Publish as a new dish" : `Publish my version of ${base.dishName}`}
      </button>
      <p className="text-center text-[11px] text-slate-500">
        Goes live for everyone as <b>Unverified</b>. It becomes <b>Community verified</b> once a few households rate it well. It also becomes <b>our way</b> to make it at home.
      </p>
    </form>
  );
}
