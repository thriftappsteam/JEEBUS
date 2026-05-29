// New-family onboarding step 1: household name + emoji + first parent.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { startNewFamily } from "./actions";

export const dynamic = "force-dynamic";

const HOUSEHOLD_EMOJIS = [
  "🏡", "🏠", "🏘️", "🌻", "🌈", "⛺", "🚐", "🐾", "🦄", "🪐",
  "🪴", "🍕", "🌮", "🐙", "🌊", "🔥",
];

const PARENT_AVATARS = [
  "🦊", "🐻", "🐼", "🦝", "🐢", "🦉", "🐱", "🐶", "🦁", "🐯",
  "🐸", "🐰", "🐧", "🦒", "🦔", "🦦",
];

export default async function StartNewFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            Step 1 of 3
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            Name your family
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

      <form action={startNewFamily} className="mt-8 space-y-6">
        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Household name
          </label>
          <input
            name="household_name"
            type="text"
            required
            maxLength={50}
            autoComplete="off"
            placeholder="e.g. The Hendersons"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-slate-100 focus:border-amber-300 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Pick an emoji for your family
          </legend>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {HOUSEHOLD_EMOJIS.map((e, i) => (
              <label
                key={e}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-2xl transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/15"
              >
                <input
                  type="radio"
                  name="household_emoji"
                  value={e}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {e}
              </label>
            ))}
          </div>
        </fieldset>

        <hr className="border-white/10" />

        <fieldset>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Your name (the grown-up setting this up)
          </label>
          <input
            name="owner_name"
            type="text"
            required
            maxLength={30}
            autoComplete="given-name"
            placeholder="e.g. Sam"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-slate-100 focus:border-amber-300 focus:outline-none"
          />
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Pick an avatar
          </legend>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {PARENT_AVATARS.map((e, i) => (
              <label
                key={e}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-2xl transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/15"
              >
                <input
                  type="radio"
                  name="owner_emoji"
                  value={e}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {e}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
            What do you call the household currency?
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { sym: "$", lbl: "dollars" },
              { sym: "£", lbl: "pounds" },
              { sym: "€", lbl: "euros" },
              { sym: "⭐", lbl: "stars" },
            ].map((c, i) => (
              <label
                key={c.sym}
                className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-200 transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/15"
              >
                <input
                  type="radio"
                  name="currency_symbol"
                  value={c.sym}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <input type="hidden" name="currency_label" value={c.lbl} />
                <span className="text-xl">{c.sym}</span>{" "}
                <span className="ml-1 text-slate-300">{c.lbl}</span>
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
            className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
          >
            Create family →
          </button>
        </div>
      </form>
    </main>
  );
}
