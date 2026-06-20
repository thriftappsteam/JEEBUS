"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Cadence = "Daily" | "Weekly" | "Fortnightly" | "Monthly" | "OnDemand";
type DayHint = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | "Anytime";

function buildRecurrenceRule(cadence: Cadence, dayHint: DayHint): string | null {
  const dayMap: Record<string, string> = {
    Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR", Sat: "SA", Sun: "SU",
  };
  const byday = dayMap[dayHint];
  switch (cadence) {
    case "Daily":
      return "FREQ=DAILY";
    case "Weekly":
      return byday ? `FREQ=WEEKLY;BYDAY=${byday}` : "FREQ=WEEKLY";
    case "Fortnightly":
      return byday
        ? `FREQ=WEEKLY;INTERVAL=2;BYDAY=${byday}`
        : "FREQ=WEEKLY;INTERVAL=2";
    case "Monthly":
      return byday ? `FREQ=MONTHLY;BYDAY=${byday}` : "FREQ=MONTHLY";
    case "OnDemand":
      // As-needed chores have no recurrence — the generator skips them.
      // Lisa decides when each one is due via the "Mark as due" flow.
      return null;
    default:
      return "FREQ=DAILY";
  }
}

async function getHouseholdId(): Promise<string | null> {
  // Derive from the signed-in member, ONLY. (The old "fall back to first
  // household" guess is unsafe now multiple families share the DB.)
  const { getCurrentMember } = await import("@/lib/hyetas/whoami");
  const me = await getCurrentMember();
  return me?.household_id ?? null;
}

function readForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "Weekly") as Cadence;
  // OnDemand chores have no day-of-week — they only fire when Lisa marks one due.
  const dayHintRaw = String(formData.get("day_hint") ?? "Anytime") as DayHint;
  const dayHint: DayHint = cadence === "OnDemand" ? "Anytime" : dayHintRaw;
  const assigneeRaw = String(formData.get("default_assignee") ?? "");
  const default_assignee = assigneeRaw === "FAMILY" || !assigneeRaw ? null : assigneeRaw;
  const paysRaw = String(formData.get("pays_aud") ?? "").trim();
  const pays_aud = paysRaw ? parseFloat(paysRaw) : null;
  const paidByRaw = String(formData.get("paid_by_member_id") ?? "");
  const paid_by_member_id = paidByRaw && pays_aud && pays_aud > 0 ? paidByRaw : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "on";
  const dueTimeRaw = String(formData.get("due_time") ?? "").trim();
  // HTML input[type=time] returns "HH:MM"; Postgres TIME accepts that.
  // Empty string -> null so the generator falls back to its 18:00 default.
  const due_time = /^\d{2}:\d{2}$/.test(dueTimeRaw) ? dueTimeRaw : null;
  return {
    name,
    cadence,
    dayHint,
    default_assignee,
    pays_aud,
    paid_by_member_id,
    notes,
    is_active,
    due_time,
  };
}

export async function addChore(formData: FormData) {
  const data = readForm(formData);
  if (!data.name) redirect("/chores/new?error=Name+is+required");

  const supabase = await createClient();
  const householdId = await getHouseholdId();
  if (!householdId) redirect("/chores?error=Household+not+found");

  const { error } = await supabase.from("chores").insert({
    household_id: householdId,
    name: data.name,
    default_assignee: data.default_assignee,
    recurrence_rule: buildRecurrenceRule(data.cadence, data.dayHint),
    cadence: data.cadence,
    day_hint: data.cadence === "OnDemand" ? null : data.dayHint,
    notes: data.notes,
    pays_aud: data.pays_aud,
    paid_by_member_id: data.paid_by_member_id,
    is_active: data.is_active,
    due_time: data.due_time,
    points: 1,
  });

  if (error) redirect(`/chores/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/chores");
  revalidatePath("/");
  redirect("/chores?added=1");
}

export async function updateChore(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/chores?error=Missing+chore+id");

  const data = readForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("chores")
    .update({
      name: data.name,
      default_assignee: data.default_assignee,
      recurrence_rule: buildRecurrenceRule(data.cadence, data.dayHint),
      cadence: data.cadence,
      day_hint: data.cadence === "OnDemand" ? null : data.dayHint,
      notes: data.notes,
      pays_aud: data.pays_aud,
      paid_by_member_id: data.paid_by_member_id,
      is_active: data.is_active,
      due_time: data.due_time,
    })
    .eq("id", id);

  if (error)
    redirect(`/chores/${id}?error=${encodeURIComponent(error.message)}`);

  // Re-point any open pending assignments to the new owner so today doesn't
  // get stranded on the old person (matches what we did manually for Andrew).
  await supabase
    .from("assignments")
    .update({ member_id: data.default_assignee })
    .eq("chore_id", id)
    .eq("status", "pending");

  // Re-stamp pending assignments to the new reminder time (or 6pm default).
  // Without this, changing due_time only takes effect for future generations.
  await supabase.rpc("apply_chore_time_change", { p_chore_id: id });

  revalidatePath("/chores");
  revalidatePath("/");
  redirect("/chores?saved=1");
}

/**
 * Mark an on-demand chore as due on a specific date for a specific person.
 * Inserts a single pending assignment — the chore stays OnDemand.
 * Used from /chores/[id]/schedule when Lisa decides "the lawn needs mowing this Saturday".
 */
export async function markChoreDue(formData: FormData) {
  const choreId = String(formData.get("chore_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? ""); // "YYYY-MM-DD"
  const assigneeRaw = String(formData.get("member_id") ?? "");
  const member_id = assigneeRaw === "FAMILY" || !assigneeRaw ? null : assigneeRaw;
  const dueTimeRaw = String(formData.get("due_time") ?? "").trim();
  const due_time = /^\d{2}:\d{2}$/.test(dueTimeRaw) ? `${dueTimeRaw}:00` : "18:00:00";

  if (!choreId) redirect("/chores?error=Missing+chore+id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
    redirect(`/chores/${choreId}/schedule?error=Pick+a+date`);

  const supabase = await createClient();

  // Build a Melbourne-local timestamptz so the reminder fires on the right wall-clock time.
  const dueAtIso = `${dueDate} ${due_time} Australia/Melbourne`;

  const { error } = await supabase.from("assignments").insert({
    chore_id: choreId,
    member_id,
    due_at: dueAtIso,
    status: "pending",
  });

  if (error)
    redirect(`/chores/${choreId}/schedule?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/chores");
  revalidatePath("/");
  redirect("/chores?scheduled=1");
}

export async function removeChore(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("chores").update({ is_active: false }).eq("id", id);
  revalidatePath("/chores");
  revalidatePath("/");
  redirect("/chores?removed=1");
}
