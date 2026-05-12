# Automation Workflows

This file is the operator README for recurring Upwork automations. Each workflow must obey `docs/upwork-platform-rules.md`, `docs/autonomous-ops-policy.md`, and `docs/authorization-policy.md`.

## Workflow Map

| Workflow | Task file | Purpose | Live channel |
|---|---|---|---|
| `upwork-daily-acquisition` | `task/run-autonomous-acquisition-cycle.md` | Search, score, package, inspect, allocate Connects, and submit only authorized proposal packages. | `raw_cdp_humanlike` |
| `upwork-monitor-comms` | `task/manage-client-comms.md` | Check messages, notifications, proposal status, draft replies, and send only authorized message packages. | `raw_cdp_humanlike` |
| `upwork-connects-governance` | `task/check-connects-earning.md` | Track balance, reserve, and legitimate free-Connects earning paths. | `none` or bounded `raw_cdp_humanlike` |
| `upwork-product-assets` | `task/improve-product-assets.md` | Improve productized offers, templates, and proof assets for target categories. | `none` |
| `upwork-weekly-audit` | `task/audit-and-patch-policy.md` plus `task/renew-autonomy-plan.md` | Review performance, classify blockers, propose policy patches, and renew expiring autonomy plans. | `none` |

## Installed Codex Automations

The active automations should run from `C:\Users\a8744\Desktop\for-codex\freelance-ai-ops` with `executionEnvironment=local`.

| Automation | Status | Expected cadence | Output to review |
|---|---|---|---|
| `upwork-daily-acquisition` | Active | Daily morning | `sessions/*.md`, `data/runs.jsonl`, `data/bid-tracker.jsonl`, `data/proposal-packages.jsonl`, `data/platform-actions.jsonl` |
| `upwork-monitor-comms` | Active | Several checks per day | `sessions/*.md`, `data/message-packages.jsonl`, `data/outcomes.jsonl` |
| `upwork-connects-governance` | Active | Weekly | `data/connects-ledger.jsonl`, `data/runs.jsonl` |
| `upwork-product-assets` | Active | Weekly | `profile/`, `data/product-assets.jsonl`, `data/runs.jsonl` |
| `upwork-weekly-audit` | Active | Weekly | `data/policy-patches.jsonl`, audit notes, renewal records |

## Operating Rules

- Chrome must already be logged in to Upwork and available through Raw CDP at `127.0.0.1:9222` for workflows that use the live site.
- `data/autonomy-plans.jsonl` must contain one unexpired record with `status: "active"`.
- Buying Connects is always forbidden.
- Boosting is forbidden unless the user separately authorizes a concrete boosted proposal.
- Proposal submit requires a concrete `submit_authorized` package.
- Message sending requires a concrete `message_send_authorized` package.
- Contract acceptance, contract decline, purchases, subscriptions, and off-platform conversion remain user-only.
- Every live platform run must write `sessions/*.md`.

## How To Use

1. Keep Chrome running with Upwork logged in and CDP enabled on port `9222` before live workflows are scheduled to run.
2. Review archived automation conversations for the concise run summary.
3. Review `sessions/` for the full audit trail of live platform actions.
4. Review `data/policy-patches.jsonl` before changing policy gates.
5. Update or add an autonomy plan when the current plan expires or your risk appetite changes.

## Manual Commands

Run the same safety checks locally:

```powershell
node tools/validate_data_schemas.mjs
Push-Location automation/upwork-browser; npm exec -- tsc --noEmit; Pop-Location
Push-Location portfolio/demo-fastapi-llm; python -m pytest tests; Pop-Location
node --check tools/acquisition_os_live_test.mjs
node tools/acquisition_os_live_test.mjs --no-submit
node tools/acquisition_os_live_test.mjs --git-closeout
```
