// /money — the household money hub.
// Same same: top-of-page kid cards + recent earnings list are intact.
// What's new: balance is now "after goal allocations", a streak counter,
// an active-goals strip, and a recently-earned-badge ribbon.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { Toast } from "@/components/brand/Toast";
import { markEarningPaid } from "@/app/actions/earnings";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

export const dynamic = "force-dynamic";

type Member = {
  id: string;
  name: string;
  role: string;
  avatar_emoji: string | null;
  money_mascot: string | null;
};

type Earning = {
  id: string;
  chore_label: string;
  amount: number;
  earned_date: string;
  paid: boolean;
  notes: string | null;
  earner: { id: string; name: string; avatar_emoji: string | null } | null;
  owed_by: { id: string; name: string } | null;
};

type Goal = {
  id: string;
  member_id: string;
  name: string;
  emoji: string | null;
  target_amount: number;
  status: string;
  approved_at: string | null;
  contributions: { amount: number }[];
};

type RecentBadge = {
  badge_code: string;
  earned_at: string;
  member: { id: string; name: string; avatar_emoji: string | null } | null;
  badge: { name: string; emoji: string } | null;
};

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const toastMessage = added ? "Earning added" : null;

  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) {
    return (
      <main className="mx-auto max-w-md px-6 pt-10 pb-8">
        <Header subtitle="Money" />
        <p className="mt-8 text-sm text-slate-400">
          Pick a member on the home screen first.
        </p>
      </main>
    );
  }
  const { member, household } = ctx!;
  const sym = household.currency_symbol ?? "$";

  const supabase = await createClient();

  // Household members
  const { data: members } = await supabase
    .from("members")
    .select("id, name, role, avatar_emoji, money_mascot")
    .eq("household_id", household.id);
  const family: Member[] = (members as Member[] | null) ?? [];
  const kids = family.filter((m) => m.role === "kid" || m.role === "teen");

  // Recent earnings (household-scoped)
  const { data: earnRows } = await supabase
    .from("kid_earnings")
    .select(
      `id, chore_label, amount, earned_date, paid, notes,
       earner:members!earned_by_member_id(id, name, avatar_emoji),
       owed_by:members!owed_by_member_id(id, name)`,
    )
    .eq("household_id", household.id)
    .order("earned_date", { ascending: false })
    .limit(60);
  const earnings = (earnRows as unknown as Earning[] | null) ?? [];

  // Active goals
  const { data: goalRows } = await supabase
    .from("savings_goals")
    .select(
      `id, member_id, name, emoji, target_amount, status, approved_at,
       contributions:goal_contributions(amount)`,
    )
    .eq("household_id", household.id)
    .in("status", ["active", "reached"])
    .order("created_at", { ascending: false });
  const goals = (goalRows as unknown as Goal[] | null) ?? [];

  // Recently earned badges (household-scoped, last 5)
  const { data: bRows } = await supabase
    .from("member_badges")
    .select(
      `badge_code, earned_at,
       member:members!member_id(id, name, avatar_emoji),
       badge:badge_catalog!badge_code(name, emoji)`,
    )
    .eq("household_id", household.id)
    .order("earned_at", { ascending: false })
    .limit(5);
  const recentBadges = (bRows as unknown as RecentBadge[] | null) ?? [];

  // Per-kid totals: owed, paid, allocated-to-goals, free balance
  type Stat = {
    owed: number;
    paid: number;
    allocated: number;
    free: number;
    count: number;
    streak: number;
  };
  const stats = new Map<string, Stat>();
  for (const k of kids)
    stats.set(k.id, {
      owed: 0,
      paid: 0,
      allocated: 0,
      free: 0,
      count: 0,
      streak: 0,
    });
  for (const e of earnings) {
    if (!e.earner) continue;
    const s = stats.get(e.earner.id);
    if (!s) continue;
    s.count += 1;
    if (e.paid) s.paid += Number(e.amount);
    else s.owed += Number(e.amount);
  }

  // Sum allocations per member
  if (kids.length > 0) {
    const { data: contribs } = await supabase
      .from("goal_contributions")
      .select("member_id, amount, kind")
      .in(
        "member_id",
        kids.map((k) => k.id),
      );
    for (const c of contribs ?? []) {
      const s = stats.get(String(c.member_id));
      if (!s) continue;
      const delta = c.kind === "withdraw" ? -Number(c.amount) : Number(c.amount);
      s.allocated += delta;
    }
  }

  // Streaks (one DB call each, kids only — small N)
  for (const k of kids) {
    const { data: streak } = await supabase.rpc("member_current_streak", {
      p_member_id: k.id,
    });
    const s = stats.get(k.id);
    if (s) s.streak = Number(streak ?? 0);
  }

  // Free = paid + owed - allocated  (you can spend toward a goal from
  // either bucket since this is just an earmark)
  for (const [id, s] of stats) {
    s.free = Math.max(0, s.owed + s.paid - s.allocated);
    stats.set(id, s);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle={`${household.emoji ?? "🏡"} ${household.name} — money & wishlist`}
        rightSlot={
          <Link
            href="/money/add"
            className="rounded-xl bg-emerald-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-950 hover:bg-emerald-200"
          >
            + Add
          </Link>
        }
      />

      <Toast message={toastMessage} />

      <section className="mt-8">
        <h2 className="font-display text-3xl font-bold text-slate-50">
          Earnings
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Auto-logged when a paid chore is marked done.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {kids.map((k) => {
            const s = stats.get(k.id) ?? {
              owed: 0,
              paid: 0,
              allocated: 0,
              free: 0,
              count: 0,
              streak: 0,
            };
            return (
              <div
                key={k.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={k.name} emoji={k.avatar_emoji} size={40} />
                  <span className="font-display text-xl font-bold text-slate-100">
                    {k.name}
                  </span>
                  {s.streak >= 2 ? (
                    <span
                      className="ml-auto rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200"
                      title={`${s.streak}-day streak`}
                    >
                      🔥 {s.streak}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Owed
                </p>
                <p className="font-display text-3xl font-bold text-emerald-300">
                  {sym}
                  {s.owed.toFixed(2)}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <p className="uppercase tracking-[0.14em] text-slate-500">
                      Paid all-time
                    </p>
                    <p className="text-sm font-semibold text-slate-300">
                      {sym}
                      {s.paid.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.14em] text-slate-500">
                      Saving toward
                    </p>
                    <p className="text-sm font-semibold text-amber-300">
                      {sym}
                      {s.allocated.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick links into the deeper money areas */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/goals"
            className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-3 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/60"
          >
            🎯 Wishlist & goals
          </Link>
          <Link
            href="/badges"
            className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] px-3 py-3 text-center text-sm font-semibold text-amber-200 transition hover:border-amber-300/60"
          >
            🏆 Badges
          </Link>
        </div>

        {goals.length > 0 ? (
          <>
            <h3 className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Goals in flight
            </h3>
            <ul className="mt-3 space-y-3">
              {goals.slice(0, 4).map((g) => {
                const saved = g.contributions.reduce(
                  (s, c) => s + Number(c.amount),
                  0,
                );
                const pct = Math.min(
                  100,
                  Math.round((saved / Number(g.target_amount)) * 100),
                );
                const memberRow = family.find((f) => f.id === g.member_id);
                return (
                  <li
                    key={g.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{g.emoji ?? "🎯"}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-100">
                          {g.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {memberRow?.name ?? "?"} · {sym}
                          {saved.toFixed(2)} of {sym}
                          {Number(g.target_amount).toFixed(2)}
                          {g.status === "reached" ? " · reached 🎉" : ""}
                          {g.approved_at === null
                            ? " · waiting parent"
                            : ""}
                        </p>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-pink-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {recentBadges.length > 0 ? (
          <>
            <h3 className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Recent badges
            </h3>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {recentBadges.map((b) => (
                <li
                  key={b.badge_code + "_" + (b.member?.id ?? "")}
                  className="shrink-0 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-center"
                  style={{ minWidth: 110 }}
                >
                  <p className="text-3xl">{b.badge?.emoji ?? "🏅"}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-100">
                    {b.badge?.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {b.member?.name}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h3 className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Recent
        </h3>

        <ul className="mt-3 space-y-2">
          {earnings.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-400">
              No earnings yet. Paid chores will auto-log here when a kid
              taps Done.
            </li>
          ) : (
            earnings.map((e) => (
              <li key={e.id}>
                <form action={markEarningPaid}>
                  <input type="hidden" name="id" value={e.id} />
                  <input
                    type="hidden"
                    name="next"
                    value={(!e.paid).toString()}
                  />
                  <button
                    type="submit"
                    className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      e.paid
                        ? "border-white/5 bg-white/[0.02] text-slate-500"
                        : "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-400/60"
                    }`}
                  >
                    {e.earner ? (
                      <Avatar
                        name={e.earner.name}
                        emoji={e.earner.avatar_emoji}
                        size={40}
                      />
                    ) : null}
                    <span className="flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            e.paid ? "line-through" : "text-slate-100"
                          }`}
                        >
                          {e.chore_label}
                        </span>
                        <span
                          className={`font-display text-lg font-bold ${
                            e.paid ? "text-slate-500" : "text-emerald-300"
                          }`}
                        >
                          {sym}
                          {Number(e.amount).toFixed(2)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {e.earner?.name ?? "?"}
                        {e.owed_by ? ` · from ${e.owed_by.name}` : ""}
                        {" · "}
                        {fmtDate(e.earned_date)}
                        {e.paid ? (
                          <span className="ml-1 text-emerald-400">· paid ✓</span>
                        ) : (
                          <span className="ml-1 text-amber-300">
                            · tap to mark paid
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>

        {member.role === "parent" ? (
          <div className="mt-10 text-center">
            <Link
              href="/onboarding/invite"
              className="text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
            >
              + Invite someone to {household.name}
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
