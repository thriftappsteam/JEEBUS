// Kid/teen profile quiz — favourite foods + money mascot. Playful.
// Adults skip this; they're just routed to /.

import { redirect } from "next/navigation";
import { Mascot } from "@/components/brand/Mascot";
import { getCurrentMember } from "@/lib/hyetas/whoami";
import { Avatar } from "@/components/brand/Avatar";
import { saveProfile } from "./actions";

export const dynamic = "force-dynamic";

const FOOD_OPTIONS = [
  "🍕 Pizza",
  "🌮 Tacos",
  "🍔 Burgers",
  "🍝 Pasta",
  "🥩 Steak",
  "🍣 Sushi",
  "🥞 Pancakes",
  "🥓 Bacon",
  "🍗 Roast chicken",
  "🍤 Prawns",
  "🍲 Stew",
  "🍛 Curry",
  "🥗 Salad",
  "🥪 Sandwiches",
  "🌭 Sausages",
  "🍳 Eggs",
  "🥑 Avocado",
  "🧀 Cheese",
  "🍠 Sweet potato",
  "🥦 Greens",
];

const MONEY_MASCOTS = [
  { code: "dragon", emoji: "🐉", lbl: "Dragon" },
  { code: "panda", emoji: "🐼", lbl: "Panda" },
  { code: "unicorn", emoji: "🦄", lbl: "Unicorn" },
  { code: "robot", emoji: "🤖", lbl: "Robot" },
  { code: "ghost", emoji: "👻", lbl: "Ghost" },
  { code: "alien", emoji: "👽", lbl: "Alien" },
  { code: "wizard", emoji: "🧙", lbl: "Wizard" },
  { code: "lobster", emoji: "🦞", lbl: "Lobster" },
];

export default async function ProfileQuizPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-md px-6 pt-10 pb-12">
      <div className="flex items-center gap-3">
        <Mascot size={56} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
            Welcome in, {me.name}
          </p>
          <p className="font-display text-2xl font-bold text-slate-50">
            Two quick questions
          </p>
        </div>
        <div className="ml-auto">
          <Avatar
            name={me.name}
            emoji={me.avatar_emoji}
            size={48}
          />
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-300">
        Pick a few foods you actually like — meal plans get smarter when
        we know. Then pick a money mascot to live on your earnings page.
      </p>

      <form action={saveProfile} className="mt-8 space-y-8">
        <fieldset>
          <legend className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            What do you love to eat? (tap as many as you like)
          </legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {FOOD_OPTIONS.map((f) => (
              <label
                key={f}
                className="flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 transition has-[:checked]:border-emerald-300 has-[:checked]:bg-emerald-300/15"
              >
                <input
                  type="checkbox"
                  name="favourite_foods"
                  value={f}
                  className="h-4 w-4 accent-emerald-300"
                />
                {f}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Pick your money mascot
          </legend>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {MONEY_MASCOTS.map((m, i) => (
              <label
                key={m.code}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-xs text-slate-300 transition has-[:checked]:border-amber-300 has-[:checked]:bg-amber-300/15 has-[:checked]:text-amber-100"
              >
                <input
                  type="radio"
                  name="money_mascot"
                  value={m.code}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <span className="text-3xl">{m.emoji}</span>
                <span>{m.lbl}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
          >
            Save & jump in →
          </button>
        </div>
      </form>
    </main>
  );
}
