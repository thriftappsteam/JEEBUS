import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { Toast } from "@/components/brand/Toast";
import { memberStyle } from "@/lib/brand/memberStyle";

export const dynamic = "force-dynamic";

type Chore = {
  id: string;
  name: string;
  cadence: "Daily" | "Weekly" | "Fortnightly" | "Monthly" | "OnDemand" | null;
  day_hint:
    | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | "Anytime"
    | null;
  notes: string | null;
  pays_aud: number | null;
  default_assignee: string | null;
  due_time: string | null;
  member: { id: string; name: string } | null;
};

/** "17:30:00" → "5:30 PM", null → "6 PM" (generator default). */
function formatChoreTime(timeStr: string | null): string {
  const t = timeStr ?? "18:00:00";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  const mm = m === 0 ? "" : `:${String(m).padStart(2, "0")}`;
  return `${hour12}${mm} ${ampm}`;
}

const CADENCE_ORDER: Chore["cadence"][] = ["Daily", "Weekly", "Fortnightly", "Monthly", "OnDemand"];

const DAY_ORDER: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7, Anytime: 99,
};

const CADENCE_TINT: Record<string, string> = {
  Daily: "linear-gradient(135deg, rgba(251,113,133,0.25), rgba(251,191,36,0.18))",
  Weekly: "linear-gradient(135deg, rgba(56,189,248,0.20), rgba(251,191,36,0.18))",
  Fortnightly: "linear-gradient(135deg, rgba(192,132,252,0.22), rgba(56,189,248,0.18))",
  Monthly: "linear-gradient(135deg, rgba(52,211,153,0.20), rgba(251,191,36,0.18))",
  OnDemand: "linear-gradient(135deg, rgba(148,163,184,0.20), rgba(251,191,36,0.14))",
};

const CADENCE_HINT: Record<string, string> = {
  Daily: "Every day",
  Weekly: "Once a week",
  Fortnightly: "Every other week",
  Monthly: "Once a month",
  OnDemand: "Won't auto-appear — you decide when",
};

const CADENCE_TITLE: Record<string, string> = {
  Daily: "Daily",
  Weekly: "Weekly",
  Fortnightly: "Fortnightly",
  Monthly: "Monthly",
  OnDemand: "As needed",
};

export default async function ChoresPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string; saved?: string; removed?: string; scheduled?: string }>;
}) {
  const { added, saved, removed, scheduled } = await searchParams;
  const toastMessage = added
    ? "Chore added"
    : saved
      ? "Changes saved"
      : removed
        ? "Chore removed"
        : scheduled
          ? "Chore scheduled"
          : null;

  const supabase = await createClient();
  const cookieStore = await cookies();
  const memberId = cookieStore.get("hyetas_member_id")?.value ?? null;

  let memberName: string | null = null;
  let householdId: string | null = null;
  if (memberId) {
    const { data: m } = await supabase
      .from("members")
      .select("name, household_id")
      .eq("id", memberId)
      .maybeSingle();
    memberName = m?.name ?? null;
    householdId = (m?.household_id as string | undefined) ?? null;
  }
  // No signed-in member → not your chore list. Bounce to the front door.
  if (!householdId) redirect("/");

  const { data: rows } = await supabase
    .from("chores")
    .select(
      `id, name, cadence, day_hint, notes, pays_aud, default_assignee, due_time,
       member:members!default_assignee(id, name)`,
    )
    .eq("household_id", householdId!)
    .eq("is_active", true)
    .order("name");

  const chores = (rows as unknown as Chore[] | null) ?? [];

  // Group by cadence
  const groups = new Map<string, Chore[]>();
  for (const c of chores) {
    const key = c.cadence ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  for (const [, arr] of groups) {
    arr.sort((a, b) => {
      const da = DAY_ORDER[a.day_hint ?? "Anytime"] ?? 99;
      const db = DAY_ORDER[b.day_hint ?? "Anytime"] ?? 99;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name);
    });
  }
  const orderedKeys = [
    ...CADENCE_ORDER.filter((k) => k && groups.has(k)) as string[],
    ...[...groups.keys()].filter(
      (k) => !CADENCE_ORDER.includes(k as Chore["cadence"]),
    ),
  ];

  const myChores = memberName
    ? chores.filter((c) => c.member?.name === memberName)
    : [];

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle={`${chores.length} chores in rotation${
          memberName ? ` · ${myChores.length} on you` : ""
        }`}
        rightSlot={
          <Link
            href="/chores/new"
            className="rounded-xl bg-amber-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-950 hover:bg-amber-200"
          >
            + Add
          </Link>
        }
      />

      <Toast message={toastMessage} />

      {memberName && myChores.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/10 via-rose-300/5 to-transparent p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
            Your lane
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-50">
            {myChores.length} {myChores.length === 1 ? "chore" : "chores"}, {memberName}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-200">
            {myChores.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-amber-200/70">
                  {c.day_hint === "Anytime" ? "any" : c.day_hint}
                </span>
                <span>{c.name}</span>
                {c.pays_aud ? (
                  <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                    ${Number(c.pays_aud).toFixed(2)}
                  </span>
                ) : null}
              </li>
            ))}
            {myChores.length > 6 ? (
              <li className="text-[11px] text-slate-500">
                + {myChores.length - 6} more below
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 space-y-7">
        {orderedKeys.map((cadence) => {
          const arr = groups.get(cadence)!;
          return (
            <section key={cadence}>
              <header
                className="overflow-hidden rounded-2xl px-4 py-3"
                style={{ background: CADENCE_TINT[cadence] ?? CADENCE_TINT.Weekly }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                  {CADENCE_HINT[cadence] ?? "Other"}
                </p>
                <p className="font-display text-2xl font-bold text-white">
                  {CADENCE_TITLE[cadence] ?? cadence}{" "}
                  <span className="text-base text-white/70">· {arr.length}</span>
                </p>
              </header>
              <ul className="mt-3 space-y-2">
                {arr.map((c) => {
                  const isMine =
                    memberName != null && c.member?.name === memberName;
                  const accent = memberStyle(c.member?.name ?? "Family").accent;
                  const isOnDemand = c.cadence === "OnDemand";
                  return (
                    <li key={c.id} className="space-y-1.5">
                      <Link
                        href={`/chores/${c.id}`}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: accent,
                        }}
                        className={`flex items-start gap-3 rounded-2xl border bg-white/[0.04] p-3 transition hover:bg-white/[0.06] ${
                          isMine
                            ? "border-amber-300/40"
                            : "border-white/10"
                        }`}
                      >
                      {c.member ? (
                        <Avatar name={c.member.name} size={36} />
                      ) : (
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-500 text-[10px] uppercase tracking-wider text-slate-500"
                          aria-label="Family"
                        >
                          all
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100">
                          {c.name}
                          {c.pays_aud ? (
                            <span
                              className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 align-middle text-[10px] text-emerald-300"
                              title="Paid chore"
                            >
                              ${Number(c.pays_aud).toFixed(2)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
                            style={{
                              background: `${accent}22`,
                              color: accent,
                            }}
                          >
                            {c.member?.name ?? "Family"}
                          </span>
                          {isOnDemand ? (
                            <span className="text-slate-500">no fixed day</span>
                          ) : (
                            <>
                              <span className="text-slate-500">
                                {c.day_hint === "Anytime" ? "anytime" : c.day_hint}
                              </span>
                              <span className="text-slate-500">
                                ⏰ {formatChoreTime(c.due_time)}
                              </span>
                            </>
                          )}
                        </p>
                        {c.notes ? (
                          <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-400">
                            {c.notes}
                          </p>
                        ) : null}
                      </div>
                      </Link>
                      {isOnDemand ? (
                        <Link
                          href={`/chores/${c.id}/schedule`}
                          className="block w-full rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-300/20"
                        >
                          📅 Mark as due
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
