# Authorization Policy

This policy resolves submit authority for the acquisition system. Task files and automations cannot grant broader authority than this document.

## Default Mode

Default mode is `prefill_only` unless the user or manager policy explicitly sets `submit_authorized`.

In delegated submit runs, `submit_authorized` may be assigned only after the apply form has been inspected and the concrete package ID passes all submit gates.

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
    - inspect Connects cost and balance
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
    - connects_cost <= observed Connects balance
    - no unknown required fields
    - no Buy Connects wall
    - no payment/purchase button
    - no off-platform payment request
    - no free test task requirement
    - form validation passes
    - proposal package has cover letter, rate/bid, showcase selection, and risk note
    - fixed-price bids, if any, are approved first-milestone amounts
```

## Forbidden Conditions

Stop if any condition appears:

- Unknown required fields.
- Connects cost missing.
- Connects balance missing.
- Connects cost exceeds authorization.
- Connects cost exceeds observed balance.
- Job closed or no longer accepting.
- Qualification warning that changes bid risk.
- Fixed-price scope unclear and no approved milestone.
- Fixed-price budget below `$500` for auto-submit.
- Fixed-price bid is not the approved `$300` or `$500` first-milestone amount.
- External communication or payment request.
- Free test work.
- Buy Connects or purchase wall.
- Session expired or login page.

## Automation Rule

`docs/codex-automations.md` must not contain unconditional instructions that Codex must click Submit.

Auto-submit authorization must expire and must be scoped to specific job IDs or proposal package IDs. A general automation prompt is not enough to authorize submit.
