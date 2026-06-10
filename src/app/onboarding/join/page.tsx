// Join-existing-family path. The invite decides your role — you just bring
// a name and an avatar. Arriving via a share link (?code=XXXXXX) shows who
// you're joining before you commit.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { createClient } from "@/lib/supabase/server";
import { joinWithCode } from "./actions";

export const dynamic = "force-dynamic";

const KID_AVATARS = [
  "🐯", "🦊", "🐼", "🦁", "🐲", "🐸", "🦄", "🐙",
  "🐧", "🐢", "🐬", "🦒", "🐻", "🦋", "🐉", "👽",
];

const ROLE_LABEL: Record<string, string> = {
  parent: "a parent 🧑‍🍼",
  partner: "a partner 💞",
  teen: "a teen 🎧",
  kid: "a kid 🧒",
  other: "family 🌟",
};

type InvitePreview = {
  role: string;
  status: "ok" | "used" | "expired";
  household_name: string;
  household_emoji: string | null;
  suggested_name: string | null;
};

async function loadInvitePreview(code: string): Promise<InvitePreview | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("household_invite_codes")
    .select(
      "suggested_role, suggested_name, used_at, expires_at, household:households!household_id(name, emoji)",
    )
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    suggested_role: string | null;
    suggested_name: string | null;
    used_at: string | null;
    expires_at: string;
    household: { name: string; emoji: string | null } | null;
  };
  if (!row.household) return null;

  const status: InvitePreview["status"] = row.used_at
    ? "used"
    : new Date(row.expires_at) < new Date()
      ? "expired"
      : "ok";

  return {
    role: row.suggested_role ?? "other",
    status,
    household_name: row.household.name,
    household_emoji: row.household.emoji,
    suggested_name: row.suggested_name,
  };
}

export default async function JoinFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  const preview =
    code && code.length === 6 ? await loadInvitePreview(code) : null;

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
            Joining the family
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            {preview && preview.status === "ok"
              ? `Hello${preview.suggested_name ? `, ${preview.suggested_name}` : ""}!`
              : "Pop in your code"}
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {preview ? (
        preview.status === "ok" ? (
          <p className="mt-6 rounded-2xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
            You&apos;re joining{" "}
            <span className="font-bold">
              {preview.household_emoji ?? "🏡"} {preview.household_name}
            </span>{" "}
            as {ROLE_LABEL[preview.role] ?? "family 🌟"}. Just add your name
            and pick a face.
          </p>
        ) : (
          <p className="mt-6 rounded-2xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">
            {preview.status === "used"
              ? "That invite has already been used. Ask for a fresh one!"
              : "That invite has expired. Ask for a fresh one!"}
          </p>
        )
      ) : null}

      <form action={joinWithCode} className="mt-8 space-y-6">
        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            6-letter code
          </label>
          <input
            name="code"
            type="text"
            required
            maxLength={6}
            minLength={6}
            defaultValue={code ?? ""}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="X4P7QM"
            className="mt-2 w-full rounded-2xl border border-emerald-500/30 bg-slate-900 px-4 py-3 text-center font-display text-3xl font-bold tracking-[0.4em] text-emerald-200 focus:border-emerald-300 focus:outline-none"
            style={{ textTransform: "uppercase" }}
          />
        </fieldset>

        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Your name
          </label>
          <input
            name="member_name"
            type="text"
            required
            maxLength={30}
            defaultValue={preview?.status === "ok" ? (preview.suggested_name ?? "") : ""}
            placeholder="e.g. Alex"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-slate-100 focus:border-emerald-300 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Pick your avatar
          </legend>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {KID_AVATARS.map((e, i) => (
              <label
                key={e}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-2xl transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/15"
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
        </fieldset>

        <p className="text-xs text-slate-500">
          Your spot in the family (parent, teen, kid) is set by the invite —
          nothing to choose here.
        </p>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/onboarding"
            className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
          >
            ← back
          </Link>
          <button
            type="submit"
            className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
          >
            Join family →
          </button>
        </div>
      </form>
    </main>
  );
}
