"use client";

import { useState } from "react";

/**
 * Share an invite link via the native share sheet (mobile) or clipboard
 * (desktop). Pure progressive enhancement — the 6-letter code next to it
 * always works read-aloud.
 */
export function ShareInviteButton({
  url,
  familyName,
}: {
  url: string;
  familyName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Join ${familyName} on HYETAS — tap the link and you're in:`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "HYETAS invite", text, url });
        return;
      } catch {
        // user closed the share sheet — that's fine, do nothing
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-400/20"
    >
      {copied ? "✓ Link copied" : "📤 Share link"}
    </button>
  );
}
