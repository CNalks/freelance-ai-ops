# Execute CDP Applications

## Goal

Execute authorized proposal package actions through Raw CDP while keeping CDP subordinate to policy authorization.

## Inputs

- Authorized proposal package IDs.
- Authorization policy.
- Connects policy.
- Session log template.
- Delegated submit run authority, when present.

## Outputs

- Form observations.
- Session log.
- Updated run record.
- Optional proposal tracker report.

## Steps

1. Read authorized proposal packages before opening any live page.
2. Confirm each package mode and max Connects.
3. Reject any package not listed by concrete ID for this run.
4. Use Raw CDP only.
5. Open the job page and proposal form only when mode allows it.
6. Discover form structure before filling.
7. Record Connects cost, required fields, optional fields, warnings, and blockers.
8. Stop on unknown required fields.
9. Fill only authorized fields.
10. Respect authorization mode.
11. Write form observations and session record.
12. Submit only with `submit_authorized` and all gates passed.

## Stop Conditions

- Package mode is `draft_only`.
- Unknown required fields.
- Connects cost missing.
- Connects cost exceeds `max_authorized_connects`.
- Buy Connects wall.
- Payment or purchase button.
- Job closed or no longer accepting.
- Qualification warning that changes bid risk.
- External communication or payment request.
- Free test work.
- Session expired or login page.
- Package ID was not specifically authorized in the delegated run.
- Boost UI is selected or required.

## Files To Read

- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `docs/cdp-utils.md`
- `data/proposal-packages.jsonl`
- `data/schemas/form-observation.schema.json`
- `templates/session-log-template.md`

## Files To Write

- `data/form-observations.jsonl`
- `data/runs.jsonl`
- `sessions/*.md`
- Human report files only when requested.

## Session Requirements

Every execution run writes `sessions/*.md` using `templates/session-log-template.md`, even if no form is filled.

## Safety Rules

- Use Raw CDP only.
- Never buy Connects.
- Never click payment or purchase buttons.
- Never send client messages.
- Submit only with `submit_authorized` and all gates passed.
- Do not guess unknown required fields.
- Never submit a package just because the run has general delegated authority; the package itself must be `submit_authorized`.
