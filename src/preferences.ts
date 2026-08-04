import type { Preferences } from "./domain";

const stringArrayFields: Array<keyof Preferences> = [
  "bedroomTypes",
  "highestPriorityLocations",
  "acceptableLocations",
  "locationsToAvoid",
  "positiveSignals",
  "negativeSignals",
  "scamSignals"
];

export function parsePreferences(json: string): Preferences {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`PREFERENCES_JSON is not valid JSON: ${String(error)}`);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("PREFERENCES_JSON must be a JSON object.");
  }

  const preferences = value as Record<string, unknown>;
  requireString(preferences, "profileSummary");
  requireString(preferences, "commutePreferences");
  requireFiniteNumber(preferences, "maximumMonthlyRent");
  requireFiniteNumber(preferences, "alertScoreThreshold");
  requireFiniteNumber(preferences, "digestScoreThreshold");

  for (const field of stringArrayFields) {
    const item = preferences[field];
    if (!Array.isArray(item) || item.some((entry) => typeof entry !== "string")) {
      throw new Error(`${field} must be an array of strings.`);
    }
  }

  if ((preferences.digestScoreThreshold as number) >= (preferences.alertScoreThreshold as number)) {
    throw new Error("digestScoreThreshold must be lower than alertScoreThreshold.");
  }

  return value as Preferences;
}

function requireString(value: Record<string, unknown>, field: string): void {
  if (typeof value[field] !== "string" || !(value[field] as string).trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }
}

function requireFiniteNumber(value: Record<string, unknown>, field: string): void {
  if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
    throw new Error(`${field} must be a finite number.`);
  }
}
