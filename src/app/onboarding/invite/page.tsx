// Generate invite codes to hand to the rest of the family.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { Mascot } from "@/components/brand/Mascot";
import { createInviteCode } from "./actions";

export const dynamic = "force-dynamic";

type InviteRow = {
  code: string;
  suggested_role: string | null;
  suggested_name: string | null;
  used_at: string | null;
  expires_at: string;
};

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const { fresh } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;

  const supabase = await createClient();
  const { data } = await supabase
    .from("household_invite_codes")
    .select("code, suggested_role, suggested_name, used_at, expires_at")
    .eq("household_id", household.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const codes: InviteRow[] = (data as InviteRow[] | null) ?? [];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            {fresh ? "Family created" : "Invite the others"}
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            {household.emoji} {household.name}
          </p>
        </div>
      </div>

      {fresh ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          You&apos;re in. Now grab a code for each person who should join.
          Codes work for 14 days, one person each.
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-300">
          Generate a short code for each person. Read it to them or text
          it. They go to <span className="text-amber-300">{`/onboarding/join`}</span>.
        </p>
      )}

      <form action={createInviteCode} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select
            name="suggested_role"
            defaultValue="kid"
            className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-200"
          >
            <option value="parent">Parent</option>
            <option value="partner">Partner</option>
            <option value="teen">Teen</option>
            <option value="kid">Kid</option>
            <option value="other">Other</option>
          </select>
          <input
            name="suggested_name"
            type="text"
            placeholder="Their name (optional)"
            className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-200"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
        >
          + New invite code
        </button>
      </form>

      <section className="mt-8 space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          Codes
        </p>
        {codes.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
            No codes yet. Make one above.
          </p>
        ) : (
          codes.map((c) => {
            const expired = new Date(c.expires_at) < new Date();
            const used = c.used_at !== null;
            return (
              <div
                key={c.code}
                className={`rounded-2xl border px-4 py-3 ${
                  used
                    ? "border-white/5 bg-white/[0.02] opacity-70"
                    : expired
                      ? "border-rose-700/30 bg-rose-900/10 opacity-70"
                      : "border-amber-400/30 bg-amber-300/[0.06]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-display text-3xl font-bold tracking-[0.3em] text-amber-200">
                    {c.code}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    {used
                      ? "used"
                      : expired
                        ? "expired"
                        : `for a ${c.suggested_role ?? "family member"}`}
                  </p>
                </div>
                {c.suggested_name ? (
                  <p className="mt-0.5 text-xs text-slate-400">
                    For: {c.suggested_name}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      <div className="mt-10 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-amber-300/80 hover:text-amber-300"
        >
          → Go to Tonight
        </Link>
        <Link
          href="/chores/new"
          className="text-xs uppercase tracking-wider text-slate-400 hover:text-slate-200"
        >
          Add a chore →
        </Link>
      </div>
    </main>
  );
}
