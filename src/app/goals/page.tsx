// Savings goals + wishlist. Kid sees their own goals; parents see all
// kids' goals and can approve/reject.

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { Toast } from "@/components/brand/Toast";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { contributeToGoal, approveGoal, archiveGoal } from "./actions";

export const dynamic = "force-dynamic";

type Goal = {
  id: string;
  member_id: string;
  name: string;
  emoji: string | null;
  image_url: string | null;
  target_amount: number;
  status: "active" | "reached" | "archived" | "rejected";
  approved_at: string | null;
  created_at: string;
  notes: string | null;
  member: { name: string; avatar_emoji: string | null } | null;
  contributions: { amount: number }[];
};

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) {
    return (
      <main className="mx-auto max-w-md px-6 pt-10 pb-8">
        <Header subtitle="Goals" />
        <p className="mt-8 text-sm text-slate-400">
          Pick a member first on the home screen.
        </p>
      </main>
    );
  }
  const { member, household } = ctx!;
  const supabase = await createClient();

  // Parents see all goals in the household. Kids see only theirs.
  const baseQuery = supabase
    .from("savings_goals")
    .select(
      `id, member_id, name, emoji, image_url, target_amount, status, approved_at, created_at, notes,
       member:members!member_id(name, avatar_emoji),
       contributions:goal_contributions(amount)`,
    )
    .eq("household_id", household.id)
    .neq("status", "archived")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const { data: rows } =
    member.role === "parent"
      ? await baseQuery
      : await baseQuery.eq("member_id", member.id);
  const goals = (rows as unknown as Goal[] | null) ?? [];

  // Unallocated balance per relevant member (only the current viewer for
  // kids; map of members for parents).
  const targetMemberIds =
    member.role === "parent"
      ? Array.from(new Set(goals.map((g) => g.member_id)))
      : [member.id];

  const balanceByMember = new Map<string, number>();
  if (targetMemberIds.length) {
    const { data: earned } = await supabase
      .from("kid_earnings")
      .select("earned_by_member_id, amount")
      .in("earned_by_member_id", targetMemberIds);
    const { data: contribs } = await supabase
      .from("goal_contributions")
      .select("member_id, amount, kind")
      .in("member_id", targetMemberIds);

    for (const id of targetMemberIds) balanceByMember.set(id, 0);
    for (const r of earned ?? []) {
      const id = r.earned_by_member_id as string;
      balanceByMember.set(
        id,
        (balanceByMember.get(id) ?? 0) + Number(r.amount),
      );
    }
    for (const c of contribs ?? []) {
      const id = c.member_id as string;
      const delta = c.kind === "withdraw" ? Number(c.amount) : -Number(c.amount);
      balanceByMember.set(id, (balanceByMember.get(id) ?? 0) + delta);
    }
  }

  const toast = ok === "added"
    ? "Money allocated to the goal"
    : ok === "approved"
      ? "Goal approved"
      : ok === "archived"
        ? "Goal archived"
        : null;

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle={`${household.emoji ?? "🏡"} ${household.name} — wishlist & savings`}
        rightSlot={
          <Link
            href="/goals/new"
            className="rounded-xl bg-emerald-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-950 hover:bg-emerald-200"
          >
            + Goal
          </Link>
        }
      />

      <Toast message={toast} />
      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-3xl font-bold text-slate-50">
          {member.role === "parent" ? "Family wishlist" : "My wishlist"}
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Pick something you&apos;re saving up for. Allocate earnings to
          watch it fill.
        </p>

        {goals.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
            <p className="text-lg">🎯 No goals yet.</p>
            <p className="mt-2">
              <Link
                href="/goals/new"
                className="text-emerald-300 underline-offset-2 hover:underline"
              >
                Add one
              </Link>{" "}
              — LEGO set, headphones, that game. Big or small.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {goals.map((g) => {
              const saved = g.contributions.reduce(
                (s, c) => s + Number(c.amount),
                0,
              );
              const pct = Math.min(
                100,
                Math.round((saved / Number(g.target_amount)) * 100),
              );
              const balance = balanceByMember.get(g.member_id) ?? 0;
              const canContribute =
                g.status === "active" &&
                g.approved_at !== null &&
                balance > 0 &&
                (member.role === "parent" || member.id === g.member_id);
              const canApprove =
                member.role === "parent" && g.approved_at === null;
              return (
                <li
                  key={g.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="text-5xl">{g.emoji ?? "🎯"}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {g.member ? (
                          <Avatar
                            name={g.member.name}
                            emoji={g.member.avatar_emoji}
                            size={28}
                          />
                        ) : null}
                        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                          {g.member?.name ?? "?"}
                        </span>
                        {g.approved_at === null ? (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                            waiting parent
                          </span>
                        ) : null}
                        {g.status === "reached" ? (
                          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
                            reached 🎉
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-display text-2xl font-bold text-slate-50">
                        {g.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        ${saved.toFixed(2)} / ${Number(g.target_amount).toFixed(2)}
                      </p>

                      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-pink-400 transition-all"
                          style={{ width: `${pct}%` }}
                          aria-label={`${pct}% complete`}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {canContribute ? (
                          <form action={contributeToGoal} className="flex items-center gap-2">
                            <input type="hidden" name="goal_id" value={g.id} />
                            <input type="hidden" name="member_id" value={g.member_id} />
                            <span className="text-sm text-emerald-300">$</span>
                            <input
                              name="amount"
                              type="number"
                              step="0.50"
                              min="0.50"
                              max={Math.min(balance, Number(g.target_amount) - saved)}
                              defaultValue={Math.min(balance, Number(g.target_amount) - saved).toFixed(2)}
                              className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                              required
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950"
                            >
                              Save toward
                            </button>
                            <span className="text-[10px] text-slate-500">
                              ${balance.toFixed(2)} free
                            </span>
                          </form>
                        ) : null}

                        {canApprove ? (
                          <form action={approveGoal}>
                            <input type="hidden" name="goal_id" value={g.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200"
                            >
                              ✓ Approve goal
                            </button>
                          </form>
                        ) : null}

                        {member.role === "parent" || member.id === g.member_id ? (
                          <form action={archiveGoal}>
                            <input type="hidden" name="goal_id" value={g.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200"
                            >
                              archive
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
