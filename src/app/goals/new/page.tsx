// New savings goal form. Kid path: pick from template OR roll their own.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/brand/Header";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { createClient } from "@/lib/supabase/server";
import { createGoal } from "../actions";

export const dynamic = "force-dynamic";

const TEMPLATES = [
  { emoji: "🧱", name: "LEGO set",       amount: 80 },
  { emoji: "🎮", name: "Video game",     amount: 90 },
  { emoji: "🎧", name: "Headphones",     amount: 120 },
  { emoji: "👟", name: "Sneakers",       amount: 150 },
  { emoji: "📚", name: "Book series",    amount: 60 },
  { emoji: "🎨", name: "Art supplies",   amount: 40 },
  { emoji: "🪀", name: "A fun thing",    amount: 25 },
  { emoji: "💵", name: "Just pile cash", amount: 50 },
];

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx!;

  // Parents can choose who the goal is for. Kids only themselves.
  let kids: { id: string; name: string }[] = [];
  if (member.role === "parent") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("id, name, role")
      .eq("household_id", household.id);
    kids = (data ?? []).filter((m) => m.role === "kid" || m.role === "teen");
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <Header subtitle="New savings goal" />

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <form action={createGoal} className="mt-8 space-y-6">
        {member.role === "parent" && kids.length > 0 ? (
          <fieldset>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Who&apos;s saving?
            </label>
            <select
              name="member_id"
              defaultValue={kids[0]?.id}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-100"
              required
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </fieldset>
        ) : (
          <input type="hidden" name="member_id" value={member.id} />
        )}

        <fieldset>
          <legend className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Pick a template (you can tweak after)
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TEMPLATES.map((t, i) => (
              <label
                key={t.name}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-200 transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/15"
              >
                <input
                  type="radio"
                  name="template_idx"
                  value={i}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <span className="text-2xl">{t.emoji}</span>
                <span className="flex-1">
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-[11px] text-slate-400">
                    ~${t.amount}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Or write your own
          </label>
          <input
            name="custom_name"
            type="text"
            maxLength={60}
            placeholder="e.g. Drone, concert ticket, special LEGO"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-base text-slate-100 focus:border-emerald-300 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Target amount
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl text-emerald-300">$</span>
            <input
              name="target_amount"
              type="number"
              step="1"
              min="1"
              placeholder="50"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-base text-slate-100"
              required
            />
          </div>
        </fieldset>

        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Notes (why you want it)
          </label>
          <textarea
            name="notes"
            rows={2}
            maxLength={200}
            placeholder="optional — kids who write it down stick to it more"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
          />
        </fieldset>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/goals"
            className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
          >
            ← back
          </Link>
          <button
            type="submit"
            className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
          >
            Save goal
          </button>
        </div>
      </form>
    </main>
  );
}
