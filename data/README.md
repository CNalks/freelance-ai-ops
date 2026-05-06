# Data Directory

This directory holds structured state for the Acquisition OS. JSONL and YAML are the source of truth; Markdown remains useful for human reports.

## Planned State Files

- `data/jobs.jsonl` - opportunity records.
- `data/proposal-packages.jsonl` - proposal packages and authorization mode.
- `data/connects-ledger.jsonl` - Connects observations and spend events.
- `data/form-observations.jsonl` - proposal form observations from CDP runs.
- `data/runs.jsonl` - execution and manager run records.
- `data/outcomes.jsonl` - responses, interviews, contracts, losses, and withdrawals.
- `data/policy-patches.jsonl` - audit-driven policy changes.

## Schemas

Schemas live in `data/schemas/`. Examples live in `data/examples/`.

Do not commit credentials, cookies, screenshots, or private runtime artifacts.
