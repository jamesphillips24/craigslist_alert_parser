# Setup

## 1. Prepare Gmail

Create a Gmail label named `craigslist-alerts`. Add a Gmail filter that applies it to the Craigslist search-alert emails. Confirm that at least one alert is visible under that label.

The default query is:

```text
label:craigslist-alerts newer_than:7d
```

You can override it with the `GMAIL_QUERY` Script Property.

## 2. Create Telegram credentials

1. Message `@BotFather` in Telegram and create a bot.
2. Send your new bot a message.
3. Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` and copy the chat ID from the response.
4. Keep both values private.

## 3. Create the Apps Script project

Install dependencies and authenticate `clasp`:

```bash
npm install
npx clasp login
```

Enable the Apps Script API at `https://script.google.com/home/usersettings`, then create the standalone project:

```bash
npm run build
npx clasp create --title "Craigslist alert triage" --type standalone --rootDir dist
npm run deploy
```

Do not commit the generated `.clasp.json` file.

## 4. Add private Script Properties

Open the Apps Script project, choose **Project Settings**, and add these Script Properties:

| Name | Required | Value |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | An API key from the OpenAI Platform; ChatGPT subscription billing is separate. |
| `PREFERENCES_JSON` | Yes | A minified or formatted JSON object based on `config/preferences.example.json`. |
| `TELEGRAM_BOT_TOKEN` | Before live mode | Token received from BotFather. |
| `TELEGRAM_CHAT_ID` | Before live mode | Your private Telegram chat ID. |
| `DRY_RUN` | Recommended initially | `true` until validation is complete. Defaults to `true`. |
| `OPENAI_MODEL` | No | Defaults to `gpt-5-mini`; change this without redeploying code. |
| `GMAIL_QUERY` | No | Defaults to `label:craigslist-alerts newer_than:7d`. |
| `MAX_EMAILS_PER_RUN` | No | Defaults to `20`. |
| `MAX_LLM_CALLS_PER_RUN` | No | Defaults to `20`. |

Create your real preference object from `config/preferences.example.json`; do not create `config/preferences.json` in Git. The local path is ignored as an additional safeguard.

## 5. Authorize and validate

In the Apps Script editor:

1. Run `testConfiguration()` and inspect the execution log.
2. Run `testTelegramNotification()` and confirm that the test message arrives in Telegram. This explicit test sends even when `DRY_RUN=true`.
3. Run `baselineExistingAlerts()` once if you do not want existing alert emails evaluated.
4. Leave `DRY_RUN=true`, wait for a new alert, and run `runCraigslistAlerts()` manually.
5. Inspect the execution log and OpenAI token counts stored under `MONTHLY_OPENAI_USAGE`.
6. Set `DRY_RUN=false` when you are ready for live listing notifications.

Apps Script will ask for Gmail read-only, external-request, and trigger-management permissions. This project does not request Gmail write access.

## 6. Start the scheduler

Run `installTriggers()` once. It creates:

- `runCraigslistAlerts()` every five minutes.
- `runDailyDigest()` once each evening around 6 PM in the project time zone.

Apps Script schedules clock triggers within a time window rather than at an exact second.

## 7. Control cost

Set an API budget in the OpenAI Platform billing settings. `MAX_LLM_CALLS_PER_RUN` limits burst usage, while `MONTHLY_OPENAI_USAGE` records aggregate token counts in Script Properties. Start with a small external budget and adjust only after reviewing actual alert volume.
