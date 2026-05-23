import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { markChoreDue } from "@/app/actions/chores";

export const dynamic = "force-dynamic";

/** Today's date in Australia/Melbourne, as a YYYY-MM-DD string suitable for a date input. */
function todayInMelbourne(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export default async function ScheduleChorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();

  const [{ data: chore }, { data: members }] = await Promise.all([
    supabase
      .from("chores")
      .select("id, name, default_assignee, due_time, cadence, notes")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("members")
      .select("id, name, role")
      .order("role")
      .order("name"),
  ]);

  if (!chore) notFound();

  const today = todayInMelbourne();
  const defaultTime = chore.due_time ? chore.due_time.slice(0, 5) : "18:00";

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Mark as due" />

      <Link
        href="/chores"
        className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
      >
        ← All chores
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        {chore.name}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Pick a date and who&apos;s on it. You&apos;ll get a reminder around the chosen time.
      </p>

      {chore.cadence !== "OnDemand" ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-xs text-amber-200"
        >
          Heads up: this chore isn&apos;t set to <span className="font-bold">As needed</span> — it&apos;s on a regular schedule. You can still mark it due now if you want a one-off, but it&apos;ll keep auto-appearing as usual.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <form action={markChoreDue} className="mt-6 space-y-4">
        <input type="hidden" name="chore_id" value={chore.id} />

        <Field label="When is it due?">
          <input
            name="due_date"
            type="date"
            required
            defaultValue={today}
            min={today}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          />
        </Field>

        <Field label="Who does it?">
          <select
            name="member_id"
            defaultValue={chore.default_assignee ?? "FAMILY"}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            <option value="FAMILY">Family (anyone)</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Reminder time">
          <input
            name="due_time"
            type="time"
            defaultValue={defaultTime}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Phone notification fires within ±30 min of this time.
          </span>
        </Field>

        <button
          type="submit"
          className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
        >
          📅 Schedule it
        </button>
      </form>
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
