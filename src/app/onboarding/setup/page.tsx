// Creator wizard — runs once, right after "Create family", before invites.
// Personalizes the app: what's heavy in THIS house, which features they'll
// use (drives the nav), and optional starter chores/recipes so nothing is
// blank on day one. Every step is skippable; skipping keeps everything on.

import { redirect } from "next/navigation";
import { Mascot } from "@/components/brand/Mascot";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { resolveFeatures } from "@/lib/hyetas/features";
import { PAIN_OPTIONS, STARTER_CHORES } from "@/lib/hyetas/starterPacks";
import { StarterRecipePicker } from "@/components/onboarding/StarterRecipePicker";
import { saveSituation, saveFeatures, seedChores, seedRecipes, skipToInvite } from "./actions";

export const dynamic = "force-dynamic";

type Step = "situation" | "features" | "chores" | "recipes";

const FEATURE_CARDS: {
  key: string;
  emoji: string;
  title: string;
  blurb: string;
  defaultOn: boolean;
}[] = [
  {
    key: "chores",
    emoji: "🧹",
    title: "Chores & Tonight",
    blurb:
      "Tonight's jobs land on each person's screen — the app does the asking, not you.",
    defaultOn: true,
  },
  {
    key: "meals",
    emoji: "🍝",
    title: "Meals & recipes",
    blurb:
      "Plan the week's breakfasts, lunches and dinners from your own recipe box.",
    defaultOn: true,
  },
  {
    key: "grocery",
    emoji: "🛒",
    title: "Grocery list",
    blurb:
      "The week's meals become one consolidated shopping list, sorted by aisle.",
    defaultOn: true,
  },
  {
    key: "money",
    emoji: "💰",
    title: "Kid money",
    blurb:
      "Chores can pay. Earnings, savings goals, streaks and badges — no arguments.",
    defaultOn: true,
  },
  {
    key: "shifts",
    emoji: "🌙",
    title: "Shift roster",
    blurb:
      "Someone work shifts? Tonight tells the family who's on and who's sleeping.",
    defaultOn: false,
  },
];

function StepDots({ steps, current }: { steps: Step[]; current: Step }) {
  return (
    <div className="mt-1 flex items-center gap-1.5" aria-hidden>
      {steps.map((s) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            s === current
              ? "w-6 bg-amber-300"
              : steps.indexOf(s) < steps.indexOf(current)
                ? "w-1.5 bg-amber-300/60"
                : "w-1.5 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

export default async function SetupWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const { step: rawStep, error } = await searchParams;
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { member, household } = ctx!;
  if (member.role !== "parent") redirect("/");

  const features = resolveFeatures(household.features);
  const steps: Step[] = [
    "situation",
    "features",
    ...(features.chores ? (["chores"] as Step[]) : []),
    ...(features.meals ? (["recipes"] as Step[]) : []),
  ];
  const step: Step = (
    ["situation", "features", "chores", "recipes"] as Step[]
  ).includes(rawStep as Step)
    ? (rawStep as Step)
    : "situation";

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">
            Setting up {household.emoji} {household.name}
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            {step === "situation" && "Make it yours"}
            {step === "features" && "What will you actually use?"}
            {step === "chores" && "Starter chores"}
            {step === "recipes" && "Starter recipes"}
          </p>
          <StepDots steps={steps} current={step} />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {/* ---------------- Step 1: situation ---------------- */}
      {step === "situation" ? (
        <>
          <p className="mt-6 text-sm text-slate-300">
            A few quick questions, {member.name} — so the app fits your
            house, not ours.
          </p>
          <form action={saveSituation} className="mt-6 space-y-7">
            <fieldset>
              <legend className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                What&apos;s making the asking hard right now? (tap any)
              </legend>
              <div className="mt-3 space-y-2">
                {PAIN_OPTIONS.map((p) => (
                  <label
                    key={p.key}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/10"
                  >
                    <input
                      type="checkbox"
                      name="pains"
                      value={p.key}
                      className="mt-0.5 h-4 w-4 accent-amber-300"
                    />
                    <span>
                      <span className="mr-1.5">{p.emoji}</span>
                      {p.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                In your own words — what should this app take off your
                plate? (optional)
              </label>
              <textarea
                name="wish"
                rows={3}
                maxLength={500}
                placeholder="e.g. I want the kids to do their jobs without me chasing them every night…"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-300 focus:outline-none"
              />
            </fieldset>

            <fieldset>
              <label className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Any allergies or food needs in the house? (optional)
              </label>
              <textarea
                name="allergies"
                rows={3}
                maxLength={500}
                placeholder="e.g. Sam — peanuts (serious). Mia — vegetarian. No shellfish for anyone."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-300 focus:outline-none"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                This is health info, so the deal is: totally optional, used
                only to flag meals and groceries for your own family, and a
                grown-up can change or wipe it any time in You &amp; family.
                We flag — you still check labels.
              </p>
            </fieldset>

            <div className="flex items-center justify-between gap-3 pt-1">
              <a
                href="/onboarding/setup?step=features"
                className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                Skip →
              </a>
              <button
                type="submit"
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
              >
                Next →
              </button>
            </div>
          </form>
        </>
      ) : null}

      {/* ---------------- Step 2: features ---------------- */}
      {step === "features" ? (
        <>
          <p className="mt-6 text-sm text-slate-300">
            Tick what your family will use — only those show up in the app.
            Pick at least one; most families start with three or more. You
            can change this any time from You &amp; family.
          </p>
          <form action={saveFeatures} className="mt-6 space-y-7">
            <div className="space-y-2">
              {FEATURE_CARDS.map((f) => (
                <label
                  key={f.key}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/10"
                >
                  <input
                    type="checkbox"
                    name="features"
                    value={f.key}
                    defaultChecked={f.defaultOn}
                    className="mt-1 h-4 w-4 accent-amber-300"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">
                      {f.emoji} {f.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                      {f.blurb}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                formAction={skipToInvite}
                formNoValidate
                className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                Skip — keep everything on →
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
              >
                Next →
              </button>
            </div>
          </form>
        </>
      ) : null}

      {/* ---------------- Step 3: starter chores ---------------- */}
      {step === "chores" ? (
        <>
          <p className="mt-6 text-sm text-slate-300">
            Tick the jobs that actually exist in your house and we&apos;ll
            set them up. They start unassigned — point them at people later
            from the Chores tab. Or add nothing and start clean.
          </p>
          <form action={seedChores} className="mt-6 space-y-7">
            <div className="space-y-2">
              {STARTER_CHORES.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/10"
                >
                  <input
                    type="checkbox"
                    name="starter_chores"
                    value={c.key}
                    defaultChecked={c.suggested}
                    className="h-4 w-4 accent-emerald-300"
                  />
                  <span className="flex-1 text-sm text-slate-200">
                    <span className="mr-1.5">{c.emoji}</span>
                    {c.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    {c.cadence === "Weekly" || c.cadence === "Fortnightly"
                      ? `${c.cadence} · ${c.day_hint}`
                      : c.cadence}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="submit"
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
              >
                Add ticked chores →
              </button>
            </div>
          </form>
          <form action={seedChores} className="mt-3 text-left">
            <button
              type="submit"
              className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
            >
              Skip — add nothing →
            </button>
          </form>
        </>
      ) : null}

      {/* ---------------- Step 4: starter recipes ---------------- */}
      {step === "recipes" ? (
        <>
          <p className="mt-6 text-sm text-slate-300">
            Tick what your family would actually eat — every recipe carries
            its own shopping list. Use{" "}
            <span className="text-slate-100">More</span> to flip through
            other cuisines; your ticks are kept as you go.
          </p>
          <StarterRecipePicker action={seedRecipes} />
          <form action={seedRecipes} className="mt-3 text-left">
            <button
              type="submit"
              className="text-xs uppercase tracking-wider text-slate-500 hover:text-slate-300"
            >
              Skip — add nothing →
            </button>
          </form>
        </>
      ) : null}
    </main>
  );
}
