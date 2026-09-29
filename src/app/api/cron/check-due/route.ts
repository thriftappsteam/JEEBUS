import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pushToMember, type PushPayload } from "@/lib/push/send";
import { resolvePlanPrefs } from "@/lib/hyetas/planPrefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DueRow = {
  assignment_id: string;
  member_id: string | null;
  member_name: string;
  chore_name: string;
  due_at: string;
};

/**
 * Vercel cron handler. Runs every 5 minutes (see vercel.json).
 * Finds assignments due within the last hour that we haven't nudged for,
 * sends a web push to the assignee, and logs the nudge.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const got = request.headers.get("authorization");
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supabase = await createClient();

  // Make sure today's chores have been generated. Cheap, idempotent.
  await supabase.rpc("generate_assignments_for_today");

  // Find pending assignments due in the last hour that haven't been nudged.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const until = new Date(Date.now() + 60 * 1000).toISOString();

  const { data: rows, error } = await supabase.rpc("due_assignments_for_nudge", {
    p_since: since,
    p_until: until,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (rows as DueRow[] | null) ?? [];
  let pushed = 0;
  let skipped = 0;
  let cleanedUp = 0;
  let silenced = 0;

  for (const row of due) {
    if (!row.member_id) {
      skipped += 1;
      continue;
    }

    // Sleep guard: if the recipient is currently in their post-shift
    // sleep window, render the notification but skip sound + vibration.
    const { data: sleepingRaw } = await supabase.rpc(
      "is_member_sleeping_now",
      { p_member_id: row.member_id },
    );
    const silent = sleepingRaw === true;
    if (silent) silenced += 1;

    const payload: PushPayload = {
      title: `🌙 Tonight · ${row.chore_name}`,
      body: `Hey ${row.member_name}, time to do it. Tap to mark done.`,
      url: "/",
      tag: `chore-${row.assignment_id}`,
      silent,
    };
    const result = await pushToMember(row.member_id, payload);
    pushed += result.sent;
    cleanedUp += result.removed;

    await supabase.from("nudges").insert({
      member_id: row.member_id,
      assignment_id: row.assignment_id,
      channel: silent ? "web-push-silent" : "web-push",
    });
  }

  // ---- Dinner call: "Tonight: X" to the whole house at plan_prefs.push_time.
  // Idempotent per day via meal_plan_days.plan_meta.dinner_call_sent_at.
  let dinnerCalls = 0;
  try {
    dinnerCalls = await sendDinnerCalls();
  } catch (e) {
    console.error("dinner call failed", e);
  }

  return NextResponse.json({
    checked: due.length,
    pushed,
    silenced,
    skipped_family: skipped,
    cleaned_up_dead_subscriptions: cleanedUp,
    dinner_calls: dinnerCalls,
  });
}

async function sendDinnerCalls(): Promise<number> {
  const supabase = await createClient();
  const { data: hhs } = await supabase
    .from("households")
    .select("id, timezone, plan_prefs")
    .not("plan_prefs", "is", null);
  let sent = 0;
  for (const hh of (hhs as { id: string; timezone: string | null; plan_prefs: unknown }[] | null) ?? []) {
    const prefs = resolvePlanPrefs(hh.plan_prefs);
    if (!prefs.setup_completed_at) continue;
    const tz = hh.timezone || "Australia/Melbourne";
    const now = new Date();
    const localHM = now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
    const localDate = now.toLocaleDateString("en-CA", { timeZone: tz });
    // Fire in the 10-minute window after push_time (cron runs every 5).
    const [ph, pm] = prefs.push_time.split(":").map(Number);
    const [lh, lm] = localHM.split(":").map(Number);
    const delta = lh * 60 + lm - (ph * 60 + pm);
    if (delta < 0 || delta > 10) continue;

    const { data: day } = await supabase
      .from("meal_plan_days")
      .select("id, eating_at_home, plan_meta, dinner:recipes!dinner_recipe_id(name)")
      .eq("household_id", hh.id)
      .eq("day_date", localDate)
      .maybeSingle();
    const row = day as unknown as {
      id: string;
      eating_at_home: boolean;
      plan_meta: Record<string, unknown> | null;
      dinner: { name: string } | null;
    } | null;
    if (!row) continue;
    if (row.plan_meta?.dinner_call_sent_at) continue;
    const text = !row.eating_at_home
      ? "we're eating out"
      : row.dinner
        ? row.dinner.name
        : null;
    if (!text) continue;

    const { data: members } = await supabase
      .from("members")
      .select("id")
      .eq("household_id", hh.id);
    for (const m of (members as { id: string }[] | null) ?? []) {
      const r = await pushToMember(m.id, {
        title: `🍽️ Tonight: ${text}`,
        body: "Tap to see the week and who's on table.",
        url: "/plan",
        tag: `dinner-${localDate}`,
      });
      sent += r.sent;
    }
    await supabase
      .from("meal_plan_days")
      .update({ plan_meta: { ...(row.plan_meta ?? {}), dinner_call_sent_at: now.toISOString() } })
      .eq("id", row.id);
  }
  return sent;
}
