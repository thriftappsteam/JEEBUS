import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import { Header } from "@/components/brand/Header";
import { ChoreForm, type ChoreFormValues } from "@/components/chores/ChoreForm";

export const dynamic = "force-dynamic";

export default async function EditChorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const me = await getCurrentMember();
  if (!me) redirect("/");
  const supabase = await createClient();

  const [{ data: chore }, { data: members }] = await Promise.all([
    supabase
      .from("chores")
      .select(
        "id, name, cadence, day_hint, default_assignee, pays_aud, paid_by_member_id, notes, is_active, due_time",
      )
      .eq("id", id)
      .eq("household_id", me!.household_id)
      .maybeSingle(),
    supabase
      .from("members")
      .select("id, name, role")
      .eq("household_id", me!.household_id)
      .order("role")
      .order("name"),
  ]);

  if (!chore) notFound();

  const initial: ChoreFormValues = {
    id: chore.id,
    name: chore.name,
    cadence: chore.cadence,
    day_hint: chore.day_hint,
    default_assignee: chore.default_assignee,
    pays_aud: chore.pays_aud,
    paid_by_member_id: chore.paid_by_member_id,
    notes: chore.notes,
    is_active: chore.is_active,
    due_time: chore.due_time,
  };

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Edit chore" />

      <Link
        href="/chores"
        className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
      >
        ← All chores
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        {chore.name}
      </h1>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <ChoreForm members={members ?? []} initial={initial} mode="edit" />
    </main>
  );
}
