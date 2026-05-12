# Improve Product Assets

## Goal

Improve productized offers, proposal templates, and proof assets that increase first-contract probability for the active target categories.

## Inputs

- `profile/showcase-catalog.yml`
- `profile/proposal-templates/`
- `profile/client-templates/`
- `data/product-assets.jsonl`
- Recent `data/jobs.jsonl`
- Recent `data/proposal-packages.jsonl`

## Outputs

- Updated showcase catalog notes or asset readiness.
- Updated proposal or client templates.
- Updated `data/product-assets.jsonl`.
- A run record in `data/runs.jsonl` when structured state changes.

## Steps

1. Read the active target categories from `data/autonomy-plans.jsonl`.
2. Find partial or weak assets that appear in recent high-fit opportunities.
3. Improve only the smallest useful asset: proposal angle, first milestone offer, proof note, template, or demo README.
4. Keep every claim grounded in real portfolio work or actual capability.
5. Record what changed and why.

## Stop Conditions

- The improvement would fabricate credentials, client history, metrics, or screenshots.
- The change would broaden positioning outside the active autonomy plan.
- No recent opportunity evidence supports the asset work.

## Safety Rules

- Manager-only task.
- Do not operate CDP.
- Do not submit proposals.
- Do not send client messages.
