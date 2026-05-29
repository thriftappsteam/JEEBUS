// Join-existing-family path. Three things: code, name, role + avatar.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { joinWithCode } from "./actions";

export const dynamic = "force-dynamic";

const KID_AVATARS = [
  "🐯", "🦊", "🐼", "🦁", "🐲", "🐸", "🦄", "🐙",
  "🐧", "🐢", "🐬", "🦒", "🐻", "🦋", "🐉", "👽",
];

export default async function JoinFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
            Joining the family
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            Pop in your code
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
            placeholder="e.g. Alex"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-slate-100 focus:border-emerald-300 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Are you a…
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { val: "parent", lbl: "Parent 🧑‍🍼" },
              { val: "kid", lbl: "Kid 🧒" },
              { val: "teen", lbl: "Teen 🎧" },
              { val: "other", lbl: "Other 🌟" },
            ].map((r, i) => (
              <label
                key={r.val}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-200 transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/15"
              >
                <input
                  type="radio"
                  name="role"
                  value={r.val}
                  defaultChecked={i === 1}
                  className="sr-only"
                />
                {r.lbl}
              </label>
            ))}
          </div>
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
