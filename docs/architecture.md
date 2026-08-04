# Architecture

```text
Craigslist search alert
        |
        v
Gmail label + read-only GmailApp query
        |
        v
Email parser -> URL/listing-ID deduplication -> rent prefilter
        |
        v
OpenAI Responses API with strict JSON schema
        |
        +--> score >= alert threshold  --> Telegram immediately
        +--> score >= digest threshold --> evening Telegram digest
        +--> lower score                --> log only
```

Google Apps Script hosts the service. Script Properties hold private configuration and bounded state. The service does not request Gmail write access, mark messages read, or retrieve the linked Craigslist pages.

## Reliability decisions

- A script lock prevents overlapping scheduled executions.
- Email IDs and normalized listing IDs provide two levels of deduplication.
- A listing is marked processed only after its evaluation is delivered or queued.
- Failed digest sends are restored to the queue for retry.
- Each run has configurable limits for emails and LLM calls.
- `baselineExistingAlerts()` establishes a clean starting point without spending tokens.

## Security boundaries

- The OpenAI key, Telegram bot token, chat ID, and personal preferences belong in Apps Script Properties.
- `.clasp.json`, `.clasprc.json`, local preferences, build output, and `.env` files are ignored by Git.
- Listing text is treated as untrusted data in the model prompt.
- Only the email-derived listing candidate and compact preference profile are sent to OpenAI.
