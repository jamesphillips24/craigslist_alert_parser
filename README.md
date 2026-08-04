# Craigslist alert triage

This project reads Craigslist search-alert emails from a Gmail label, evaluates each new listing against private housing preferences with the OpenAI API, and sends strong matches to Telegram. It does not crawl or fetch Craigslist pages.

The runtime is a standalone Google Apps Script project. This repository holds the TypeScript source, tests, and deployment tooling.

## What it does

- Polls a configurable Gmail query every ten minutes.
- Processes only unseen Gmail messages and listing IDs.
- Skips listings that are clearly over the configured maximum rent.
- Uses structured OpenAI output to score the remaining candidates.
- Sends high-scoring matches immediately and queues borderline matches for an evening digest.
- Defaults to `DRY_RUN=true` so setup cannot accidentally send notifications.
- Records aggregate monthly token usage in Script Properties.

## Local development

```bash
npm install
npm run check
```

Generated Apps Script files are written to `dist/` and are not committed.

## Deployment

Follow [docs/setup.md](docs/setup.md). You will provide Gmail, OpenAI, Telegram, and preference details directly in your Apps Script project; secrets are never stored in this repository.

## Entrypoints

- `testConfiguration()` validates setup without reading email or calling external APIs.
- `testTelegramNotification()` sends one end-to-end Telegram test message.
- `baselineExistingAlerts()` marks the current search results as already seen without LLM calls or notifications.
- `runCraigslistAlerts()` processes new alert emails.
- `runDailyDigest()` sends queued borderline candidates.
- `installTriggers()` installs the ten-minute and daily triggers.
