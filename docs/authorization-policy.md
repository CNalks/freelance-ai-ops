# Authorization Policy

This policy resolves submit authority for the acquisition system. Task files and automations cannot grant broader authority than this document.

## Default Mode

Default mode is `prefill_only` unless the user or manager policy explicitly sets `submit_authorized`.

## Authorization Modes

```yaml
draft_only:
  allowed:
    - generate proposal text
    - generate pricing suggestion
    - generate form answer drafts
  forbidden:
    - open submit form
    - fill live form
    - submit

prefill_only:
  allowed:
    - open job page
    - open proposal form
    - discover form
    - fill authorized fields
    - stop before final submit
  forbidden:
    - click Submit
    - click Send Proposal
    - click Buy Connects

submit_authorized:
  allowed:
    - open job page
    - discover form
    - fill fields
    - submit only if all gates pass
  required_gates:
    - job_id is explicitly authorized
    - connects_cost <= authorized max_connects
    - no unknown required fields
    - no Buy Connects wall
    - no payment/purchase button
    - no off-platform payment request
    - no free test task requirement
    - form validation passes
    - proposal package has cover letter, rate/bid, showcase selection, and risk note
```

## Forbidden Conditions

Stop if any condition appears:

- Unknown required fields.
- Connects cost missing.
- Connects cost exceeds authorization.
- Job closed or no longer accepting.
- Qualification warning that changes bid risk.
- Fixed-price scope unclear and no approved milestone.
- External communication or payment request.
- Free test work.
- Buy Connects or purchase wall.
- Session expired or login page.

## Automation Rule

`docs/codex-automations.md` must not contain unconditional instructions that Codex must click Submit.

Auto-submit authorization must expire and must be scoped to specific job IDs or proposal package IDs. A general automation prompt is not enough to authorize submit.
