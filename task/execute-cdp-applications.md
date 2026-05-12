# Execute CDP Applications

## Goal

Execute authorized proposal package actions through bounded human-like Raw CDP while keeping CDP subordinate to policy authorization.

## Inputs

- Authorized proposal package IDs.
- Authorization policy.
- Connects policy.
- Session log template.
- Delegated submit run authority, when present.

## Outputs

- Form observations.
- Inspected package gate decisions.
- Session log.
- Updated run record.
- Platform action record.
- Optional proposal tracker report.

## Steps

1. Read proposal packages before opening any live page.
2. Confirm each package mode and max Connects.
3. Reject any package not listed by concrete ID for this run.
4. Use Raw CDP only as bounded human-like browser operation.
5. Open the job page and proposal form for `prefill_only` or `submit_authorized` packages.
6. Inspect form structure before any submit decision.
7. Record Connects cost, observed balance, required fields, optional fields, warnings, and blockers.
8. Stop final submit on unknown required fields.
9. Fill only authorized fields.
10. Promote a concrete package ID to `submit_authorized` only after inspected gates pass under delegated run authority.
11. Record submit button visibility, boost state, purchase UI, qualification warnings, and validation errors.
12. Write form observations, platform action records, and session record.
13. Submit only with `submit_authorized` and all gates passed.

## Stop Conditions

- Package mode is `draft_only`.
- Unknown required fields before final submit.
- Connects cost missing before final submit.
- Connects balance missing before final submit.
- Connects cost exceeds `max_authorized_connects`.
- Planned Connects spend exceeds observed balance.
- Buy Connects wall.
- Payment or purchase button.
- Job closed or no longer accepting.
- Qualification warning that changes bid risk.
- External communication or payment request.
- Free test work.
- Session expired or login page.
- Package ID was not specifically authorized in the delegated run.
- Boost UI is selected or required.
- Raw CDP action exceeds active volume limits or task scope.
- Fixed-price budget is below `$500`.
- Fixed-price bid is not the approved `$300` or `$500` first-milestone amount.

## Files To Read

- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `docs/cdp-utils.md`
- `data/proposal-packages.jsonl`
- `data/schemas/form-observation.schema.json`
- `data/schemas/platform-action.schema.json`
- `templates/session-log-template.md`

## Files To Write

- `data/form-observations.jsonl`
- `data/platform-actions.jsonl`
- `data/runs.jsonl`
- `sessions/*.md`
- Human report files only when requested.

## Session Requirements

Every execution run writes `sessions/*.md` using `templates/session-log-template.md`, even if no form is filled.

## Safety Rules

- Use Raw CDP only as bounded human-like browser operation.
- Never buy Connects.
- Never click payment or purchase buttons.
- Never send client messages.
- Submit only with `submit_authorized` and all gates passed.
- Treat `prefill_only` form observation as inspection, not a failed execution.
- Do not guess unknown required fields.
- Never submit a package just because the run has general delegated authority; the package itself must be `submit_authorized`.
- Fixed-price cover letters must say the bid is for a first milestone, not the full project.
