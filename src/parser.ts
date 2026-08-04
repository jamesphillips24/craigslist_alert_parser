import type { AlertEmail, ListingCandidate } from "./domain";

const CRAIGSLIST_URL_PATTERN = /https?:\/\/(?:[a-z0-9-]+\.)?craigslist\.org\/[a-z]{3}\/[a-z]{3}\/d\/[^\s"'<>]+?\/(\d{8,12})\.html(?:\?[^\s"'<>]*)?/gi;
const ANCHOR_PATTERN = /<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

export function parseAlertEmail(email: AlertEmail): ListingCandidate[] {
  const anchors = extractCraigslistAnchors(email.htmlBody);
  const urls = unique([
    ...anchors.map((anchor) => anchor.url),
    ...extractCraigslistUrls(email.plainBody),
    ...extractCraigslistUrls(decodeHtmlEntities(email.htmlBody))
  ]);

  if (urls.length === 0) {
    return [fallbackCandidate(email)];
  }

  const plainText = normalizeWhitespace(`${email.subject}\n${email.plainBody}\n${htmlToText(email.htmlBody)}`);
  return urls.map((url) => {
    const listingId = extractListingId(url);
    const anchor = anchors.find((item) => normalizeUrl(item.url) === normalizeUrl(url));
    const title = anchor?.title || inferTitle(email.subject, plainText, url);
    const snippet = surroundingText(plainText, title, 3_500);

    return {
      key: listingId || normalizeUrl(url),
      listingId,
      url: normalizeUrl(url),
      title,
      snippet,
      price: extractPrice(`${title} ${snippet}`),
      bedrooms: extractBedrooms(`${title} ${snippet}`),
      sourceEmailId: email.id,
      sourceReceivedAt: email.receivedAt.toISOString()
    };
  });
}

export function extractCraigslistUrls(value: string): string[] {
  const decoded = decodeHtmlEntities(value);
  return unique(Array.from(decoded.matchAll(CRAIGSLIST_URL_PATTERN), (match) => normalizeUrl(match[0])));
}

export function extractListingId(url: string): string | null {
  const match = url.match(/\/(\d{8,12})\.html(?:\?|$)/);
  return match?.[1] ?? null;
}

export function extractPrice(value: string): number | null {
  const match = value.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,5})(?:\.\d{2})?/);
  if (!match) return null;
  const price = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(price) ? price : null;
}

export function extractBedrooms(value: string): string | null {
  if (/\bstudio\b/i.test(value)) return "studio";
  const match = value.match(/\b(\d+)\s*(?:br|bd|bed|bedroom)s?\b/i);
  return match ? `${match[1]} bedroom` : null;
}

function extractCraigslistAnchors(html: string): Array<{ url: string; title: string }> {
  const anchors: Array<{ url: string; title: string }> = [];
  for (const match of html.matchAll(ANCHOR_PATTERN)) {
    const url = decodeHtmlEntities(match[1]);
    if (!extractListingId(url) || !/craigslist\.org/i.test(url)) continue;
    anchors.push({
      url: normalizeUrl(url),
      title: normalizeWhitespace(htmlToText(match[2]))
    });
  }
  return anchors;
}

function fallbackCandidate(email: AlertEmail): ListingCandidate {
  const snippet = normalizeWhitespace(`${email.subject}\n${email.plainBody}\n${htmlToText(email.htmlBody)}`).slice(0, 6_000);
  return {
    key: `email:${email.id}`,
    listingId: null,
    url: null,
    title: email.subject.trim() || "Craigslist alert",
    snippet,
    price: extractPrice(snippet),
    bedrooms: extractBedrooms(snippet),
    sourceEmailId: email.id,
    sourceReceivedAt: email.receivedAt.toISOString()
  };
}

function inferTitle(subject: string, plainText: string, url: string): string {
  const id = extractListingId(url);
  const lines = plainText.split(/\s{2,}|\n/).map((line) => line.trim()).filter(Boolean);
  const likely = lines.find((line) => line.length >= 8 && line.length <= 180 && !line.includes(url) && !line.includes(id ?? "__none__"));
  return likely || subject.trim() || `Craigslist listing ${id ?? ""}`.trim();
}

function surroundingText(text: string, needle: string, maximumLength: number): string {
  const index = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
  if (index < 0) return text.slice(0, maximumLength);
  const start = Math.max(0, index - 800);
  return text.slice(start, start + maximumLength);
}

function normalizeUrl(value: string): string {
  return value.replace(/[),.;]+$/, "").replace(/\?.*$/, "");
}

function htmlToText(value: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, "").replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
