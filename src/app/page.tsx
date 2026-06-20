// HYETAS Tonight page — auto-generates today's chores + shows shift banner.
// Multi-family safe: derives household from the cookie member, falls back
// to onboarding when no households exist yet.

import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { markDone } from "@/app/actions/done";
import { enterAs } from "@/app/actions/whoami";
import {
  requestChoreClaim,
  approveChoreClaim,
  declineChoreClaim,
} from "@/app/actions/claims";
import { formatLocalTime } from "@/lib/utils/time";
import { Mascot } from "@/components/brand/Mascot";
import { Wordmark } from "@/components/brand/Wordmark";
import { Avatar } from "@/components/brand/Avatar";
import { Header } from "@/components/brand/Header";
import { memberStyle } from "@/lib/brand/memberStyle";
import { Welcome } from "@/components/landing/Welcome";
import { resolveFeatures } from "@/lib/hyetas/features";

export const dynamic = "force-dynamic";

type Member = {
  id: string;
  name: string;
  role: string;
  household_id: string;
  avatar_emoji: string | null;
};

type TodayRow = {
  assignment_id: string;
  due_at: string;
  status: "pending" | "done" | "skipped" | "overdue";
  chore_id: string;
  chore_name: string;
  chore_instructions_md: string | null;
  chore_hero_photo_url: string | null;
  member_id: string;
  member_name: string;
  is_for_me: boolean;
};

type PickerMember = Member & { pin_hash: string | null };

const ROLE_ORDER: Record<string, number> = {
  parent: 0,
  partner: 1,
  teen: 2,
  kid: 3,
  other: 4,
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    done?: string;
    error?: string;
    claim_sent?: string;
    claim_approved?: string;
    claim_declined?: string;
    claim_resubmitted?: string;
    welcome?: string;
    pin_for?: string;
  }>;
}) {
  const {
    done,
    error,
    claim_sent,
    claim_approved,
    claim_declined,
    claim_resubmitted,
    welcome,
    pin_for,
  } = await searchParams;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const memberId = cookieStore.get("hyetas_member_id")?.value ?? null;
  const deviceHouseholdId =
    cookieStore.get("hyetas_household_id")?.value ?? null;

  // Who is signed in on this device (if anyone)?
  let me: Member | null = null;
  if (memberId) {
    const { data: meRow } = await supabase
      .from("members")
      .select("id, name, role, household_id, avatar_emoji")
      .eq("id", memberId)
      .maybeSingle();
    me = (meRow as Member | null) ?? null;
  }

  // Which household may this device show? The signed-in member's, else the
  // device-link cookie's. NEVER "all households" — a stranger's device has
  // neither cookie and gets the public welcome page instead of family data.
  const pickerHouseholdId = me?.household_id ?? deviceHouseholdId;

  /* ---------- Unknown device: public welcome, zero family data ---------- */
  if (!me && !pickerHouseholdId) {
    return <Welcome />;
  }

  /* ---------- Picker (device is linked, nobody signed in) ---------- */
  if (!me) {
    const { data: hh } = await supabase
      .from("households")
      .select("id, name, emoji")
      .eq("id", pickerHouseholdId!)
      .maybeSingle();
    const household =
      (hh as { id: string; name: string; emoji: string | null } | null) ??
      null;
    if (!household) return <Welcome />; // stale device link

    const { data: members } = await supabase
      .from("members")
      .select("id, name, role, household_id, avatar_emoji, pin_hash")
      .eq("household_id", household.id);

    const family: PickerMember[] = ((members as PickerMember[] | null) ?? [])
      .slice()
      .sort(
        (a, b) =>
          (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) ||
          a.name.localeCompare(b.name),
      );

    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pt-10 pb-12">
        <div className="flex flex-col items-center text-center">
          <Mascot size={120} />
          <Wordmark size="xl" className="mt-2" />
          <p className="mt-1 text-base text-slate-300">
            {household.emoji ?? "🏡"} {household.name}
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Who&apos;s on this device?
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-center text-sm text-rose-300"
          >
            {error}
          </p>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3">
          {family.map((m) =>
            m.pin_hash ? (
              <details
                key={m.id}
                open={pin_for === m.id}
                className="rounded-3xl border border-white/10 bg-white/[0.04]"
              >
                <summary className="flex cursor-pointer list-none flex-col items-center gap-3 px-4 py-6 transition hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                  <Avatar name={m.name} emoji={m.avatar_emoji} size={72} />
                  <span className="font-display text-2xl font-bold text-slate-100">
                    {m.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    🔒 {m.role}
                  </span>
                </summary>
                <form action={enterAs} className="flex items-center gap-2 px-4 pb-4">
                  <input type="hidden" name="member_id" value={m.id} />
                  <input
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="PIN"
                    autoComplete="off"
                    className="w-full min-w-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-lg tracking-[0.3em] text-slate-100 focus:border-amber-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold uppercase text-slate-950"
                  >
                    Go
                  </button>
                </form>
              </details>
            ) : (
              <form key={m.id} action={enterAs}>
                <input type="hidden" name="member_id" value={m.id} />
                <button
                  type="submit"
                  className="flex w-full flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-6 transition hover:bg-white/[0.08]"
                >
                  <Avatar name={m.name} emoji={m.avatar_emoji} size={72} />
                  <span className="text-2xl font-display font-bold text-slate-100">
                    {m.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {m.role}
                  </span>
                </button>
              </form>
            ),
          )}
        </section>

        <div className="mt-8 space-y-2 text-center">
          <Link
            href="/signin"
            className="block text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
          >
            Grown-up on a new device? Sign in with email →
          </Link>
          <Link
            href="/onboarding"
            className="block text-[11px] uppercase tracking-wider text-amber-300/80 hover:text-amber-300"
          >
            Not your family? Start fresh or join with a code →
          </Link>
        </div>

        <p className="mt-auto pt-12 text-center text-[10px] uppercase tracking-wider text-slate-600">
          the system asks. you don&apos;t have to.
        </p>
      </main>
    );
  }

  /* -------------- Tonight view for the picked member -------------- */
  // Which features has this household switched on? (null = everything)
  const { data: hhFeatRow } = await supabase
    .from("households")
    .select("features")
    .eq("id", me.household_id)
    .maybeSingle();
  const features = resolveFeatures(hhFeatRow?.features ?? null);

  // Make sure today's chores have been generated from the rotation. Idempotent.
  let today: TodayRow[] = [];
  if (features.chores) {
    await supabase.rpc("generate_assignments_for_today");
    const { data: rows } = await supabase.rpc("todays_assignments", {
      p_member_id: me.id,
    });
    today = (rows as TodayRow[] | null) ?? [];
  }

  // Anyone on a shift starting today (Melbourne)?
  type ShiftToday = {
    shift_id: string;
    member_id: string;
    member_name: string;
    shift_type: string;
    starts_at: string;
    ends_at: string;
    is_last_in_block: boolean;
  };
  let todaysShifts: ShiftToday[] = [];
  let nextShift: { starts_at: string } | null = null;
  let hasAnyShifts = false;
  if (features.shifts) {
    const { data: shiftRows } = await supabase
      .from("v_todays_shifts")
      .select(
        "shift_id, member_id, member_name, shift_type, starts_at, ends_at, is_last_in_block",
      )
      .eq("household_id", me.household_id)
      .order("starts_at");
    todaysShifts = (shiftRows as ShiftToday[] | null) ?? [];

    // Next shift for the picked member (within the upcoming 14 days)
    const inFourteenDays = new Date();
    inFourteenDays.setDate(inFourteenDays.getDate() + 14);
    const { data: upcomingShifts } = await supabase
      .from("shifts")
      .select("starts_at")
      .eq("member_id", me.id)
      .gt("starts_at", new Date().toISOString())
      .lte("starts_at", inFourteenDays.toISOString())
      .order("starts_at")
      .limit(1);
    nextShift = upcomingShifts?.[0] ?? null;

    // Does this member have any shifts at all? Controls whether we show a
    // small "My roster" entry-point link on Tonight.
    const { count: shiftCount } = await supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .eq("member_id", me.id);
    hasAnyShifts = (shiftCount ?? 0) > 0;
  }

  // Unseen new badges for celebration toast (badges live under kid money)
  let newBadges: {
    badge_code: string;
    badge: { name: string; emoji: string } | null;
  }[] = [];
  if (features.money) {
    const { data: unseenBadges } = await supabase
      .from("member_badges")
      .select(
        `badge_code, badge:badge_catalog!badge_code(name, emoji)`,
      )
      .eq("member_id", me.id)
      .eq("seen_by_member", false)
      .order("earned_at", { ascending: false })
      .limit(3);
    newBadges =
      (unseenBadges as unknown as {
        badge_code: string;
        badge: { name: string; emoji: string } | null;
      }[] | null) ?? [];
    if (newBadges.length > 0) {
      // Mark seen so they don't pop again on refresh
      await supabase
        .from("member_badges")
        .update({ seen_by_member: true })
        .eq("member_id", me.id)
        .eq("seen_by_member", false);
    }
  }

  const myPending = today.filter((r) => r.is_for_me && r.status === "pending");
  const myDone = today.filter((r) => r.is_for_me && r.status === "done");
  // Hide "skipped" rows from other people's list — those are cancelled chores
  // (e.g. someone else already did it, or we flipped to OnDemand). Leaving them
  // visible makes it look like the chore is still hanging over that person.
  const otherToday = today.filter(
    (r) => !r.is_for_me && r.status !== "skipped",
  );

  /* -------------- Claims (kid asks to take a chore for $X) -------------- */
  type ClaimRow = {
    id: string;
    assignment_id: string;
    requested_amount: number;
    notes: string | null;
    created_at: string;
    requester: { id: string; name: string } | null;
  };

  const todayAssignmentIds = today.map((r) => r.assignment_id);
  let pendingClaimsForApproval: ClaimRow[] = [];
  let myOwnPendingClaims: ClaimRow[] = [];

  if (todayAssignmentIds.length > 0) {
    if (me.role === "parent") {
      const { data: claimRows } = await supabase
        .from("chore_claims")
        .select(
          `id, assignment_id, requested_amount, notes, created_at,
           requester:members!requested_by_member_id(id, name)`,
        )
        .in("assignment_id", todayAssignmentIds)
        .eq("status", "pending")
        .order("created_at");
      pendingClaimsForApproval =
        (claimRows as unknown as ClaimRow[] | null) ?? [];
    } else {
      const { data: claimRows } = await supabase
        .from("chore_claims")
        .select(
          `id, assignment_id, requested_amount, notes, created_at,
           requester:members!requested_by_member_id(id, name)`,
        )
        .in("assignment_id", todayAssignmentIds)
        .eq("status", "pending")
        .eq("requested_by_member_id", me.id);
      myOwnPendingClaims = (claimRows as unknown as ClaimRow[] | null) ?? [];
    }
  }
  const myPendingClaimAssignmentIds = new Set(
    myOwnPendingClaims.map((c) => c.assignment_id),
  );
  const choreNameByAssignmentId = new Map<string, string>();
  for (const r of today) choreNameByAssignmentId.set(r.assignment_id, r.chore_name);
  const memberNameByAssignmentId = new Map<string, string>();
  for (const r of today) memberNameByAssignmentId.set(r.assignment_id, r.member_name);

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header
        subtitle={`Hi, ${me.name}. The system is asking — not you.`}
        rightSlot={
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
            >
              You &amp; family
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                Switch user
              </button>
            </form>
          </div>
        }
      />

      {welcome ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          You&apos;re in. Welcome {me.name} 👋
        </p>
      ) : null}

      {newBadges.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
            🎉 New badge{newBadges.length === 1 ? "" : "s"} unlocked
          </p>
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {newBadges.map((b) => (
              <li
                key={b.badge_code}
                className="shrink-0 rounded-2xl border border-amber-200/20 bg-amber-300/[0.08] px-3 py-2 text-center"
                style={{ minWidth: 110 }}
              >
                <p className="text-3xl">{b.badge?.emoji ?? "🏅"}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-100">
                  {b.badge?.name}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/badges"
            className="mt-3 inline-block text-[11px] uppercase tracking-wider text-amber-200/80 hover:text-amber-200"
          >
            See all badges →
          </Link>
        </section>
      ) : null}

      {todaysShifts.map((s) => {
        const isMine = s.member_id === me.id;
        const sleepEnd = s.is_last_in_block ? "2:30 PM" : "5:30 PM";
        const inner = (
          <div
            className={`overflow-hidden rounded-2xl border px-4 py-3 ${
              isMine
                ? "border-purple-500/40 bg-purple-500/10"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-purple-200/80">
              <span>🏥 Tonight</span>
              {isMine ? (
                <span
                  className="ml-auto text-purple-200/70"
                  aria-label="Edit roster"
                >
                  Edit roster ›
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 font-display text-xl font-bold text-slate-50">
              {isMine ? "You're" : `${s.member_name} is`} on {s.shift_type} ·{" "}
              9 PM → 7:30 AM
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              {isMine
                ? `Early dinner around 6 PM. Sleep tomorrow 9 AM – ${sleepEnd}.`
                : "Early dinner around 6 PM (before shift)."}
              {s.is_last_in_block ? " Last night of block." : ""}
            </p>
          </div>
        );
        return isMine ? (
          <Link key={s.shift_id} href="/shifts" className="mt-6 block">
            {inner}
          </Link>
        ) : (
          <div key={s.shift_id} className="mt-6">
            {inner}
          </div>
        );
      })}

      {!todaysShifts.some((s) => s.member_id === me.id) && nextShift ? (
        <Link
          href="/shifts"
          className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400 hover:bg-white/[0.05]"
        >
          <span>🏥 Next shift:</span>
          <span className="text-slate-200">
            {new Date(nextShift.starts_at).toLocaleDateString("en-AU", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "Australia/Melbourne",
            })}
          </span>
          <span className="ml-auto text-slate-500">Edit roster ›</span>
        </Link>
      ) : null}

      {hasAnyShifts &&
      !todaysShifts.some((s) => s.member_id === me.id) &&
      !nextShift ? (
        <Link
          href="/shifts"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400 hover:bg-white/[0.05]"
        >
          🏥 My roster ›
        </Link>
      ) : null}

      {done ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          Logged. Receipt is in.
        </p>
      ) : null}
      {claim_sent ? (
        <p className="mt-6 rounded-xl border border-amber-700/40 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
          Ask sent. Waiting for a parent to approve.
        </p>
      ) : null}
      {claim_resubmitted ? (
        <p className="mt-6 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 text-sm text-slate-300">
          You already asked for that one — still waiting on approval.
        </p>
      ) : null}
      {claim_approved ? (
        <p className="mt-6 rounded-xl border border-emerald-700/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
          Approved. Chore moved to them.
        </p>
      ) : null}
      {claim_declined ? (
        <p className="mt-6 rounded-xl border border-slate-700/40 bg-slate-800/50 px-4 py-3 text-sm text-slate-300">
          Claim declined.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {me.role === "parent" && pendingClaimsForApproval.length > 0 ? (
        <section className="mt-8 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-300/15 via-amber-300/5 to-transparent p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
            Asks waiting on you
          </p>
          <p className="mt-1 font-display text-xl font-bold text-slate-50">
            {pendingClaimsForApproval.length}{" "}
            {pendingClaimsForApproval.length === 1 ? "kid wants" : "kids want"} a chore
          </p>
          <ul className="mt-4 space-y-3">
            {pendingClaimsForApproval.map((c) => {
              const choreName =
                choreNameByAssignmentId.get(c.assignment_id) ?? "(unknown chore)";
              const originalAssignee =
                memberNameByAssignmentId.get(c.assignment_id) ?? "someone";
              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {c.requester?.name ?? "?"} wants{" "}
                    <span className="text-amber-200">{choreName}</span> for{" "}
                    <span className="text-emerald-300">
                      ${Number(c.requested_amount).toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Currently on {originalAssignee}
                    {c.notes ? ` · "${c.notes}"` : ""}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={approveChoreClaim}>
                      <input type="hidden" name="claim_id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-emerald-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
                      >
                        ✓ Approve
                      </button>
                    </form>
                    <form action={declineChoreClaim}>
                      <input type="hidden" name="claim_id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-300 transition hover:bg-rose-500/20"
                      >
                        ✕ Decline
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          For you, tonight
        </p>

        {myPending.length === 0 && myDone.length === 0 ? (
          features.chores ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
              <span className="mr-2">🛋️</span>Nothing on your plate. Sit on a couch.
            </div>
          ) : (
            <div className="space-y-2">
              {features.meals ? (
                <Link
                  href="/meals"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                >
                  🍝 This week&apos;s meals →
                </Link>
              ) : null}
              {features.grocery ? (
                <Link
                  href="/grocery"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                >
                  🛒 Grocery list →
                </Link>
              ) : null}
              {features.money ? (
                <Link
                  href="/money"
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                >
                  💰 Kid money →
                </Link>
              ) : null}
            </div>
          )
        ) : null}

        {myPending.map((row) => {
          const rowAccent = memberStyle(row.member_name).accent;
          const isFamilyChore = row.member_name === "Family";
          const kidCanAskForBounty =
            features.money && isFamilyChore && me.role !== "parent";
          const alreadyAsked = myPendingClaimAssignmentIds.has(
            row.assignment_id,
          );
          return (
          <article
            key={row.assignment_id}
            style={{ borderLeftWidth: "4px", borderLeftColor: rowAccent }}
            className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-lg"
          >
            <div
              className="px-6 pt-5 pb-4"
              style={{
                background: `linear-gradient(135deg, ${rowAccent}33, ${rowAccent}10)`,
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.20em] text-amber-300/90">
                Tonight
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-slate-50">
                {row.chore_name}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {row.member_name} · {formatLocalTime(row.due_at)}
              </p>
            </div>
            <div className="px-6 py-5 space-y-3">
              {row.chore_instructions_md ? (
                <details className="mb-2 group">
                  <summary className="cursor-pointer text-sm font-medium text-amber-300/90 group-open:text-amber-200">
                    How to (tap to open)
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                    {row.chore_instructions_md}
                  </pre>
                </details>
              ) : null}
              <form action={markDone}>
                <input type="hidden" name="assignment_id" value={row.assignment_id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3.5 text-left transition hover:border-emerald-400 hover:bg-emerald-500/15"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-emerald-500"
                  />
                  <span className="text-sm font-semibold text-emerald-200">
                    Mark complete
                  </span>
                </button>
              </form>

              {kidCanAskForBounty && alreadyAsked ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  ⏳ Waiting for a parent to approve your ask for this one
                </p>
              ) : null}

              {kidCanAskForBounty && !alreadyAsked ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                    Or ask for money to do it
                  </p>
                  <form
                    action={requestChoreClaim}
                    className="mt-2 flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="assignment_id"
                      value={row.assignment_id}
                    />
                    <span className="text-base font-bold text-emerald-300">$</span>
                    <input
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.50"
                      min="0"
                      required
                      placeholder="5"
                      aria-label={`Amount to do ${row.chore_name}`}
                      className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="ml-auto rounded-lg bg-emerald-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
                    >
                      Ask for it
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </article>
          );
        })}

        {myDone.map((row) => (
          <article
            key={row.assignment_id}
            className="flex items-center gap-3 rounded-3xl border border-white/5 bg-white/[0.02] px-5 py-4 opacity-70"
          >
            <span
              aria-hidden
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-emerald-500 bg-emerald-500 text-slate-950"
            >
              ✓
            </span>
            <div className="flex-1">
              <p className="text-base font-medium text-slate-200 line-through decoration-emerald-500/60">
                {row.chore_name}
              </p>
              <p className="mt-0.5 text-xs uppercase tracking-wider text-emerald-400">
                Done
              </p>
            </div>
          </article>
        ))}
      </section>

      {otherToday.length > 0 ? (
        <section className="mt-10 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            On other people today
          </p>
          {otherToday.map((row) => {
            const rowAccent = memberStyle(row.member_name).accent;
            const canClaim =
              features.money && me.role !== "parent" && row.status === "pending";
            const alreadyAsked = myPendingClaimAssignmentIds.has(
              row.assignment_id,
            );
            return (
              <div
                key={row.assignment_id}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: rowAccent,
                }}
                className={`space-y-2 rounded-2xl border px-4 py-3 text-sm ${
                  row.status === "done"
                    ? "border-white/5 bg-white/[0.02] opacity-60"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={row.member_name} size={36} />
                  <div className="flex-1">
                    <p
                      className={`text-slate-100 ${
                        row.status === "done" ? "line-through" : ""
                      }`}
                    >
                      {row.chore_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.member_name} ·{" "}
                      {row.status === "done"
                        ? "done ✓"
                        : formatLocalTime(row.due_at)}
                    </p>
                  </div>
                </div>

                {canClaim && alreadyAsked ? (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                    ⏳ Waiting for a parent to approve your ask
                  </p>
                ) : null}

                {canClaim && !alreadyAsked ? (
                  <form
                    action={requestChoreClaim}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="assignment_id"
                      value={row.assignment_id}
                    />
                    <span className="text-base font-bold text-emerald-300">$</span>
                    <input
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      step="0.50"
                      min="0"
                      required
                      placeholder="5"
                      aria-label={`Amount to do ${row.chore_name}`}
                      className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="ml-auto rounded-lg bg-emerald-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
                    >
                      I&apos;ll do it
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <p className="mt-12 text-center text-[10px] uppercase tracking-wider text-slate-600">
        the system asks. you don&apos;t have to.
      </p>
    </main>
  );
}

// (touched to sync the build sandbox — harmless, delete any time)
