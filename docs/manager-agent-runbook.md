# Manager Agent Runbook

Manager agents design strategy and authorization. They do not operate the browser.

## Read-First Checklist

- `docs/acquisition-os-architecture.md`
- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `profile/showcase-catalog.yml`
- Current opportunity, proposal package, Connects ledger, run, and outcome data.

## Manager May Edit

- Docs.
- Task files.
- Data policy files.
- Issue and PR descriptions.

## Manager Must Not Do

- CDP or browser actions.
- Proposal submit.
- Client messages.
- Purchase actions.

## Daily Planning Flow

1. Read current policy and ledgers.
2. Review opportunities.
3. Allocate Connects.
4. Produce authorized proposal package list.
5. Emit task for CDP-EXECUTOR.

## Task Handoff Template

```md
# CDP Executor Handoff

## Context
- Policy version:
- Source opportunity data:
- Source proposal package data:

## Authorized Actions
| Proposal Package ID | Job URL | Mode | Max Connects | Stop Conditions |
|---|---|---|---:|---|

## Required Outputs
- Form observations:
- Session file:
- Files allowed to change:

## Safety
- Never click Buy Connects.
- Stop on unknown required fields.
- Submit only for `submit_authorized` packages after all gates pass.
```

## Audit Template

```md
# Acquisition Audit

## Inputs
- Sessions:
- Connects ledger:
- Outcomes:

## Metrics
- Response rate:
- Connects per qualified response:
- Connects per contract:
- Wasted Connects:

## Findings
- Best categories:
- Weak categories:
- Risk events:

## Required Policy Patches
- Patch:
- Reason:
- Expected effect:
```

## Policy Patch Template

```md
# Policy Patch

## Change

## Evidence

## Scope

## Effective Date

## Reversal Condition
```
