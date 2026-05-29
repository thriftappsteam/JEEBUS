"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
};

const stroke = (active: boolean) => (active ? "#0b1220" : "#cbd5e1");
const fill = (active: boolean) => (active ? "#fde68a" : "none");

const TABS: Tab[] = [
  {
    href: "/",
    label: "Tonight",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill={fill(active)}
        />
      </svg>
    ),
  },
  {
    href: "/chores",
    label: "Chores",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M5 14l3-9h2l3 9-2 6H7Z"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill={fill(active)}
        />
        <path
          d="M14 12l4-2 3 6-3 4-4-2"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/meals",
    label: "Meals",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M5 3v8a3 3 0 0 0 3 3v7M8 3v8M11 3v8M17 3c-1.7 1-3 3-3 5s1.3 4 3 5v8"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/grocery",
    label: "Grocery",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.5L21 7H6"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={fill(active)}
        />
        <circle cx="9.5" cy="20" r="1.6" stroke={stroke(active)} strokeWidth="2.2" fill={active ? "#0b1220" : "none"} />
        <circle cx="17.5" cy="20" r="1.6" stroke={stroke(active)} strokeWidth="2.2" fill={active ? "#0b1220" : "none"} />
      </svg>
    ),
  },
  {
    href: "/money",
    label: "Money",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
          stroke={stroke(active)}
          strokeWidth="2.2"
          fill={fill(active)}
        />
        <circle
          cx="12"
          cy="12"
          r="2.5"
          stroke={stroke(active)}
          strokeWidth="2.2"
          fill={active ? "#0b1220" : "none"}
        />
        <path
          d="M6 9h.01M18 15h.01"
          stroke={stroke(active)}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: (active) => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
        <path
          d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v17.5a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 20.5Z"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinejoin="round"
          fill={fill(active)}
        />
        <path
          d="M9 8h6M9 12h6M9 16h4"
          stroke={stroke(active)}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-300/10 bg-[#0b1220] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.6)]"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6 gap-0.5 px-1 pt-2 pb-2">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? pathname === "/"
              : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href} className="flex">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-2 text-[9px] font-semibold uppercase tracking-[0.06em] transition ${
                  active
                    ? "bg-amber-300 text-slate-950 shadow-[0_6px_16px_-4px_rgba(251,191,36,0.55)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t.icon(active)}
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
