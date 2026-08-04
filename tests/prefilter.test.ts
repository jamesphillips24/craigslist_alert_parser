import { describe, expect, it } from "vitest";
import examplePreferences from "../config/preferences.example.json";
import type { ListingCandidate } from "../src/domain";
import { prefilterCandidate } from "../src/prefilter";

const candidate: ListingCandidate = {
  key: "123",
  listingId: "123",
  url: "https://example.test/123",
  title: "Apartment",
  snippet: "Apartment",
  price: 3400,
  bedrooms: "1 bedroom",
  sourceEmailId: "email-1",
  sourceReceivedAt: "2026-08-03T12:00:00.000Z"
};

describe("prefilterCandidate", () => {
  it("keeps listings at or under budget", () => {
    expect(prefilterCandidate(candidate, examplePreferences)).toEqual({ shouldEvaluate: true, reason: null });
  });

  it("rejects listings over budget before an LLM call", () => {
    expect(prefilterCandidate({ ...candidate, price: 3600 }, examplePreferences).shouldEvaluate).toBe(false);
  });
});
