"use client";

// "Put HYETAS on your home screen" — shown on Tonight only, for signed-in
// people who haven't installed the app. Android/Chrome gets the real
// install prompt; iOS Safari gets the Share → Add to Home Screen recipe.
// Dismissing snoozes it for 14 days (localStorage).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const DISMISS_KEY = "hyetas_install_dismissed_at";
const SNOOZE_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    // iOS Safari's non-standard flag
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPad13Plus =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPad13Plus;
}

function snoozed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const ms = Date.now() - Number(at);
    return ms < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || snoozed()) return;

    // Chrome/Edge/Android fire this when the app is installable.
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // iOS never fires beforeinstallprompt — show instructions instead.
    if (isIos()) setMode("ios");

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  // Tonight only — keep every other page clean.
  if (pathname !== "/" || mode === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private browsing — fine, it'll just show again
    }
    setMode("hidden");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setMode("hidden");
    else dismiss();
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md rounded-3xl border border-amber-300/30 bg-[#0e1628]/95 p-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.8)] backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            📱
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-100">
              Put HYETAS on your home screen
            </p>
            {mode === "android" ? (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                One tap to open, full screen, feels like a real app.
              </p>
            ) : (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                In Safari: tap <span className="text-slate-200">Share</span>{" "}
                <span aria-hidden>⎋</span> then{" "}
                <span className="text-slate-200">
                  “Add to Home Screen”
                </span>{" "}
                <span aria-hidden>➕</span>. That&apos;s it.
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              {mode === "android" ? (
                <button
                  onClick={install}
                  className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-amber-200"
                >
                  Install
                </button>
              ) : null}
              <button
                onClick={dismiss}
                className="text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                {mode === "android" ? "Not now" : "Got it"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
