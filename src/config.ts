import type { Preferences } from "./domain";
import { parsePreferences } from "./preferences";

export interface AppConfig {
  openAiApiKey: string;
  openAiModel: string;
  telegramBotToken: string;
  telegramChatId: string;
  gmailQuery: string;
  dryRun: boolean;
  maxEmailsPerRun: number;
  maxLlmCallsPerRun: number;
  preferences: Preferences;
}

export interface TelegramConfig {
  telegramBotToken: string;
  telegramChatId: string;
}

export function loadConfig(requireTelegram = true): AppConfig {
  const properties = PropertiesService.getScriptProperties();
  const openAiApiKey = required(properties, "OPENAI_API_KEY");
  const preferences = parsePreferences(required(properties, "PREFERENCES_JSON"));
  const dryRun = readBoolean(properties.getProperty("DRY_RUN"), true);
  const telegramBotToken = properties.getProperty("TELEGRAM_BOT_TOKEN")?.trim() ?? "";
  const telegramChatId = properties.getProperty("TELEGRAM_CHAT_ID")?.trim() ?? "";

  if (requireTelegram && !dryRun && (!telegramBotToken || !telegramChatId)) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required when DRY_RUN is false.");
  }

  return {
    openAiApiKey,
    openAiModel: properties.getProperty("OPENAI_MODEL")?.trim() || "gpt-5-mini",
    telegramBotToken,
    telegramChatId,
    gmailQuery: properties.getProperty("GMAIL_QUERY")?.trim() || "label:craigslist-alerts newer_than:7d",
    dryRun,
    maxEmailsPerRun: readPositiveInteger(properties.getProperty("MAX_EMAILS_PER_RUN"), 20),
    maxLlmCallsPerRun: readPositiveInteger(properties.getProperty("MAX_LLM_CALLS_PER_RUN"), 20),
    preferences
  };
}

export function loadTelegramConfig(): TelegramConfig {
  const properties = PropertiesService.getScriptProperties();
  return {
    telegramBotToken: required(properties, "TELEGRAM_BOT_TOKEN"),
    telegramChatId: required(properties, "TELEGRAM_CHAT_ID")
  };
}

function required(properties: GoogleAppsScript.Properties.Properties, name: string): string {
  const value = properties.getProperty(name)?.trim();
  if (!value) throw new Error(`Missing required Script Property: ${name}`);
  return value;
}

function readBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null || value.trim() === "") return fallback;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  throw new Error("DRY_RUN must be true or false.");
}

function readPositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${value} must be a positive integer.`);
  return parsed;
}
