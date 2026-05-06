# Score And Allocate Connects

## Goal

Turn opportunity records into policy decisions and Connects allocations.

## Inputs

- Opportunity records.
- Connects policy.
- Current budget and ledger.

## Outputs

- Recommended actions.
- Proposal package authorizations.
- Connects allocation records.
- Explicit `submit_authorized` package candidates only when all policy thresholds pass.

## Steps

1. Read opportunities and current Connects ledger.
2. Confirm each opportunity has minimum spending fields.
3. Score fit, client quality, competition, scope clarity, and risk.
4. Choose `skip`, `draft_only`, `prefill_only`, or `submit_authorized`.
5. Set `max_authorized_connects` only when action is not `skip`.
6. Use `submit_authorized` only for high-fit opportunities with credible client quality, low or moderate competition, clear scope, non-low pricing, acceptable observed Connects cost, and no forbidden risk.
7. Write decision reason for every selected opportunity.

## Stop Conditions

- Missing Connects cost.
- Missing required scores.
- Connects cost exceeds daily cap.
- Client or job risk triggers forbidden conditions.
- Budget is below the pricing policy minimum for meaningful fixed-scope work.
- Connects cost is not observed for a package that would be submitted.

## Files To Read

- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `data/schemas/opportunity.schema.json`
- `data/jobs.jsonl`
- `data/connects-ledger.jsonl`

## Files To Write

- Updated opportunity decisions.
- Proposal package authorization inputs.
- `data/connects-ledger.jsonl` for budget reservations when used.

## Session Requirements

No CDP session is required. Record the manager run in `data/runs.jsonl` when this task changes structured state.

## Safety Rules

- Manager/policy task only.
- Do not operate CDP.
- Do not spend Connects.
- Do not use generic submit authorization.
- Do not mark `submit_authorized` for low-budget, vague, high-competition, off-platform, free-test, or unobserved-Connects opportunities.
