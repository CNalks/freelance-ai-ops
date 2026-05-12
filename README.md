# Freelance AI Ops

AI-assisted Upwork acquisition operating system. This repo stores strategy, platform rules, autonomy policy, task workflows, proposal packages, product assets, and audit records.

## Start Here

1. `docs/automation-workflows.md` - recurring automation README and usage guide.
2. `docs/upwork-platform-rules.md` - platform boundary summary.
3. `docs/autonomous-ops-policy.md` - autonomy levels, Raw CDP channel, and operating mandate.
4. `docs/authorization-policy.md` - submit/message gates.
5. `docs/connects-policy.md` - Connects budget, reserve, and ledger rules.
6. `task/run-autonomous-acquisition-cycle.md` - primary daily acquisition task.

## Important Paths

| Path | Purpose |
|---|---|
| `task/` | Repeatable task specs for the scheduled workflows. |
| `docs/` | Operating policies, workflow docs, pricing, reports, and trackers. |
| `data/*.jsonl` | Structured state for plans, jobs, packages, actions, ledgers, runs, and outcomes. |
| `data/schemas/` | JSON schemas used by `tools/validate_data_schemas.mjs`. |
| `sessions/` | Required audit trail for every live Raw CDP execution. |
| `profile/` | Upwork profile notes, proposal templates, client templates, and showcase catalog. |
| `portfolio/` | Real demo assets used as proposal proof. |
| `tools/` | Raw CDP runner and data validation tools. |

## Automation Workflows

The installed workflow set is:

- `upwork-daily-acquisition` - find, score, package, inspect, and submit only concrete `submit_authorized` packages.
- `upwork-monitor-comms` - monitor proposals/messages and send only concrete `message_send_authorized` replies.
- `upwork-connects-governance` - track reserve, balance, and legitimate free-Connects earning paths.
- `upwork-product-assets` - improve productized offers and proof assets.
- `upwork-weekly-audit` - review results, classify blockers, propose policy patches, and renew expiring autonomy plans.

Live workflows require Chrome logged in to Upwork with Raw CDP available at `127.0.0.1:9222`. Buying Connects, boosting, accepting/declining contracts, purchases, subscriptions, and off-platform conversion remain forbidden unless the policy explicitly says the user must do it manually.

## Manual Verification

```powershell
node tools/validate_data_schemas.mjs
Push-Location automation/upwork-browser; npm exec -- tsc --noEmit; Pop-Location
Push-Location portfolio/demo-fastapi-llm; python -m pytest tests; Pop-Location
node --check tools/acquisition_os_live_test.mjs
node tools/acquisition_os_live_test.mjs --no-submit
```
