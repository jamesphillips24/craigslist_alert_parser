import { describe, expect, it } from "vitest";
import type { AlertEmail } from "../src/domain";
import { extractBedrooms, extractCraigslistUrls, extractPrice, parseAlertEmail } from "../src/parser";

const email: AlertEmail = {
  id: "message-1",
  subject: "New apartments matching your search",
  sender: "alerts@example.test",
  receivedAt: new Date("2026-08-03T12:00:00Z"),
  plainBody: "Bright studio $3,100 near the park",
  htmlBody: `
    <p>$3,100 · studio · sunny apartment</p>
    <a href="https://sfbay.craigslist.org/sfc/apa/d/san-francisco-bright-studio/1234567890.html?utm_source=alert">
      Bright studio near the park
    </a>
  `
};

describe("parseAlertEmail", () => {
  it("extracts and normalizes Craigslist candidates", () => {
    expect(parseAlertEmail(email)).toEqual([
      expect.objectContaining({
        key: "1234567890",
        listingId: "1234567890",
        url: "https://sfbay.craigslist.org/sfc/apa/d/san-francisco-bright-studio/1234567890.html",
        title: "Bright studio near the park",
        price: 3100,
        bedrooms: "studio"
      })
    ]);
  });

  it("falls back to an email-level candidate when no listing URL exists", () => {
    const result = parseAlertEmail({ ...email, htmlBody: "<p>No link</p>", plainBody: "1BR for $2,900" });
    expect(result[0]).toEqual(expect.objectContaining({
      key: "email:message-1",
      price: 2900,
      bedrooms: "1 bedroom"
    }));
  });
});

describe("field extraction", () => {
  it("deduplicates URLs and strips query strings", () => {
    const url = "https://sfbay.craigslist.org/sfc/apa/d/example/9876543210.html";
    expect(extractCraigslistUrls(`${url}?a=1 ${url}`)).toEqual([url]);
  });

  it("parses common prices and bedroom labels", () => {
    expect(extractPrice("rent is $3,450/mo")).toBe(3450);
    expect(extractBedrooms("Sunny 1BR apartment")).toBe("1 bedroom");
  });
});
