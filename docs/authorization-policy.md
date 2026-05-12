# Authorization Policy

This policy resolves submit authority for the acquisition system. Task files and automations cannot grant broader authority than this document or `docs/autonomous-ops-policy.md`.

## Delegated Operating Mandate

The user may grant agents broad business discretion for acquisition operations. That mandate lets the manager create and promote concrete proposal package IDs to `submit_authorized` without a separate user message for each package.

The mandate does not remove item-level gates:

- Submit authority must remain scoped to specific proposal package IDs and job IDs.
- Platform execution must use a channel allowed by `docs/upwork-platform-rules.md`.
- Buying Connects, boosted proposals, contract acceptance, contract decline, subscriptions, and off-platform conversion remain separate authorities.
- Client messages require concrete `message_send_authorized` records.
- Every live execution writes a session file.

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
    - active operating mandate allows delegated submit or user explicitly authorized this package
    - job_id is explicitly authorized
    - proposal package ID is explicitly authorized
    - platform execution channel is allowed
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

message_send_authorized:
  allowed:
    - open existing Upwork message thread
    - send only the authorized reply text
  required_gates:
    - active operating mandate allows delegated messages or user explicitly authorized this message
    - message package ID is explicitly authorized
    - execution channel is allowed
    - existing Upwork thread URL is present
    - reply contains no off-platform contact information
    - reply contains no off-platform payment request or link
    - reply does not accept or decline a contract
    - reply does not agree to a price exception
    - reply asks at most two clarification questions
    - reply is under 150 words unless the client explicitly requested detail
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
- Execution channel is not allowed by `docs/upwork-platform-rules.md`.
- Raw CDP action would exceed active volume limits or task scope.
- Boost UI is selected or required without specific boost authorization.
- Message would share contact information, request off-platform payment, accept or decline a contract, or agree to a price exception.

## Automation Rule

`docs/codex-automations.md` must not contain unconditional instructions that Codex must click Submit.

Auto-submit authorization must expire and must be scoped to specific job IDs or proposal package IDs. A general automation prompt is not enough to authorize submit.
