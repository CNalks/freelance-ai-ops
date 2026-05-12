# Workflow - Acquisition OS

The current operating model is:

```text
Rules -> Autonomy -> Plan -> Raw CDP Search -> Score -> Productize -> Package -> Inspect -> Authorize -> Submit/Reply -> Monitor -> Audit
```

This replaces the old linear Task 1-6 framing. Task files are executable work orders; policy and authorization live in the Acquisition OS control planes.

## Pipeline

| Stage | Purpose | Primary task |
|---|---|---|
| Rules | Check Upwork platform rules and action limits. | `docs/upwork-platform-rules.md` |
| Autonomy | Resolve agent authority and execution channel. | `docs/autonomous-ops-policy.md` |
| Plan | Set daily target, category focus, risk appetite, and Connects budget. | `task/plan-daily-acquisition.md` |
| Collect | Gather candidate jobs through bounded Raw CDP search into structured opportunity records. | `task/collect-opportunities.md` |
| Score | Score fit, client quality, competition, risk, and expected value. | `task/score-and-allocate-connects.md` |
| Productize | Check offer and portfolio gaps, then improve directly useful assets. | `task/run-autonomous-acquisition-cycle.md` |
| Package | Build proposal packages with pricing, showcase, answers, and risk notes. | `task/build-proposal-packages.md` |
| Authorize | Set `draft_only`, `prefill_only`, or `submit_authorized` for specific package IDs. | `docs/authorization-policy.md` |
| Execute | Use Raw CDP only for authorized human-like actions and write observations. | `task/execute-cdp-applications.md` |
| Comms | Draft, authorize, and optionally send gated Upwork replies. | `task/manage-client-comms.md` |
| Monitor | Check proposals, messages, and notifications without sending messages. | `task/monitor-outcomes.md` |
| Audit | Review outcomes and Connects efficiency, then emit policy patches. | `task/audit-and-patch-policy.md` |
| Autonomous Cycle | Run the recurring manager loop and write an archive-readable summary. | `task/run-autonomous-acquisition-cycle.md` |

## Legacy Task Mapping

| Legacy | New equivalent |
|---|---|
| `task/task-1-find-jobs.md` | `task/collect-opportunities.md` plus `task/score-and-allocate-connects.md` |
| `task/task-2-apply-jobs.md` | `task/build-proposal-packages.md` plus `task/execute-cdp-applications.md` |
| `task/task-3-monitor-bids.md` | `task/monitor-outcomes.md` |
| `task/task-4-client-comms.md` | `task/monitor-outcomes.md` for checks and message drafts only |
| `task/task-5-analytics.md` | `task/audit-and-patch-policy.md` |
| `task/task-6-optimize.md` | `task/audit-and-patch-policy.md` policy patches |

## Shared State

Structured files under `data/` are the source of truth for jobs, proposal packages, Connects ledger events, form observations, runs, outcomes, and policy patches. Markdown files remain reports and human review surfaces.

| State | Source of truth |
|---|---|
| Opportunities | `data/jobs.jsonl` |
| Autonomy plans | `data/autonomy-plans.jsonl` |
| Platform actions | `data/platform-actions.jsonl` |
| Product assets | `data/product-assets.jsonl` |
| Proposal packages | `data/proposal-packages.jsonl` |
| Connects spend | `data/connects-ledger.jsonl` |
| Form observations | `data/form-observations.jsonl` |
| Message packages | `data/message-packages.jsonl` |
| Runs | `data/runs.jsonl` |
| Outcomes | `data/outcomes.jsonl` |
| Policy patches | `data/policy-patches.jsonl` |

## Safety Rules

- Default execution mode is `prefill_only`.
- Submit requires `submit_authorized` for specific job IDs or proposal package IDs.
- Raw CDP is allowed for bounded, human-like search, inspection, proposal, monitoring, and message operations.
- Buying Connects is always forbidden.
- Boosting requires separate specific authorization.
- Unknown required fields pause execution.
- Raw CDP is the execution hand, not the policy engine.
- Every live execution run writes a session file.

## Tool Stack

| Tool | Purpose | Location |
|---|---|---|
| Raw CDP Cycle Script | Legacy local browser execution reference | `tools/upwork_raw_cdp_cycle.mjs` |
| CDP Utils | Shared Raw CDP reference | `docs/cdp-utils.md` |
| Showcase Catalog | Reusable proof and offer assets | `profile/showcase-catalog.yml` |
| Session Template | Execution record template | `templates/session-log-template.md` |
