"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

const TEMPLATES = [
  { emoji: "🧱", name: "LEGO set",       amount: 80 },
  { emoji: "🎮", name: "Video game",     amount: 90 },
  { emoji: "🎧", name: "Headphones",     amount: 120 },
  { emoji: "👟", name: "Sneakers",       amount: 150 },
  { emoji: "📚", name: "Book series",    amount: 60 },
  { emoji: "🎨", name: "Art supplies",   amount: 40 },
  { emoji: "🪀", name: "A fun thing",    amount: 25 },
  { emoji: "💵", name: "Just pile cash", amount: 50 },
];

export async function createGoal(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member, household } = ctx!;

  const memberId = String(formData.get("member_id") ?? member.id);
  const customName = String(formData.get("custom_name") ?? "").trim();
  const tplIdx = Number(formData.get("template_idx") ?? 0);
  const tpl = TEMPLATES[tplIdx] ?? TEMPLATES[0];
  const name = customName || tpl.name;
  const emoji = customName ? "🎯" : tpl.emoji;
  const target = parseFloat(String(formData.get("target_amount") ?? tpl.amount));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!Number.isFinite(target) || target <= 0)
    redirect("/goals/new?error=Pick+a+target+amount");

  const supabase = await createClient();

  // Parents auto-approve their own goals. Kid-set goals wait for parent.
  const isParent = member.role === "parent";
  const { error } = await supabase.from("savings_goals").insert({
    household_id: household.id,
    member_id: memberId,
    name,
    emoji,
    target_amount: target,
    notes,
    status: "active",
    created_by_member_id: member.id,
    approved_by_member_id: isParent ? member.id : null,
    approved_at: isParent ? new Date().toISOString() : null,
  });
  if (error) redirect(`/goals/new?error=${encodeURIComponent(error.message)}`);

  // Update badges for the goal-owner (wishlist_maker, first_goal).
  await supabase.rpc("grant_badges_for_member", { p_member_id: memberId });

  revalidatePath("/goals");
  redirect("/goals?ok=created");
}

export async function approveGoal(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member } = ctx!;
  if (member.role !== "parent")
    redirect("/goals?error=Only+parents+can+approve");

  const id = String(formData.get("goal_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("savings_goals")
    .update({
      approved_at: new Date().toISOString(),
      approved_by_member_id: member.id,
    })
    .eq("id", id);
  revalidatePath("/goals");
  redirect("/goals?ok=approved");
}

export async function contributeToGoal(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const { member } = ctx!;

  const goalId = String(formData.get("goal_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const amount = parseFloat(String(formData.get("amount") ?? "0"));
  if (!goalId || !memberId)
    redirect("/goals?error=Missing+info");
  if (!Number.isFinite(amount) || amount <= 0)
    redirect("/goals?error=Pick+an+amount");

  const supabase = await createClient();

  // Insert the contribution row (no need to move money — we tag it).
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: goalId,
    member_id: memberId,
    amount,
    kind: "allocate",
  });
  if (error) redirect(`/goals?error=${encodeURIComponent(error.message)}`);

  // Check if goal is now reached → mark reached.
  const { data: g } = await supabase
    .from("savings_goals")
    .select(
      `id, target_amount, status,
       contributions:goal_contributions(amount)`,
    )
    .eq("id", goalId)
    .maybeSingle();
  if (g) {
    const saved = (g.contributions as { amount: number }[] | null)?.reduce(
      (s, c) => s + Number(c.amount),
      0,
    ) ?? 0;
    if (saved >= Number(g.target_amount) && g.status === "active") {
      await supabase
        .from("savings_goals")
        .update({ status: "reached", reached_at: new Date().toISOString() })
        .eq("id", goalId);
    }
  }

  // Badge sweep — saver, first_goal, goal_reached, three_goals.
  await supabase.rpc("grant_badges_for_member", { p_member_id: memberId });

  // Also grant the actor's badges if a parent is contributing.
  if (member.id !== memberId) {
    await supabase.rpc("grant_badges_for_member", { p_member_id: member.id });
  }

  revalidatePath("/goals");
  revalidatePath("/money");
  redirect("/goals?ok=added");
}

export async function archiveGoal(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  const id = String(formData.get("goal_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("savings_goals")
    .update({ status: "archived" })
    .eq("id", id);
  revalidatePath("/goals");
  redirect("/goals?ok=archived");
}
