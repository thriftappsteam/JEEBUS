import { memberStyle } from "@/lib/brand/memberStyle";

type Props = {
  name: string;
  size?: number;
  emoji?: string | null;
  className?: string;
};

/**
 * Circular avatar.
 * - If `emoji` is provided (e.g. 🦊), shows the emoji on the colour wash.
 * - Otherwise falls back to the member's initial.
 * Colour comes from memberStyle(name) so siblings stay visually distinct.
 */
export function Avatar({ name, size = 56, emoji, className = "" }: Props) {
  const { bg, ring, fg } = memberStyle(name);
  const initial = (name?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display font-bold ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        boxShadow: `inset 0 0 0 3px ${ring}`,
        fontSize: size * (emoji ? 0.6 : 0.5),
        lineHeight: 1,
      }}
      aria-label={name}
    >
      {emoji ?? initial}
    </span>
  );
}
