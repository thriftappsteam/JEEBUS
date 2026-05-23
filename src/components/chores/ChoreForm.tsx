import { addChore, updateChore, removeChore } from "@/app/actions/chores";

type Member = { id: string; name: string; role: string };

export type ChoreFormValues = {
  id?: string;
  name?: string;
  cadence?: "Daily" | "Weekly" | "Fortnightly" | "Monthly" | "OnDemand";
  day_hint?:
    | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | "Anytime"
    | null;
  default_assignee?: string | null;
  pays_aud?: number | null;
  paid_by_member_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
  due_time?: string | null;
};

const CADENCES = ["Daily", "Weekly", "Fortnightly", "Monthly", "OnDemand"] as const;
const CADENCE_LABELS: Record<(typeof CADENCES)[number], string> = {
  Daily: "Daily",
  Weekly: "Weekly",
  Fortnightly: "Fortnightly",
  Monthly: "Monthly",
  OnDemand: "As needed (you decide when)",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Anytime"] as const;

export function ChoreForm({
  members,
  initial,
  mode,
}: {
  members: Member[];
  initial?: ChoreFormValues;
  mode: "new" | "edit";
}) {
  const action = mode === "new" ? addChore : updateChore;
  const v: ChoreFormValues = initial ?? {};
  const parents = members.filter((m) => m.role === "parent");

  return (
    <form action={action} className="mt-6 space-y-4">
      {mode === "edit" && v.id ? (
        <input type="hidden" name="id" value={v.id} />
      ) : null}

      <Field label="Chore name">
        <input
          name="name"
          required
          defaultValue={v.name ?? ""}
          placeholder="e.g. Take out recycling"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="How often">
          <select
            name="cadence"
            defaultValue={v.cadence ?? "Weekly"}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <select
            name="day_hint"
            defaultValue={v.day_hint ?? "Anytime"}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="-mt-2 text-[11px] text-slate-500">
        For <span className="text-slate-300">As needed</span> chores the day is ignored — you pick a date each time you want it done.
      </p>

      <Field label="Reminder time">
        <input
          name="due_time"
          type="time"
          defaultValue={v.due_time ? v.due_time.slice(0, 5) : ""}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          Leave blank for 6:00 PM. Phone notification fires within ±30 min of this time.
        </span>
      </Field>

      <Field label="Who does it?">
        <select
          name="default_assignee"
          defaultValue={v.default_assignee ?? "FAMILY"}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
        >
          <option value="FAMILY">Family (anyone)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pays (AUD, optional)">
          <input
            name="pays_aud"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={v.pays_aud != null ? String(v.pays_aud) : ""}
            placeholder="e.g. 5.00"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          />
        </Field>
        <Field label="Paid by">
          <select
            name="paid_by_member_id"
            defaultValue={v.paid_by_member_id ?? ""}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            <option value="">—</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes (instructions, tips)">
        <textarea
          name="notes"
          defaultValue={v.notes ?? ""}
          rows={3}
          placeholder="Anything the person needs to know to do it well"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
        />
      </Field>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={v.is_active ?? true}
          className="h-4 w-4 accent-amber-300"
        />
        <span className="text-sm text-slate-200">Active</span>
        <span className="ml-auto text-[11px] text-slate-500">
          Uncheck to hide from rotation without losing history
        </span>
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200"
      >
        {mode === "new" ? "Add chore" : "Save changes"}
      </button>

      {mode === "edit" && v.id ? (
        <RemoveButton id={v.id} name={v.name ?? "this chore"} />
      ) : null}
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function RemoveButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={removeChore} className="pt-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/15"
        aria-label={`Remove ${name}`}
      >
        Remove chore
      </button>
      <p className="mt-1.5 text-center text-[10px] text-slate-500">
        Keeps the history; just stops generating new assignments.
      </p>
    </form>
  );
}
