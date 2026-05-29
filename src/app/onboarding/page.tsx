// Onboarding landing — pick "start a family" or "join with a code".
// Lands here when a user has no `hyetas_member_id` cookie.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Mascot } from "@/components/brand/Mascot";
import { Wordmark } from "@/components/brand/Wordmark";
import { getCurrentMember } from "@/lib/hyetas/whoami";

export const dynamic = "force-dynamic";

export default async function OnboardingLanding() {
  // If they already have a member cookie, send them home — they're done.
  const me = await getCurrentMember();
  if (me) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-12 pb-12">
      <div className="flex flex-col items-center text-center">
        <Mascot size={140} />
        <Wordmark size="xl" className="mt-3" />
        <p className="mt-2 text-base text-slate-300">
          Have you ever seen a man throw a shoe.
        </p>
        <p className="mt-8 max-w-xs text-sm text-slate-400">
          A calm, slightly silly app that does the asking so you don&apos;t
          have to. Let&apos;s set up your family.
        </p>
      </div>

      <section className="mt-10 space-y-4">
        <Link
          href="/onboarding/start"
          className="block rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent p-5 transition hover:border-amber-300/70"
        >
          <p className="text-3xl">🏡✨</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-50">
            Start a new family
          </p>
          <p className="mt-1 text-sm text-slate-300">
            You&apos;re the first one here. Name your household, pick an
            emoji, then we&apos;ll set you up.
          </p>
        </Link>

        <Link
          href="/onboarding/join"
          className="block rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/10 via-emerald-400/5 to-transparent p-5 transition hover:border-emerald-400/60"
        >
          <p className="text-3xl">🔑🎒</p>
          <p className="mt-2 font-display text-2xl font-bold text-slate-50">
            Join with a code
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Someone in your house gave you a 6-letter code. Tap here to
            jump in.
          </p>
        </Link>
      </section>

      <p className="mt-auto pt-12 text-center text-[10px] uppercase tracking-wider text-slate-600">
        the system asks. you don&apos;t have to.
      </p>
    </main>
  );
}
