// Badge shelf — earned and locked. One column per member if parent, one
// big personal shelf if a kid.

import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/brand/Header";
import { Avatar } from "@/components/brand/Avatar";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

export const dynamic = "force-dynamic";

type Badge = {
  code: string;
  name: string;
  emoji: string;
  description: string;
  category: "money" | "chores" | "streak" | "milestone" | "fun";
  tier: "bronze" | "silver" | "gold" | "rainbow";
  sort_order: number;
};

const TIER_RING: Record<Badge["tier"], string> = {
  bronze: "ring-amber-700/60",
  silver: "ring-slate-400/60",
  gold: "ring-amber-300/80",
  rainbow:
    "ring-[3px] ring-transparent bg-clip-padding [background:linear-gradient(135deg,#f472b6,#fbbf24,#34d399,#60a5fa,#a78bfa)_padding-box,linear-gradient(135deg,#f472b6,#fbbf24,#34d399,#60a5fa,#a78bfa)_border-box]",
};

const TIER_BG: Record<Badge["tier"], string> = {
  bronze: "bg-amber-700/15",
  silver: "bg-slate-400/10",
  gold: "bg-amber-300/15",
  rainbow:
    "bg-gradient-to-br from-pink-400/20 via-amber-300/20 to-emerald-400/20",
};

export default async function BadgesPage() {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) {
    return (
      <main className="mx-auto max-w-md px-6 pt-10 pb-8">
        <Header subtitle="Badges" />
        <p className="mt-8 text-sm text-slate-400">
          Pick a member on the home screen first.
        </p>
      </main>
    );
  }
  const { member, household } = ctx!;
  const supabase = await createClient();

  // All badges in the catalog
  const { data: catRows } = await supabase
    .from("badge_catalog")
    .select("code, name, emoji, description, category, tier, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const catalog = (catRows as Badge[] | null) ?? [];

  // Earned badges in this household
  const { data: earnedRows } = await supabase
    .from("member_badges")
    .select(
      `badge_code, member_id, earned_at,
       member:members!member_id(id, name, avatar_emoji)`,
    )
    .eq("household_id", household.id)
    .order("earned_at", { ascending: false });
  const earned =
    (earnedRows as unknown as {
      badge_code: string;
      member_id: string;
      earned_at: string;
      member: { id: string; name: string; avatar_emoji: string | null } | null;
    }[] | null) ?? [];

  // For a kid view, narrow to just them.
  const viewMemberId = member.role === "parent" ? null : member.id;

  // Build a per-member earned-set map
  const earnedByMember = new Map<string, Set<string>>();
  for (const e of earned) {
    if (!earnedByMember.has(e.member_id))
      earnedByMember.set(e.member_id, new Set());
    earnedByMember.get(e.member_id)!.add(e.badge_code);
  }

  const visibleMembers = viewMemberId
    ? Array.from(new Set([viewMemberId]))
    : Array.from(earnedByMember.keys());

  // If parent and no one earned anything yet, still show the current member.
  if (member.role === "parent" && visibleMembers.length === 0) {
    visibleMembers.push(member.id);
  }

  // Fetch member rows for display
  const { data: mRows } = await supabase
    .from("members")
    .select("id, name, role, avatar_emoji")
    .eq("household_id", household.id);
  const members =
    (mRows as { id: string; name: string; role: string; avatar_emoji: string | null }[] | null) ??
    [];

  const recent = earned.slice(0, 5);

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Badges — proof you showed up" />

      {recent.length > 0 ? (
        <section className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Just earned
          </p>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {recent.map((e) => {
              const b = catalog.find((c) => c.code === e.badge_code);
              if (!b) return null;
              return (
                <li
                  key={e.badge_code + "_" + e.member_id}
                  className={`shrink-0 rounded-2xl border border-white/10 p-3 ${TIER_BG[b.tier]}`}
                  style={{ minWidth: 130 }}
                >
                  <p className="text-3xl">{b.emoji}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-100">
                    {b.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {e.member?.name ?? "?"}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 space-y-10">
        {visibleMembers.map((mid) => {
          const m = members.find((x) => x.id === mid);
          if (!m) return null;
          const earnedSet = earnedByMember.get(mid) ?? new Set<string>();
          const earnedCount = earnedSet.size;
          return (
            <div key={mid}>
              <div className="flex items-center gap-3">
                <Avatar name={m.name} emoji={m.avatar_emoji} size={44} />
                <div>
                  <p className="font-display text-2xl font-bold text-slate-50">
                    {m.name}&apos;s shelf
                  </p>
                  <p className="text-xs text-slate-400">
                    {earnedCount} / {catalog.length} earned
                  </p>
                </div>
              </div>

              <ul className="mt-5 grid grid-cols-3 gap-3">
                {catalog.map((b) => {
                  const has = earnedSet.has(b.code);
                  return (
                    <li
                      key={b.code}
                      className={`rounded-2xl border p-3 text-center transition ${
                        has
                          ? `border-white/15 ${TIER_BG[b.tier]} ring-2 ${TIER_RING[b.tier]}`
                          : "border-white/5 bg-white/[0.02] opacity-40 grayscale"
                      }`}
                      title={b.description}
                    >
                      <p className="text-3xl">{has ? b.emoji : "🔒"}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-100">
                        {b.name}
                      </p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500">
                        {b.tier}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </main>
  );
}
