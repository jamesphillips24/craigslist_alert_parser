import { describe, expect, it } from "vitest";
import examplePreferences from "../config/preferences.example.json";
import { parsePreferences } from "../src/preferences";

describe("parsePreferences", () => {
  it("accepts the example preference file", () => {
    expect(parsePreferences(JSON.stringify(examplePreferences)).maximumMonthlyRent).toBe(3500);
  });

  it("rejects inverted notification thresholds", () => {
    expect(() => parsePreferences(JSON.stringify({
      ...examplePreferences,
      alertScoreThreshold: 50,
      digestScoreThreshold: 60
    }))).toThrow("digestScoreThreshold must be lower");
  });
});
