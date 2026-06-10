// Plain-English privacy note. It's kids' data — trusted families will ask.
// No legalese: short, honest answers to the questions a parent actually has.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";

export const metadata = {
  title: "HYETAS — privacy, in plain English",
};

const SECTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What does HYETAS store?",
    a: (
      <>
        Only what you type in: first names (or nicknames — that&apos;s
        fine), the avatars you pick, chores, recipes, meal plans, grocery
        items, and any pocket-money amounts you enter. Grown-ups can add an
        email address — that&apos;s optional, and it&apos;s only used to
        sign you back in on a new phone. Kids never need an email or phone
        number.
      </>
    ),
  },
  {
    q: "Who can see my family's stuff?",
    a: (
      <>
        Your household, and nobody else. Every family&apos;s data is
        separate. A device only shows your family after it has joined with
        an invite from you, and the database itself refuses any request
        that doesn&apos;t come through the app signed-in as your family.
        There is no public directory, search, or feed.
      </>
    ),
  },
  {
    q: "Is it sold, shared, or used for ads?",
    a: (
      <>
        No, no, and no. There are no ads, no trackers, no analytics
        scripts, and we never sell or share data with anyone. The app uses
        two small cookies whose only job is remembering who you are and
        which family this device belongs to.
      </>
    ),
  },
  {
    q: "Where does it live?",
    a: (
      <>
        In a database hosted by Supabase in Singapore, with the app served
        by Vercel. Sign-in emails (magic links) are sent through
        Supabase&apos;s mail service. If you turn on notifications, your
        device stores a push subscription so the app can nudge you —
        that&apos;s it.
      </>
    ),
  },
  {
    q: "What about the kids' PINs?",
    a: (
      <>
        PINs are optional, set by you, and stored scrambled (hashed) — we
        couldn&apos;t read them if we wanted to. They just stop siblings
        tapping each other&apos;s name on a shared tablet.
      </>
    ),
  },
  {
    q: "Can we leave and take our ball home?",
    a: (
      <>
        Any time. Email us and we&apos;ll delete your whole household —
        every name, chore, recipe and cent — completely. No exports held
        back, no &quot;30 business days&quot;, no guilt trip.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-16">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            The fine print, unfine-printed
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Privacy, in plain English
          </h1>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-slate-300">
        HYETAS is a small, family-built app — made by one household to stop
        one person carrying everything, now shared with a few families we
        trust. It handles your family&apos;s names and routines, so here is
        exactly what happens with them. No legalese.
      </p>

      <div className="mt-8 space-y-5">
        {SECTIONS.map((s) => (
          <section
            key={s.q}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="font-display text-lg font-bold text-slate-100">
              {s.q}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {s.a}
            </p>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
        <h2 className="font-display text-lg font-bold text-slate-100">
          Questions? A human answers.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Anything at all — what&apos;s stored, deleting your family, or
          &quot;this looks weird&quot; — email{" "}
          <a
            href="mailto:hello@thriftapps.com"
            className="font-semibold text-emerald-300 underline decoration-emerald-300/40 underline-offset-2 hover:text-emerald-200"
          >
            hello@thriftapps.com
          </a>{" "}
          and we&apos;ll get back to you.
        </p>
      </section>

      <p className="mt-8 text-center text-xs text-slate-600">
        Last updated June 2026 · ThriftApps
      </p>

      <p className="mt-4 text-center">
        <Link
          href="/"
          className="text-xs uppercase tracking-wider text-amber-300/80 hover:text-amber-300"
        >
          ← Back to HYETAS
        </Link>
      </p>
    </main>
  );
}
