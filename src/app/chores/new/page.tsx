import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import { Header } from "@/components/brand/Header";
import { ChoreForm } from "@/components/chores/ChoreForm";

export const dynamic = "force-dynamic";

export default async function NewChorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const me = await getCurrentMember();
  if (!me) redirect("/");
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("household_id", me!.household_id)
    .order("role")
    .order("name");

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-8">
      <Header subtitle="Add a new chore to the rotation" />

      <Link
        href="/chores"
        className="mt-4 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-300"
      >
        ← All chores
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-50">
        New chore
      </h1>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <ChoreForm members={members ?? []} mode="new" />
    </main>
  );
}
