import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { addManualEarning } from "@/app/actions/earnings";

export const dynamic = "force-dynamic";

export default async function AddEarningPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("role", "kid")
    .order("name");
  const kids = members ?? [];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Add earning" />

      <Link
        href="/money"
        className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
      >
        ← Money
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        Add a manual earning
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        For when a kid helps out and there&apos;s no chore to mark off.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {kids.length === 0 ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200"
        >
          No kids found in members. Add one first via the household settings.
        </p>
      ) : (
        <form action={addManualEarning} className="mt-6 space-y-4">
          <Field label="Who earned it?">
            <select
              name="kid_id"
              required
              defaultValue={kids[0]?.id ?? ""}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Amount (AUD)">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-display font-bold text-emerald-300">$</span>
              <input
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                placeholder="5.00"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-base text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="What for?">
            <input
              name="reason"
              required
              maxLength={80}
              placeholder="e.g. Helped carry the shopping"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Short and specific — this is what shows on the earnings list.
            </span>
          </Field>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
          >
            💸 Add earning
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Logs against today. Owed by whoever&apos;s signed in.
          </p>
        </form>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
