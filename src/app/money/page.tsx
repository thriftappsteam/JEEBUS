import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { Toast } from "@/components/brand/Toast";
import { markEarningPaid } from "@/app/actions/earnings";

export const dynamic = "force-dynamic";

type Member = { id: string; name: string; role: string };

type Earning = {
  id: string;
  chore_label: string;
  amount: number;
  earned_date: string;
  paid: boolean;
  notes: string | null;
  earner: { id: string; name: string } | null;
  owed_by: { id: string; name: string } | null;
};

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  const toastMessage = added ? "Earning added" : null;

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, name, role");
  const family: Member[] = members ?? [];
  const kids = family.filter((m) => m.role === "kid");

  const { data: earnRows } = await supabase
    .from("kid_earnings")
    .select(
      `id, chore_label, amount, earned_date, paid, notes,
       earner:members!earned_by_member_id(id, name),
       owed_by:members!owed_by_member_id(id, name)`,
    )
    .order("earned_date", { ascending: false })
    .limit(60);
  const earnings = (earnRows as unknown as Earning[] | null) ?? [];

  // Per-kid totals
  const kidTotals = new Map<string, { owed: number; paid: number; count: number }>();
  for (const k of kids) kidTotals.set(k.id, { owed: 0, paid: 0, count: 0 });
  for (const e of earnings) {
    if (!e.earner) continue;
    const t = kidTotals.get(e.earner.id);
    if (!t) continue;
    t.count += 1;
    if (e.paid) t.paid += Number(e.amount);
    else t.owed += Number(e.amount);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle="Pocket money — paid chores, owed and paid."
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
            const t = kidTotals.get(k.id) ?? { owed: 0, paid: 0, count: 0 };
            return (
              <div
                key={k.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={k.name} size={40} />
                  <span className="font-display text-xl font-bold text-slate-100">
                    {k.name}
                  </span>
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Owed
                </p>
                <p className="font-display text-3xl font-bold text-emerald-300">
                  ${t.owed.toFixed(2)}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Paid all-time
                </p>
                <p className="text-base font-semibold text-slate-300">
                  ${t.paid.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>

        <h3 className="mt-10 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Recent
        </h3>

        <ul className="mt-3 space-y-2">
          {earnings.length === 0 ? (
            <li className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-400">
              No earnings yet. Paid chores (Lawn mow $5, Pull weeds $5) will auto-log
              here when Alex taps Done. Tap any row below later to mark it paid.
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
                      <Avatar name={e.earner.name} size={40} />
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
                          ${Number(e.amount).toFixed(2)}
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
                          <span className="ml-1 text-amber-300">· tap to mark paid</span>
                        )}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
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
