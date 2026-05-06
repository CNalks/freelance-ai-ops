# Monitor Outcomes

## Goal

Check proposal, message, and notification state without sending messages.

## Inputs

- Submitted or prefilled proposal package records.
- Existing outcome records.
- Authorization policy.

## Outputs

- Outcome records.
- Session log.
- Optional human-readable monitoring report.

## Steps

1. Read proposal package and outcome records.
2. Use Raw CDP only when an authorized monitoring run requires live state.
3. Check proposal state at `/nx/proposals/`.
4. Check messages at `/ab/messages/rooms/` and notifications at `/ab/notifications/`.
5. Record outcomes without sending replies.
6. Write session and run records.

## Stop Conditions

- Session expired or login page.
- CAPTCHA, verification, or abnormal popup.
- A client message requires a response decision.
- Any action would send a message, accept work, decline work, or purchase anything.
- Message or notification pages require a response decision.

## Files To Read

- `docs/authorization-policy.md`
- `docs/cdp-utils.md`
- `data/proposal-packages.jsonl`
- `data/outcomes.jsonl`
- `templates/session-log-template.md`

## Files To Write

- `data/outcomes.jsonl`
- `data/runs.jsonl`
- `sessions/*.md`
- Optional `docs/messages.md` drafts when requested.

## Session Requirements

Every live monitoring run writes `sessions/*.md`.

## Safety Rules

- Read-only browser behavior.
- Do not send messages.
- Do not accept or decline contracts.
- Do not buy Connects.
- Do not submit proposals.
- Do not use older `/nx/messages/` or `/nx/notifications/` as the only verification route when `/ab/*` pages are available.
