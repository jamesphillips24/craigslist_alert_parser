import type { EvaluatedListing, OpenAiUsage } from "./domain";

// Script Property values are intentionally kept small. The recent-ID windows are
// enough for a search-alert workflow while remaining comfortably below one value's
// storage limit.
const MAX_PROCESSED_IDS = 350;
const MAX_DIGEST_ITEMS = 5;

interface MonthlyUsage {
  month: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  calls: number;
}

export class AppState {
  private readonly properties = PropertiesService.getScriptProperties();
  private processedEmailIds = this.readStringArray("PROCESSED_EMAIL_IDS");
  private processedListingKeys = this.readStringArray("PROCESSED_LISTING_KEYS");

  hasProcessedEmail(id: string): boolean {
    return this.processedEmailIds.includes(id);
  }

  hasProcessedListing(key: string): boolean {
    return this.processedListingKeys.includes(key);
  }

  markEmailProcessed(id: string): void {
    this.processedEmailIds = appendBounded(this.processedEmailIds, id, MAX_PROCESSED_IDS);
    this.properties.setProperty("PROCESSED_EMAIL_IDS", JSON.stringify(this.processedEmailIds));
  }

  markListingProcessed(key: string): void {
    this.processedListingKeys = appendBounded(this.processedListingKeys, key, MAX_PROCESSED_IDS);
    this.properties.setProperty("PROCESSED_LISTING_KEYS", JSON.stringify(this.processedListingKeys));
  }

  queueDigest(item: EvaluatedListing): void {
    const items = this.readJson<EvaluatedListing[]>("PENDING_DIGEST", []);
    items.push(compactForDigest(item));
    items.sort((left, right) => right.evaluation.score - left.evaluation.score);
    this.properties.setProperty("PENDING_DIGEST", JSON.stringify(items.slice(0, MAX_DIGEST_ITEMS)));
  }

  takeDigest(): EvaluatedListing[] {
    const items = this.readJson<EvaluatedListing[]>("PENDING_DIGEST", []);
    this.properties.deleteProperty("PENDING_DIGEST");
    return items;
  }

  restoreDigest(items: EvaluatedListing[]): void {
    if (items.length) this.properties.setProperty("PENDING_DIGEST", JSON.stringify(items.slice(0, MAX_DIGEST_ITEMS)));
  }

  recordUsage(usage: OpenAiUsage): void {
    const month = Utilities.formatDate(new Date(), "UTC", "yyyy-MM");
    const previous = this.readJson<MonthlyUsage>("MONTHLY_OPENAI_USAGE", {
      month,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      calls: 0
    });
    const current = previous.month === month ? previous : { month, inputTokens: 0, outputTokens: 0, totalTokens: 0, calls: 0 };
    current.inputTokens += usage.inputTokens;
    current.outputTokens += usage.outputTokens;
    current.totalTokens += usage.totalTokens;
    current.calls += 1;
    this.properties.setProperty("MONTHLY_OPENAI_USAGE", JSON.stringify(current));
  }

  private readStringArray(key: string): string[] {
    const value = this.readJson<unknown>(key, []);
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  }

  private readJson<T>(key: string, fallback: T): T {
    const value = this.properties.getProperty(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      console.warn(`Ignoring invalid state in ${key}.`);
      return fallback;
    }
  }
}

function compactForDigest(item: EvaluatedListing): EvaluatedListing {
  return {
    ...item,
    candidate: {
      ...item.candidate,
      title: item.candidate.title.slice(0, 180),
      snippet: ""
    },
    evaluation: {
      ...item.evaluation,
      summary: item.evaluation.summary.slice(0, 500),
      reasons: [],
      concerns: [],
      missingInformation: []
    }
  };
}

function appendBounded(values: string[], value: string, maximum: number): string[] {
  return [...values.filter((entry) => entry !== value), value].slice(-maximum);
}
