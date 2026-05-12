# Codex Automations

Automations must follow `docs/upwork-platform-rules.md`, `docs/autonomous-ops-policy.md`, and `docs/authorization-policy.md`. A schedule or prompt does not grant submit, message, purchase, boost, or contract authority by itself.

## Installed Workflow Set

The current active workflow set is documented in `docs/automation-workflows.md`:

- `upwork-daily-acquisition`
- `upwork-monitor-comms`
- `upwork-connects-governance`
- `upwork-product-assets`
- `upwork-weekly-audit`

## Mode 1: Dry Run

Use for planning, scoring, packaging, and audit work.

Allowed:

- Read docs and structured data.
- Create or update proposal packages.
- Produce manager handoffs.
- Produce audit reports and policy patches.

Forbidden:

- Submit proposals.
- Buy Connects.
- Send client messages.
- Accept or decline contracts.
- Run live CDP unless explicitly authorized for safe collection.

Prompt shape:

```text
In C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops, run the Acquisition OS planning and packaging flow.

Read docs/acquisition-os-architecture.md, docs/authorization-policy.md, docs/connects-policy.md, and profile/showcase-catalog.yml.
Do not submit proposals.
Do not buy Connects.
Do not send client messages.
Do not run live CDP unless the task explicitly authorizes safe collection.
```

## Mode 2: Prefill Only

Use when the manager has produced proposal package IDs with mode `prefill_only`.

Allowed:

- Open job page.
- Open proposal form.
- Discover form.
- Fill authorized fields.
- Write form observations.
- Write session.
- Stop before final submit.

Forbidden:

- Click Submit.
- Click Send Proposal.
- Click Buy Connects.
- Click purchase or payment buttons.
- Send client messages.

Prompt shape:

```text
In C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops, execute only the specified proposal package IDs in prefill_only mode.

Use Raw CDP only.
Read docs/authorization-policy.md before any live action.
Read task/execute-cdp-applications.md and the authorized proposal packages.
Discover the form before filling.
Stop on unknown required fields.
Write data/form-observations.jsonl and sessions/*.md.
Do not click Submit or Send Proposal.
Do not buy Connects.
Do not send messages.
```

## Mode 3: Submit Authorized

Use only for proposal package IDs explicitly marked `submit_authorized`.

Allowed:

- Open job page.
- Discover form.
- Fill fields.
- Submit only the explicitly authorized package IDs if every gate passes.

Required gates:

- Package ID is explicitly authorized.
- Job ID is explicitly authorized.
- Connects cost is observed.
- Connects cost is less than or equal to `max_authorized_connects`.
- No unknown required fields.
- No Buy Connects wall.
- No payment or purchase button.
- No off-platform payment request.
- No free test task requirement.
- Form validation passes.
- Proposal package has cover letter, rate or bid, showcase selection, and risk note.

Forbidden:

- Buy Connects.
- Submit packages not listed in the authorization.
- Send client messages.
- Accept or decline contracts.

Prompt shape:

```text
In C:\Users\a8744\Desktop\for-codex\freelance-ai-ops, execute only the specified submit_authorized proposal package IDs.

Use Raw CDP only.
Read docs/authorization-policy.md and task/execute-cdp-applications.md before any live action.
Submit only if all required gates pass.
Stop on any forbidden condition.
Write data/form-observations.jsonl and sessions/*.md.
Never click Buy Connects or any purchase/payment button.
Never send client messages.
```

## Mode 4: Autonomous Manager Cycle

Use for periodic planning, bounded Raw CDP search, product work, packaging, Connects allocation, authorized proposal actions, authorized message actions, and audit reporting.

Allowed:

- Read platform rules, autonomy policy, authorization policy, Connects policy, pricing, showcase catalog, and structured state.
- Improve proposal templates, product offers, showcase notes, and docs when they directly support target categories.
- Use `raw_cdp_humanlike` for bounded search, inspection, monitoring, proposal, or reply actions when the active autonomy plan allows it.
- Create proposal packages.
- Promote concrete package IDs to `submit_authorized` only when delegated submit is active and every gate passes.
- Promote concrete message package IDs to `message_send_authorized` only when delegated messages are active and every gate passes.
- Write run records, bid tracker records, policy patches, and archive-readable summaries with found jobs, submitted count, tracked bids, and observed Connects state.

Forbidden:

- Bulk crawling, high-frequency polling, credential replay, or unbounded Raw CDP.
- Submit proposals without concrete `submit_authorized` package IDs.
- Send client messages without concrete `message_send_authorized` package IDs.
- Buy Connects.
- Boost proposals.
- Accept or decline contracts.
- Share off-platform contact or payment information.

Prompt shape:

```text
In C:\Users\a8744\Desktop\for-codex\freelance-ai-ops, run task/run-autonomous-acquisition-cycle.md.

Read docs/upwork-platform-rules.md, docs/autonomous-ops-policy.md, docs/authorization-policy.md, docs/connects-policy.md, docs/pricing.md, and profile/showcase-catalog.yml first.
Use execution_channel=raw_cdp_humanlike with the default volume limits from docs/autonomous-ops-policy.md.
Use Raw CDP only as bounded human-like browser operation, not full-site crawling or hidden API scraping.
Do not submit proposals unless a concrete package is submit_authorized and every gate passes.
Do not buy Connects.
Do not boost proposals.
Do not send client messages unless a concrete message package is message_send_authorized and every gate passes.
Do not accept or decline contracts.
Write a concise archive-readable summary of what changed, what is authorized, and what is blocked.
When using the runner directly, use node tools/acquisition_os_live_test.mjs --git-closeout so the exact run outputs are validated, committed, and pushed.
```

## Mode 5: Approved Platform Operator

Use only after Upwork API approval is documented for the exact action scope.

Allowed:

- Execute only the API actions that match the approved scope.
- Submit or send only concrete package IDs that pass the relevant gates.
- Write sessions, ledgers, outcomes, and run summaries.

Forbidden:

- Website scraping through the API client.
- Browser session cookies or exported tokens.
- Actions outside the approved API scope.
- Buying Connects, boosting, subscriptions, or contract decisions unless separately authorized and platform-approved.

## Relationship Between Modes

`Dry Run` creates plans and packages. `Prefill Only` can fill authorized fields and stops before submit. `Submit Authorized` is scoped to specific proposal package IDs and expires with that authorization. `Autonomous Manager Cycle` is the default recurring mode. `Approved Platform Operator` is available only when the execution channel is approved for the exact platform action.

The retired legacy auto-apply instruction is no longer valid.
