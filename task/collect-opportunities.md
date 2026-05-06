# Collect Opportunities

## Goal

Collect candidate Upwork opportunities into structured records.

## Inputs

- Daily acquisition plan.
- Preferred categories and avoid-list.
- Existing opportunity records for dedupe.

## Outputs

- Future opportunity records in `data/jobs.jsonl` or an equivalent structured file.

## Steps

1. Read the daily plan and current opportunity records.
2. Collect candidate jobs.
3. Record each opportunity with the required schema fields.
4. Do not score or authorize spend in this task.
5. Write a session if Raw CDP is used in a future authorized run.

## Stop Conditions

- CDP is not explicitly authorized for this run.
- Upwork login page or session expired.
- CAPTCHA, abnormal verification, or blocked access.
- A job cannot be represented with the opportunity schema.

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

Future CDP collection runs must write a session file. This refactor task must not execute CDP.

## Safety Rules

- Raw CDP only for future authorized browser collection.
- Do not submit proposals.
- Do not buy Connects.
- Do not send messages.
