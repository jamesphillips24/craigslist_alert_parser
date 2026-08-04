import { loadConfig, loadTelegramConfig } from "./config";
import type { EvaluatedListing } from "./domain";
import { findAlertEmails } from "./gmail";
import { evaluateWithOpenAi } from "./openai";
import { parseAlertEmail } from "./parser";
import { prefilterCandidate } from "./prefilter";
import { AppState } from "./state";
import { formatImmediateAlert, sendDigest, sendImmediateAlert, sendTestNotification } from "./telegram";

export function runCraigslistAlerts(): void {
  withScriptLock(() => {
    const config = loadConfig();
    const state = new AppState();
    const emails = findAlertEmails(config.gmailQuery, config.maxEmailsPerRun)
      .filter((email) => !state.hasProcessedEmail(email.id));
    let llmCalls = 0;

    for (const email of emails) {
      const candidates = parseAlertEmail(email);
      let emailCompleted = true;

      for (const candidate of candidates) {
        if (state.hasProcessedListing(candidate.key)) continue;
        const prefilter = prefilterCandidate(candidate, config.preferences);
        if (!prefilter.shouldEvaluate) {
          console.info(`Ignored ${candidate.key}: ${prefilter.reason}`);
          state.markListingProcessed(candidate.key);
          continue;
        }

        if (llmCalls >= config.maxLlmCallsPerRun) {
          console.warn("MAX_LLM_CALLS_PER_RUN reached; remaining candidates will be retried next run.");
          emailCompleted = false;
          break;
        }

        const result = evaluateWithOpenAi(candidate, config.preferences, config.openAiApiKey, config.openAiModel);
        llmCalls += 1;
        state.recordUsage(result.usage);
        const evaluated: EvaluatedListing = {
          candidate,
          evaluation: result.evaluation,
          usage: result.usage,
          evaluatedAt: new Date().toISOString()
        };

        deliverEvaluation(evaluated, config, state);
        state.markListingProcessed(candidate.key);
      }

      if (emailCompleted) state.markEmailProcessed(email.id);
    }

    console.info(`Processed ${emails.length} new email(s) with ${llmCalls} OpenAI call(s).`);
  });
}

export function runDailyDigest(): void {
  withScriptLock(() => {
    const config = loadConfig();
    const state = new AppState();
    const items = state.takeDigest();
    if (!items.length) {
      console.info("No digest candidates are queued.");
      return;
    }

    if (config.dryRun) {
      console.info(`DRY_RUN digest:\n${JSON.stringify(items, null, 2)}`);
      state.restoreDigest(items);
      return;
    }

    try {
      sendDigest(items, config.telegramBotToken, config.telegramChatId);
    } catch (error) {
      state.restoreDigest(items);
      throw error;
    }
  });
}

export function installTriggers(): void {
  const handlerNames = new Set(["runCraigslistAlerts", "runDailyDigest"]);
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (handlerNames.has(trigger.getHandlerFunction())) ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger("runCraigslistAlerts").timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger("runDailyDigest").timeBased().atHour(18).everyDays(1).create();
  console.info("Installed a five-minute alert trigger and an evening digest trigger.");
}

export function baselineExistingAlerts(): void {
  withScriptLock(() => {
    const config = loadConfig(false);
    const state = new AppState();
    const emails = findAlertEmails(config.gmailQuery, 100);
    let listings = 0;
    for (const email of emails) {
      for (const candidate of parseAlertEmail(email)) {
        state.markListingProcessed(candidate.key);
        listings += 1;
      }
      state.markEmailProcessed(email.id);
    }
    console.info(`Baselined ${emails.length} email(s) and ${listings} listing candidate(s) without API calls or notifications.`);
  });
}

export function testConfiguration(): void {
  const config = loadConfig();
  console.info(JSON.stringify({
    gmailQuery: config.gmailQuery,
    openAiModel: config.openAiModel,
    dryRun: config.dryRun,
    maxEmailsPerRun: config.maxEmailsPerRun,
    maxLlmCallsPerRun: config.maxLlmCallsPerRun,
    alertScoreThreshold: config.preferences.alertScoreThreshold,
    digestScoreThreshold: config.preferences.digestScoreThreshold,
    telegramConfigured: Boolean(config.telegramBotToken && config.telegramChatId)
  }, null, 2));
}

export function testTelegramNotification(): void {
  const config = loadTelegramConfig();
  sendTestNotification(config.telegramBotToken, config.telegramChatId);
  console.info("Telegram test notification sent successfully.");
}

function deliverEvaluation(evaluated: EvaluatedListing, config: ReturnType<typeof loadConfig>, state: AppState): void {
  if (evaluated.evaluation.recommendation === "alert") {
    if (config.dryRun) console.info(`DRY_RUN alert:\n${formatImmediateAlert(evaluated)}`);
    else sendImmediateAlert(evaluated, config.telegramBotToken, config.telegramChatId);
  } else if (evaluated.evaluation.recommendation === "digest") {
    state.queueDigest(evaluated);
  } else {
    console.info(`Ignored ${evaluated.candidate.key} with score ${evaluated.evaluation.score}.`);
  }
}

function withScriptLock(action: () => void): void {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1_000)) {
    console.warn("Another execution is already running; skipping this invocation.");
    return;
  }
  try {
    action();
  } finally {
    lock.releaseLock();
  }
}
