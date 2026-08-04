import type { ListingCandidate, Preferences } from "./domain";

export interface PrefilterResult {
  shouldEvaluate: boolean;
  reason: string | null;
}

export function prefilterCandidate(candidate: ListingCandidate, preferences: Preferences): PrefilterResult {
  if (candidate.price !== null && candidate.price > preferences.maximumMonthlyRent) {
    return {
      shouldEvaluate: false,
      reason: `Rent $${candidate.price} exceeds the configured maximum of $${preferences.maximumMonthlyRent}.`
    };
  }
  return { shouldEvaluate: true, reason: null };
}
