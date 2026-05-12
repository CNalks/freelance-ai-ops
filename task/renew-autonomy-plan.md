# Renew Autonomy Plan

## Goal

Review the current autonomy plan before expiry and write a replacement plan only when evidence supports the next operating mandate.

## Inputs

- `data/autonomy-plans.jsonl`
- `data/runs.jsonl`
- `data/connects-ledger.jsonl`
- `data/outcomes.jsonl`
- Recent `sessions/*.md`
- Recent audit reports or policy patches.

## Outputs

- A new `data/autonomy-plans.jsonl` record when renewal is justified.
- Previous plan status updated only when a new plan supersedes it.
- A run record in `data/runs.jsonl` when structured state changes.

## Steps

1. Identify the latest `status: "active"` plan and its `expires_at`.
2. If expiry is more than 7 days away, record no change.
3. Review revenue, interviews, Connects spend, blockers, and policy patches from the current plan period.
4. Propose conservative caps, target categories, and allowed actions for the next period.
5. Write the new plan as `status: "active"` only when the prior plan is expired or within the renewal window and the evidence supports renewal.

## Stop Conditions

- No active plan exists.
- No session or run evidence exists for the current plan period.
- The proposed plan lowers the reserve floor below policy.
- The proposed plan expands L4 business authority.

## Safety Rules

- Manager-only task.
- Do not operate CDP.
- Do not buy Connects.
- Do not submit proposals or send messages.
