# Plan Daily Acquisition

## Goal

Set the daily acquisition plan without using CDP.

## Inputs

- Current business intent.
- Current Connects budget.
- Recent opportunity, proposal, outcome, and audit data.

## Outputs

- Daily target.
- Connects budget allocation.
- Job categories to prioritize.
- Risk appetite.
- Execution mode default.

## Steps

1. Read architecture, authorization, and Connects policy.
2. Review current ledgers and recent outcomes.
3. Set daily target and category priorities.
4. Set daily Connects cap and reserved Connects.
5. Set default execution mode, normally `prefill_only`.
6. Write manager guidance for downstream tasks.

## Stop Conditions

- Missing policy files.
- Missing or contradictory budget authority.
- User instruction conflicts with authorization policy.

## Files To Read

- `docs/acquisition-os-architecture.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `data/connects-ledger.jsonl`
- `data/outcomes.jsonl`
- `data/policy-patches.jsonl`

## Files To Write

- Planning notes or policy records approved by the manager.
- No browser or CDP output.

## Session Requirements

No CDP session is required. If this task is run as an automation, record a run entry in `data/runs.jsonl`.

## Safety Rules

- Manager task only.
- Do not use CDP.
- Do not open live Upwork forms.
- Do not authorize submit without specific job IDs or proposal package IDs.
