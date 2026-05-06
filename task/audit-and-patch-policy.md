# Audit And Patch Policy

## Goal

Review sessions, ledgers, and outcomes, then propose policy patches.

## Inputs

- Connects ledger.
- Execution sessions.
- Outcome records.
- Current policies.

## Outputs

- Response rate.
- Connects efficiency.
- Wasted Connects.
- Best categories.
- Policy patches.

## Steps

1. Read current policies, ledgers, sessions, and outcomes.
2. Calculate response rate and Connects efficiency.
3. Identify wasted Connects and avoidable risk events.
4. Identify best and weak categories.
5. Write specific policy patches with evidence.
6. Do not edit execution records.

## Stop Conditions

- Missing session records for a live execution run.
- Ledger and session data disagree on Connects spend.
- Outcome data is too incomplete to support a policy patch.

## Files To Read

- `docs/acquisition-os-architecture.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `data/connects-ledger.jsonl`
- `data/runs.jsonl`
- `data/outcomes.jsonl`
- `sessions/*.md`

## Files To Write

- `data/policy-patches.jsonl`
- Audit report files when requested.

## Session Requirements

No CDP session is required. Record the audit run in `data/runs.jsonl` when structured state changes.

## Safety Rules

- Auditor/manager task only.
- Do not operate CDP.
- Do not perform fixes inside the audit task.
- Emit policy patches, not generic advice.
