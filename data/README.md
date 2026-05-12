# Data Directory

This directory holds structured state for the Acquisition OS. JSONL and YAML are the source of truth; Markdown remains useful for human reports.

## Planned State Files

- `data/jobs.jsonl` - opportunity records.
- `data/autonomy-plans.jsonl` - active autonomy level, channel, budget, and volume limits.
- `data/product-assets.jsonl` - offer and portfolio asset readiness records.
- `data/proposal-packages.jsonl` - proposal packages and authorization mode.
- `data/bid-tracker.jsonl` - tracked jobs and submitted proposal state.
- `data/platform-actions.jsonl` - scoped platform action authorizations and results.
- `data/connects-ledger.jsonl` - Connects observations and spend events.
- `data/form-observations.jsonl` - proposal form observations from CDP runs.
- `data/message-packages.jsonl` - drafted or authorized client replies.
- `data/runs.jsonl` - execution and manager run records.
- `data/outcomes.jsonl` - responses, interviews, contracts, losses, and withdrawals.
- `data/policy-patches.jsonl` - audit-driven policy changes.

## Schemas

Schemas live in `data/schemas/`. Examples live in `data/examples/`.

Validate structured data with:

```bash
node tools/validate_data_schemas.mjs
```

Do not commit credentials, cookies, screenshots, or private runtime artifacts.
