# Codex Automations

Automations must follow `docs/authorization-policy.md`. A schedule or prompt does not grant submit authority by itself.

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
In C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops, execute only the specified submit_authorized proposal package IDs.

Use Raw CDP only.
Read docs/authorization-policy.md and task/execute-cdp-applications.md before any live action.
Submit only if all required gates pass.
Stop on any forbidden condition.
Write data/form-observations.jsonl and sessions/*.md.
Never click Buy Connects or any purchase/payment button.
Never send client messages.
```

## Relationship Between Modes

`Dry Run` creates plans and packages. `Prefill Only` can fill authorized fields and stops before submit. `Submit Authorized` is scoped to specific proposal package IDs and expires with that authorization.

The retired legacy auto-apply instruction is no longer valid.
