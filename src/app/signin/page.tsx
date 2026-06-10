// Sign back in via email magic link — the recovery path for parents on a
// new phone / cleared browser. Kids get back in via the family picker once
// a parent has linked the device.

import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { sendMagicLink } from "./actions";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            Welcome back
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            Sign back in
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

      {sent ? (
        <div className="mt-6 rounded-2xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-4 text-sm text-emerald-200">
          <p className="font-semibold">📬 Magic link sent to {sent}</p>
          <p className="mt-1 text-emerald-200/80">
            Open the email on THIS device and tap the link — you&apos;ll land
            straight back in your family. It can take a minute to arrive.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-300">
            New phone? Cleared your browser? Type the email you set up your
            family with and we&apos;ll send a sign-in link. No passwords here.
          </p>

          <form action={sendMagicLink} className="mt-6 space-y-4">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-lg text-slate-100 focus:border-amber-300 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
            >
              Email me a magic link →
            </button>
          </form>
        </>
      )}

      <div className="mt-8 space-y-2 text-center text-xs text-slate-500">
        <p>
          Kids don&apos;t need email — once a grown-up signs in on the family
          device, everyone&apos;s on the picker.
        </p>
        <p>
          <Link
            href="/"
            className="uppercase tracking-wider text-slate-500 underline-offset-2 hover:text-slate-300"
          >
            ← back
          </Link>
        </p>
      </div>
    </main>
  );
}
