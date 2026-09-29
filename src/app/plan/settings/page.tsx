// /plan/settings — every weekly-plan default in one place, each one a link
// back into the matching set-up step. Nothing here is asked weekly.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { Header } from "@/components/brand/Header";
import {
  resolvePlanPrefs,
  describeRules,
  fmtClock,
  CHAINS,
} from "@/lib/hyetas/planPrefs";

export const dynamic = "force-dynamic";

export default async function PlanSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx;
  const supabase = await createClient();
  const { data: hh } = await supabase
    .from("households")
    .select("plan_prefs")
    .eq("id", household.id)
    .maybeSingle();
  const prefs = resolvePlanPrefs(hh?.plan_prefs ?? null);
  const { data: memberRows } = await supabase
    .from("members")
    .select("id, name")
    .eq("household_id", household.id)
    .order("name");
  const members = (memberRows as { id: string; name: string }[] | null) ?? [];
  const { data: standingRows } = await supabase
    .from("standing_items")
    .select("item, every_weeks")
    .eq("household_id", household.id)
    .order("item");
  const standing = (standingRows as { item: string; every_weeks: number | null }[] | null) ?? [];
  const chain = CHAINS.find((c) => c.id === prefs.chain)!;
  const grownUp = member.role === "parent" || member.role === "partner";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const rows: { k: string; v: string; step: string }[] = [
    { k: "Who's home", v: members.filter((m) => !prefs.away.includes(m.id)).map((m) => m.name).join(", ") || "everyone", step: "who" },
    { k: "Meals planned", v: [...prefs.meals, ...(prefs.snacks ? ["snacks"] : [])].join(", "), step: "meals" },
    { k: "How we like to eat", v: prefs.styles.join(", ") || "no preference", step: "likes" },
    { k: "Food rules", v: describeRules(prefs) + (prefs.avoid_note ? ` · "${prefs.avoid_note}"` : ""), step: "avoid" },
    { k: "Budget", v: `$${prefs.budget_aud} / week · ${{ meals: "changes the meals", shop: "changes the shop", show: "just shows over/under" }[prefs.budget_mode]}`, step: "budget" },
    { k: "Usual shop", v: `${{ instore: "In store", delivered: "Delivered", pickup: "Pick up" }[prefs.shop_style]} · ${chain.name}`, step: "shop" },
    { k: "Home address", v: prefs.address ? [prefs.address.street, prefs.address.suburb, prefs.address.postcode].filter(Boolean).join(", ") : "not set", step: "shop" },
    { k: "Plan the week", v: prefs.rhythm === "fixed" ? `${prefs.rhythm_day} ${fmtClock(prefs.rhythm_time)}` : prefs.rhythm === "afteropen" ? "When I open it after the last shop" : "A day or two before food runs out", step: "rhythm" },
    { k: "Dinner call", v: `${fmtClock(prefs.push_time)} push + Tonight card`, step: "call" },
    { k: "Eating out", v: prefs.eat_out_dow == null ? "no regular night" : days[prefs.eat_out_dow], step: "call" },
  ];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-24">
      <Header subtitle="Weekly plan · settings" />
      {saved ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          Saved. It&apos;ll apply from the next plan.
        </p>
      ) : null}
      <p className="mt-6 text-sm text-slate-400">
        The defaults Matilda uses every week. Tap a row to change it{grownUp ? "" : " (grown-ups only)"}.
      </p>
      <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
        {rows.map((r) =>
          grownUp ? (
            <Link key={r.k + r.step} href={`/plan?step=${r.step}`} className="flex items-baseline justify-between gap-3 py-3 text-sm hover:text-amber-200">
              <span className="text-slate-400">{r.k}</span>
              <span className="text-right font-medium text-slate-100">{r.v}</span>
            </Link>
          ) : (
            <div key={r.k + r.step} className="flex items-baseline justify-between gap-3 py-3 text-sm">
              <span className="text-slate-400">{r.k}</span>
              <span className="text-right font-medium text-slate-100">{r.v}</span>
            </div>
          ),
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Standing household items</p>
        {standing.length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {standing.map((s) => (
              <li key={s.item} className="flex justify-between">
                <span>{s.item}</span>
                <span className="text-slate-500">{s.every_weeks ? `every ${s.every_weeks} wks` : "every shop"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">None yet.</p>
        )}
        {grownUp ? (
          <Link href="/plan?step=house" className="mt-3 inline-block text-[11px] uppercase tracking-wider text-amber-300/80 hover:text-amber-300">
            Edit →
          </Link>
        ) : null}
      </div>

      <p className="mt-6 text-[11px] text-slate-500">
        Food rules are stored on this household only and you can clear them any time from the &quot;Food rules&quot; row. See the <Link href="/privacy" className="underline">privacy page</Link>.
      </p>
      <Link href="/plan" className="mt-6 block rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-medium text-slate-300 hover:bg-white/[0.04]">
        ← Back to this week
      </Link>
    </main>
  );
}
