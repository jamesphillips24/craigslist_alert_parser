export type Verdict = "alert" | "digest" | "ignore";
export type Confidence = "high" | "medium" | "low";
export type ScamRisk = "high" | "medium" | "low";

export interface Preferences {
  profileSummary: string;
  maximumMonthlyRent: number;
  bedroomTypes: string[];
  highestPriorityLocations: string[];
  acceptableLocations: string[];
  locationsToAvoid: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  commutePreferences: string;
  scamSignals: string[];
  alertScoreThreshold: number;
  digestScoreThreshold: number;
}

export interface AlertEmail {
  id: string;
  subject: string;
  sender: string;
  receivedAt: Date;
  plainBody: string;
  htmlBody: string;
}

export interface ListingCandidate {
  key: string;
  listingId: string | null;
  url: string | null;
  title: string;
  snippet: string;
  price: number | null;
  bedrooms: string | null;
  sourceEmailId: string;
  sourceReceivedAt: string;
}

export interface ListingEvaluation {
  score: number;
  recommendation: Verdict;
  confidence: Confidence;
  summary: string;
  reasons: string[];
  concerns: string[];
  scamRisk: ScamRisk;
  missingInformation: string[];
}

export interface OpenAiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvaluatedListing {
  candidate: ListingCandidate;
  evaluation: ListingEvaluation;
  usage: OpenAiUsage;
  evaluatedAt: string;
}
