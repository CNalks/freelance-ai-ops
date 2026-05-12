# Run Autonomous Acquisition Cycle

## Goal

Run the recurring manager cycle for autonomous Upwork acquisition without exceeding the current operating mandate or platform channel gate.

## Inputs

- `docs/autonomous-ops-policy.md`
- `docs/upwork-platform-rules.md`
- `docs/acquisition-os-architecture.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `docs/pricing.md`
- `profile/showcase-catalog.yml`
- Current data files under `data/`

## Outputs

- Updated plan, opportunity decisions, proposal packages, bid tracker, Connects ledger reservations, run records, and audit notes as needed.
- Product asset decisions and message package handoffs when needed.
- A short archive-readable run summary with found jobs, submitted count, tracked bids, and observed Connects state.
- CDP or API handoff only when platform action is authorized and compliant.

## Steps

1. Read the platform rules and autonomous ops policy first.
2. Confirm the active autonomy level and execution channel.
3. Read current ledgers, recent sessions, outcomes, policy patches, and proposal packages.
4. Set the daily objective, Connects cap, weekly cap, and reserve floor.
5. Select target categories and product offers.
6. Improve product assets only when doing so directly supports current target categories.
7. Use bounded `raw_cdp_humanlike` search when the active plan allows collection.
8. Score existing and newly collected opportunities.
9. Reserve Connects only when the reserve floor remains intact.
10. Create or update proposal packages for high-fit opportunities.
11. Promote concrete package IDs to `submit_authorized` only if delegated submit is active and every gate passes.
12. Create message package handoffs for client threads that need replies.
13. Promote concrete message package IDs to `message_send_authorized` only if delegated messages are active and every gate passes.
14. Write platform action records for submit, message, or blocked live actions.
15. Write the run record and summary metrics.
16. Validate structured data, then commit and push the exact run outputs when the run was invoked with `--git-closeout`.

## Stop Conditions

- Missing platform rules or autonomous ops policy.
- No active budget or reserve floor.
- Requested action is outside the active autonomy level.
- Execution channel is not allowed for the requested platform action.
- Raw CDP action exceeds active volume limits or task scope.
- Any action would buy Connects, boost, accept or decline a contract, send off-platform contact information, or move payment off Upwork.
- Live Upwork action is required but no compliant channel is active.
- Opportunity data is too incomplete to support scoring.
- Proposal package lacks pricing, risk notes, showcase selection, or stop conditions.

## Files To Read

- `docs/autonomous-ops-policy.md`
- `docs/upwork-platform-rules.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `docs/pricing.md`
- `profile/showcase-catalog.yml`
- `data/autonomy-plans.jsonl`
- `data/jobs.jsonl`
- `data/product-assets.jsonl`
- `data/proposal-packages.jsonl`
- `data/bid-tracker.jsonl`
- `data/message-packages.jsonl`
- `data/platform-actions.jsonl`
- `data/connects-ledger.jsonl`
- `data/outcomes.jsonl`
- `data/policy-patches.jsonl`
- `data/runs.jsonl`

## Files To Write

- `data/autonomy-plans.jsonl`
- `data/jobs.jsonl`
- `data/product-assets.jsonl`
- `data/proposal-packages.jsonl`
- `data/bid-tracker.jsonl`
- `data/message-packages.jsonl`
- `data/platform-actions.jsonl`
- `data/connects-ledger.jsonl`
- `data/policy-patches.jsonl`
- `data/runs.jsonl`
- Human-readable report files only when requested.

## Safety Rules

- Manager task by default.
- Use Raw CDP only as bounded human-like browser operation.
- Do not submit, send messages, or inspect live forms unless the active channel and authorization allow it.
- Do not buy Connects.
- Do not boost.
- Do not accept or decline contracts.
- Do not share or request off-platform contact information before contract start.
