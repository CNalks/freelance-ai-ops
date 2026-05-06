# Workflow - Acquisition OS

The current operating model is:

```text
Plan -> Collect -> Score -> Package -> Authorize -> Execute -> Monitor -> Audit
```

This replaces the old linear Task 1-6 framing. Task files are executable work orders; policy and authorization live in the Acquisition OS control planes.

## Pipeline

| Stage | Purpose | Primary task |
|---|---|---|
| Plan | Set daily target, category focus, risk appetite, and Connects budget. | `task/plan-daily-acquisition.md` |
| Collect | Gather candidate jobs into structured opportunity records. | `task/collect-opportunities.md` |
| Score | Score fit, client quality, competition, risk, and expected value. | `task/score-and-allocate-connects.md` |
| Package | Build proposal packages with pricing, showcase, answers, and risk notes. | `task/build-proposal-packages.md` |
| Authorize | Set `draft_only`, `prefill_only`, or `submit_authorized` for specific package IDs. | `docs/authorization-policy.md` |
| Execute | Use Raw CDP only for authorized actions and write form observations. | `task/execute-cdp-applications.md` |
| Monitor | Check proposals, messages, and notifications without sending messages. | `task/monitor-outcomes.md` |
| Audit | Review outcomes and Connects efficiency, then emit policy patches. | `task/audit-and-patch-policy.md` |

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
| Proposal packages | `data/proposal-packages.jsonl` |
| Connects spend | `data/connects-ledger.jsonl` |
| Form observations | `data/form-observations.jsonl` |
| Runs | `data/runs.jsonl` |
| Outcomes | `data/outcomes.jsonl` |
| Policy patches | `data/policy-patches.jsonl` |

## Safety Rules

- Default execution mode is `prefill_only`.
- Submit requires `submit_authorized` for specific job IDs or proposal package IDs.
- Buying Connects is always forbidden.
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
