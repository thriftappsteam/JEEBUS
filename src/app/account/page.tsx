// "You & family" — device + access management. PINs for the picker, recovery
// emails for grown-ups, switch person. Kids see only their own PIN controls.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { resolveFeatures, type FeatureKey } from "@/lib/hyetas/features";
import {
  setMemberPin,
  clearMemberPin,
  setMemberEmail,
  setHouseholdFeatures,
  setHouseholdAllergies,
} from "./actions";

const FEATURE_LABELS: { key: FeatureKey; label: string }[] = [
  { key: "chores", label: "🧹 Chores & Tonight" },
  { key: "meals", label: "🍝 Meals & recipes" },
  { key: "grocery", label: "🛒 Grocery list" },
  { key: "money", label: "💰 Kid money" },
  { key: "shifts", label: "🌙 Shift roster" },
];

export const dynamic = "force-dynamic";

type MemberRow = {
  id: string;
  name: string;
  role: string;
  avatar_emoji: string | null;
  email: string | null;
  auth_user_id: string | null;
  pin_hash: string | null;
};

function isGrownUp(role: string): boolean {
  return role === "parent" || role === "partner";
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member: me, household } = ctx!;
  const grownUp = isGrownUp(me.role);

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, name, role, avatar_emoji, email, auth_user_id, pin_hash")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });
  const family: MemberRow[] = (data as MemberRow[] | null) ?? [];

  // Household food & allergy notes (health info — grown-ups view/edit/wipe).
  const { data: hh } = await supabase
    .from("households")
    .select("setup_answers")
    .eq("id", household.id)
    .maybeSingle();
  const setupAnswers =
    ((hh as { setup_answers: Record<string, unknown> | null } | null)
      ?.setup_answers as Record<string, unknown> | null) ?? {};
  const allergyNotes =
    typeof setupAnswers.allergies === "string" ? setupAnswers.allergies : "";

  // Kids manage only themselves; grown-ups manage everyone.
  const manageable = grownUp ? family : family.filter((m) => m.id === me.id);

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-28">
      <Header subtitle={`${household.emoji ?? "🏡"} ${household.name} — you & family`} />

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          ✓ {saved}
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          This device
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Linked to {household.emoji ?? "🏡"}{" "}
          <span className="font-semibold text-slate-100">
            {household.name}
          </span>
          . Switching shows the family picker — anyone with a PIN needs it to
          get back in.
        </p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/[0.1]"
          >
            ⇄ Switch person
          </button>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {grownUp ? "PINs & recovery" : "Your PIN"}
        </p>

        {manageable.map((m) => {
          const self = m.id === me.id;
          return (
            <div
              key={m.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.name} emoji={m.avatar_emoji} size={40} />
                <div>
                  <p className="font-display text-lg font-bold text-slate-100">
                    {m.name}
                    {self ? (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {m.role} · {m.pin_hash ? "🔒 PIN set" : "no PIN"}
                    {isGrownUp(m.role)
                      ? m.auth_user_id
                        ? " · ✅ email verified"
                        : m.email
                          ? " · 📬 email added, not verified yet"
                          : " · ⚠️ no recovery email"
                      : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <form action={setMemberPin} className="flex items-center gap-2">
                  <input type="hidden" name="member_id" value={m.id} />
                  <input
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    minLength={4}
                    maxLength={6}
                    required
                    placeholder={m.pin_hash ? "New PIN" : "Set a PIN (4–6 digits)"}
                    autoComplete="off"
                    className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm tracking-[0.25em] text-slate-100 focus:border-amber-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-[11px] font-bold uppercase text-slate-950"
                  >
                    Save
                  </button>
                </form>

                {m.pin_hash && grownUp ? (
                  <form action={clearMemberPin}>
                    <input type="hidden" name="member_id" value={m.id} />
                    <button
                      type="submit"
                      className="text-[11px] uppercase tracking-wider text-slate-500 underline-offset-2 hover:text-slate-300"
                    >
                      Remove PIN
                    </button>
                  </form>
                ) : null}

                {isGrownUp(m.role) && !m.auth_user_id && (self || grownUp) ? (
                  <form
                    action={setMemberEmail}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="member_id" value={m.id} />
                    <input
                      name="email"
                      type="email"
                      required
                      defaultValue={m.email ?? ""}
                      placeholder="Recovery email"
                      autoComplete="email"
                      className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-300 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl bg-emerald-300 px-3 py-2 text-[11px] font-bold uppercase text-slate-950"
                    >
                      {m.email ? "Resend" : "Add"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      {grownUp ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Features
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Tick what your family uses — only those show in the bottom bar.
            Nothing is deleted when you switch one off.
          </p>
          <form action={setHouseholdFeatures} className="mt-3 space-y-2">
            {FEATURE_LABELS.map((f) => {
              const current = resolveFeatures(household.features);
              return (
                <label
                  key={f.key}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-200 transition has-[:checked]:border-amber-300/60 has-[:checked]:bg-amber-300/10"
                >
                  <input
                    type="checkbox"
                    name="features"
                    value={f.key}
                    defaultChecked={current[f.key]}
                    className="h-4 w-4 accent-amber-300"
                  />
                  {f.label}
                </label>
              );
            })}
            <button
              type="submit"
              className="mt-1 w-full rounded-2xl border border-amber-300/50 bg-amber-300/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-200 transition hover:bg-amber-300/20"
            >
              Save features
            </button>
          </form>
        </section>
      ) : null}

      {grownUp ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Food &amp; allergy notes
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            One note for the whole house, used only to flag meals and
            groceries. It&apos;s optional health info — clear the box and
            save to wipe it completely. We flag — you still check labels.
          </p>
          <form action={setHouseholdAllergies} className="mt-3 space-y-2">
            <textarea
              name="allergies"
              rows={3}
              maxLength={500}
              defaultValue={allergyNotes}
              placeholder="e.g. Sam — peanuts (serious). Mia — vegetarian. No shellfish for anyone."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-300 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-2xl border border-amber-300/50 bg-amber-300/10 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-200 transition hover:bg-amber-300/20"
            >
              Save notes
            </button>
          </form>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
        PINs lock the picker on shared devices. Recovery email is for
        grown-ups — it&apos;s how you get back in from a brand-new phone
        (magic link, no passwords).
      </p>

      <p className="mt-4 text-center text-xs text-slate-600">
        <a
          href="/privacy"
          className="underline decoration-slate-700 underline-offset-2 hover:text-slate-400"
        >
          How we look after your family&apos;s data →
        </a>
      </p>
    </main>
  );
}

// (touched to sync the build sandbox — harmless, delete any time)
