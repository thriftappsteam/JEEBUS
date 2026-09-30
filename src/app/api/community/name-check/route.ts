import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberId } from "@/lib/hyetas/whoami";

export const dynamic = "force-dynamic";

/**
 * Live "is this dish name taken?" check for the Make-it-my-way editor.
 * Signed-in members only (the catalogue is app-wide, not public web).
 */
export async function GET(req: Request) {
  const memberId = await getCurrentMemberId();
  if (!memberId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ exact: null, similar: [] });
  const supabase = await createClient();
  const { data: exact } = await supabase
    .from("community_dishes")
    .select("id, name")
    .ilike("name", q)
    .maybeSingle();
  const words = q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !["with", "and", "the", "style", "easy", "quick"].includes(w));
  let similar: { id: string; name: string }[] = [];
  if (words.length) {
    const { data } = await supabase
      .from("community_dishes")
      .select("id, name")
      .or(words.map((w) => `name.ilike.%${w.replace(/[%_,]/g, "")}%`).join(","))
      .limit(5);
    similar = ((data as { id: string; name: string }[] | null) ?? []).filter((d) => d.id !== exact?.id);
  }
  return NextResponse.json({ exact: exact ?? null, similar });
}
