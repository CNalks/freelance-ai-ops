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
- High-potential inspect candidates.
- Explicit `submit_authorized` package IDs only after apply-form inspection confirms all submit gates.

## Steps

1. Read opportunities and current Connects ledger.
2. Confirm each opportunity has minimum scoring fields.
3. Score fit, client quality, competition, scope clarity, and risk.
4. Choose `skip`, `draft_only`, or `prefill_only` before form inspection; missing Connects cost must not prevent inspect.
5. Emit high-potential `prefill_only` candidates for CDP form inspection.
6. After CDP form observations exist, set `max_authorized_connects` from observed form cost.
7. Use `submit_authorized` only for concrete package IDs with high fit, credible client quality, low or moderate competition, clear scope, non-low pricing, acceptable observed Connects cost, sufficient observed balance, and no forbidden risk.
8. Write decision reason for every selected opportunity.

## Stop Conditions

- Missing required scores.
- Client or job risk triggers forbidden conditions.
- Budget is below the pricing policy minimum for meaningful fixed-scope work.
- Connects cost is not observed for a package that would be submitted.
- Connects cost exceeds daily cap, package cap, or observed balance after form inspection.

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
- Do not mark `submit_authorized` before form inspection.
- Do not mark `submit_authorized` for low-budget, vague, high-competition, off-platform, free-test, unobserved-Connects, or insufficient-balance opportunities.
