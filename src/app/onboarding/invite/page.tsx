// Build the family: add people directly (kids without devices) or hand out
// invite codes / share links for people joining from their own device.

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { Mascot } from "@/components/brand/Mascot";
import { Avatar } from "@/components/brand/Avatar";
import { ShareInviteButton } from "@/components/invite/ShareInviteButton";
import { createInviteCode, createMemberDirectly } from "./actions";

export const dynamic = "force-dynamic";

type InviteRow = {
  code: string;
  suggested_role: string | null;
  suggested_name: string | null;
  used_at: string | null;
  expires_at: string;
};

type FamilyRow = {
  id: string;
  name: string;
  role: string;
  avatar_emoji: string | null;
};

const ADD_AVATARS = ["🐯", "🦊", "🐼", "🦁", "🦄", "🐙", "🐧", "🐢"];

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; error?: string; added?: string }>;
}) {
  const { fresh, error, added } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { household } = ctx!;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "jeebus.vercel.app";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const [{ data: codeData }, { data: famData }] = await Promise.all([
    supabase
      .from("household_invite_codes")
      .select("code, suggested_role, suggested_name, used_at, expires_at")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("members")
      .select("id, name, role, avatar_emoji")
      .eq("household_id", household.id)
      .order("created_at", { ascending: true }),
  ]);
  const codes: InviteRow[] = (codeData as InviteRow[] | null) ?? [];
  const family: FamilyRow[] = (famData as FamilyRow[] | null) ?? [];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            {fresh ? "Family created" : "Build the family"}
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            {household.emoji} {household.name}
          </p>
        </div>
      </div>

      {fresh ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          You&apos;re in 🎉 We&apos;ve also emailed you a magic link — tap it
          when it arrives to lock in account recovery. Now, who else lives
          here?
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {added ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          {added} is in the family ✨ They&apos;ll show up on the picker —
          no code needed.
        </p>
      ) : null}

      {/* ---------------- The family so far ---------------- */}
      <section className="mt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          The family so far
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {family.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <Avatar name={m.name} emoji={m.avatar_emoji} size={28} />
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {m.name}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {m.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Add someone directly ---------------- */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <p className="font-display text-lg font-bold text-slate-100">
          Add someone now
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Best for kids without their own device or email — they&apos;ll just
          tap their face on this device&apos;s picker.
        </p>
        <form action={createMemberDirectly} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              name="member_name"
              type="text"
              required
              maxLength={30}
              placeholder="Their name"
              className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-200 focus:border-amber-300 focus:outline-none"
            />
            <select
              name="role"
              defaultValue="kid"
              className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-slate-200"
            >
              <option value="kid">Kid</option>
              <option value="teen">Teen</option>
              <option value="parent">Parent</option>
              <option value="partner">Partner</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {ADD_AVATARS.map((e, i) => (
              <label
                key={e}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-xl transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/15"
              >
                <input
                  type="radio"
                  name="avatar_emoji"
                  value={e}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {e}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="w-full rounded-2xl border border-amber-300/50 bg-amber-300/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-amber-200 transition hover:bg-amber-300/20"
          >
            + Add to family
          </button>
        </form>
      </section>

      {/* ---------------- Or invite to their own device ---------------- */}
      <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
        <p className="font-display text-lg font-bold text-slate-100">
          Invite to their own device
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Makes a one-person code (works 14 days). Send the link, show the QR
          of your screen, or just read the letters out.
        </p>
        <form action={createInviteCode} className="mt-4 space-y-3">
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
            className="w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
          >
            + New invite code
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {codes.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
              No codes yet. Make one above.
            </p>
          ) : (
            codes.map((c) => {
              const expired = new Date(c.expires_at) < new Date();
              const used = c.used_at !== null;
              const active = !used && !expired;
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
                  {active ? (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-slate-500">
                        {origin}/onboarding/join?code={c.code}
                      </p>
                      <ShareInviteButton
                        url={`${origin}/onboarding/join?code=${c.code}`}
                        familyName={household.name}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
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
