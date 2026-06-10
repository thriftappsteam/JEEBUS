/**
 * Per-household feature flags, chosen in the creator wizard.
 *
 * Stored as `households.features` jsonb. NULL (or any missing key) means
 * "on" — so legacy households (McTonkin) and wizard-skippers get the whole
 * app, exactly as before flags existed.
 */

export type FeatureKey = "chores" | "meals" | "grocery" | "money" | "shifts";

export type Features = Record<FeatureKey, boolean>;

export const FEATURE_KEYS: FeatureKey[] = [
  "chores",
  "meals",
  "grocery",
  "money",
  "shifts",
];

export const ALL_FEATURES_ON: Features = {
  chores: true,
  meals: true,
  grocery: true,
  money: true,
  shifts: true,
};

/** Turn a raw jsonb value into a complete Features object. Missing = on. */
export function resolveFeatures(raw: unknown): Features {
  if (!raw || typeof raw !== "object") return { ...ALL_FEATURES_ON };
  const obj = raw as Record<string, unknown>;
  const out = { ...ALL_FEATURES_ON };
  for (const key of FEATURE_KEYS) {
    if (typeof obj[key] === "boolean") out[key] = obj[key] as boolean;
  }
  return out;
}
