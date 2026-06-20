// Public welcome page — what a stranger sees at the root URL on a device
// that isn't linked to any household yet. No family data, no member names.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { Wordmark } from "@/components/brand/Wordmark";

const FEATURES = [
  {
    emoji: "🧹",
    title: "The app does the asking",
    blurb:
      "Tonight's chores land on each person's screen — nobody has to nag, nobody gets the sigh.",
  },
  {
    emoji: "🍝",
    title: "Meals plan themselves",
    blurb:
      "Breakfast, lunch and dinner suggestions from your family's actual favourites, one tap to shuffle.",
  },
  {
    emoji: "🛒",
    title: "Grocery list, consolidated",
    blurb:
      "The week's meals turn into one tidy shopping list, sorted by aisle.",
  },
  {
    emoji: "💰",
    title: "Kid money that's fair",
    blurb:
      "Chores can pay. Earnings, savings goals, streaks and badges — all tracked, no arguments.",
  },
];

export function Welcome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-12 pb-12">
      <div className="flex flex-col items-center text-center">
        <Mascot size={130} />
        <Wordmark size="xl" className="mt-3" />
        <p className="mt-2 text-base text-slate-300">
          Have you ever seen a man throw a shoe.
        </p>
        <p className="mt-6 max-w-xs text-sm text-slate-400">
          A calm, slightly silly app that runs the household asking — chores,
          meals, groceries and kid money — so one person doesn&apos;t have to
          carry it all in their head.
        </p>
      </div>

      <section className="mt-8 space-y-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-2xl">{f.emoji}</p>
            <div>
              <p className="text-sm font-semibold text-slate-100">{f.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {f.blurb}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <Link
          href="/onboarding/start"
          className="block rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent p-5 text-center transition hover:border-amber-300/70"
        >
          <p className="font-display text-xl font-bold text-slate-50">
            🏡✨ Start your family
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Two minutes of setup, then invite the others.
          </p>
        </Link>

        <Link
          href="/onboarding/join"
          className="block rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 via-emerald-400/5 to-transparent p-5 text-center transition hover:border-emerald-400/60"
        >
          <p className="font-display text-xl font-bold text-slate-50">
            🔑🎒 Join with an invite
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Got a link or a 6-letter code from your family? In you come.
          </p>
        </Link>

        <Link
          href="/signin"
          className="block rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-white/25"
        >
          <p className="text-sm font-semibold text-slate-200">
            ↩️ Been here before? Sign back in
          </p>
          <p className="mt-1 text-xs text-slate-500">
            New phone or cleared browser — we&apos;ll email you a magic link.
          </p>
        </Link>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        It&apos;s your family&apos;s data — names, chores, pocket money.{" "}
        <Link
          href="/privacy"
          className="text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-slate-200"
        >
          Here&apos;s exactly how we look after it
        </Link>
        .
      </p>

      <p className="mt-auto pt-10 text-center text-[10px] uppercase tracking-wider text-slate-600">
        the system asks. you don&apos;t have to.
      </p>
    </main>
  );
}

// (touched to sync the build sandbox — harmless, delete any time)
