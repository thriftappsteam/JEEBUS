import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** "Switch user" — clears the active member cookie and bounces home to the
 *  family picker. Before clearing, make sure the device keeps its household
 *  link (older devices from the pre-household-cookie era get it backfilled
 *  here, so switching never strands the family on the public welcome page). */
export async function POST(request: NextRequest) {
  const c = await cookies();

  const memberId = c.get("hyetas_member_id")?.value ?? null;
  const hasHouseholdLink = Boolean(c.get("hyetas_household_id")?.value);

  if (memberId && !hasHouseholdLink) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("household_id")
      .eq("id", memberId)
      .maybeSingle();
    const householdId = (data?.household_id as string | undefined) ?? null;
    if (householdId) {
      c.set("hyetas_household_id", householdId, {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
  }

  c.delete("hyetas_member_id");
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

// (touched to sync the build sandbox — harmless, delete any time)
