# Build Proposal Packages

## Goal

Build proposal packages from selected opportunities and reusable showcase packs.

## Inputs

- Selected opportunities.
- Manager authorization decisions.
- Showcase catalog.
- Pricing policy.

## Outputs

- Proposal packages with mode, max Connects, cover letter, pricing, showcase selection, risk notes, and stop conditions.

## Steps

1. Read selected opportunities and showcase catalog.
2. Choose the best showcase pack for each opportunity.
3. Draft cover letter and screening answer drafts.
4. Set rate or bid and pricing rationale.
5. Copy the authorized mode and max Connects from policy output.
6. Add risk notes and stop conditions.
7. For executable packages, include package ID, job URL, mode, max Connects, cover letter, rate or bid, pricing rationale, showcase pack ID, screening answer drafts, risk notes, and stop conditions.
8. Write proposal package records.

## Stop Conditions

- No suitable showcase pack.
- Missing authorization mode.
- Missing max Connects for a package that can enter a live form.
- Scope is too unclear to write risk notes.
- Cover letter, pricing, showcase selection, or stop conditions are missing.

## Files To Read

- `docs/authorization-policy.md`
- `docs/connects-policy.md`
- `docs/pricing.md`
- `profile/showcase-catalog.yml`
- `data/jobs.jsonl`
- `data/schemas/proposal-package.schema.json`

## Files To Write

- `data/proposal-packages.jsonl`
- Optional human review notes in Markdown.

## Session Requirements

No CDP session is required. Record the run in `data/runs.jsonl` when proposal package records are written.

## Safety Rules

- Do not open live forms.
- Do not submit.
- Do not infer missing authorization.
- Stop if a required field must be answered from live form data that has not been observed.
- Fixed-price bid amounts require a bounded pricing rationale before package execution.
