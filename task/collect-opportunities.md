# Collect Opportunities

## Goal

Collect candidate Upwork opportunities into structured records.

## Inputs

- Daily acquisition plan.
- Preferred categories and avoid-list.
- Existing opportunity records for dedupe.

## Outputs

- Opportunity records in `data/jobs.jsonl`.
- Source-level blockers in `data/runs.jsonl` and `sessions/*.md` for live CDP runs.

## Steps

1. Read the daily plan and current opportunity records.
2. Collect candidate jobs.
3. Use visible page data only; do not store credentials, cookies, screenshots, IPs, Cloudflare Ray IDs, or private page artifacts.
4. Record each opportunity with the required schema fields.
5. If a source hits Cloudflare, login, CAPTCHA, verification, or blocked access, record the blocker and stop that source.
6. Do not score or authorize spend in this task.
7. Write a session if Raw CDP is used.

## Stop Conditions

- CDP is not explicitly authorized for this run.
- Upwork login page or session expired.
- CAPTCHA, abnormal verification, or blocked access.
- A job cannot be represented with the opportunity schema.
- The page is a Cloudflare interstitial instead of job content.

## Files To Read

- `docs/acquisition-os-architecture.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `data/schemas/opportunity.schema.json`
- Existing `data/jobs.jsonl` if present.

## Files To Write

- `data/jobs.jsonl`
- `data/runs.jsonl` if a run record is needed.
- `sessions/*.md` if CDP is used.

## Session Requirements

Every live CDP collection run writes `sessions/*.md`, even when blocked before collecting jobs.

## Safety Rules

- Raw CDP only for future authorized browser collection.
- Do not submit proposals.
- Do not buy Connects.
- Do not send messages.
