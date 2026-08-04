import type { EvaluatedListing } from "./domain";

export function sendImmediateAlert(item: EvaluatedListing, botToken: string, chatId: string): void {
  sendTelegramMessage(botToken, chatId, formatImmediateAlert(item));
}

export function sendDigest(items: EvaluatedListing[], botToken: string, chatId: string): void {
  const sorted = [...items].sort((left, right) => right.evaluation.score - left.evaluation.score);
  const body = sorted.map((item, index) => formatDigestItem(item, index + 1)).join("\n\n");
  sendTelegramMessage(botToken, chatId, `<b>Craigslist possibilities</b>\n\n${body}`.slice(0, 4_000));
}

export function sendTestNotification(botToken: string, chatId: string): void {
  sendTelegramMessage(
    botToken,
    chatId,
    "<b>Craigslist alert triage is connected.</b>\nTelegram notifications are configured correctly."
  );
}

export function formatImmediateAlert(item: EvaluatedListing): string {
  const { candidate, evaluation } = item;
  const heading = `${evaluation.score}/100 · Strong match`;
  const facts = [
    candidate.price === null ? null : `$${candidate.price.toLocaleString()}`,
    candidate.bedrooms,
    candidate.title
  ].filter(Boolean).join(" · ");
  const reasons = evaluation.reasons.length ? `\n<b>Why:</b> ${escapeHtml(evaluation.reasons.join("; "))}` : "";
  const concerns = evaluation.concerns.length ? `\n<b>Watch-outs:</b> ${escapeHtml(evaluation.concerns.join("; "))}` : "";
  const link = candidate.url ? `\n<a href="${escapeHtml(candidate.url)}">Open listing</a>` : "";

  return `<b>${escapeHtml(heading)}</b>\n${escapeHtml(facts)}\n${escapeHtml(evaluation.summary)}${reasons}${concerns}${link}`.slice(0, 4_000);
}

function formatDigestItem(item: EvaluatedListing, index: number): string {
  const price = item.candidate.price === null ? "price unknown" : `$${item.candidate.price.toLocaleString()}`;
  const label = `${index}. ${item.evaluation.score}/100 · ${price} · ${item.candidate.title}`;
  const link = item.candidate.url ? ` <a href="${escapeHtml(item.candidate.url)}">Open</a>` : "";
  return `<b>${escapeHtml(label)}</b>\n${escapeHtml(item.evaluation.summary)}${link}`;
}

function sendTelegramMessage(botToken: string, chatId: string, html: string): void {
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: false
    }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Telegram request failed (${status}): ${response.getContentText().slice(0, 1_000)}`);
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
