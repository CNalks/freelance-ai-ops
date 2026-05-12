# Monitor Outcomes

## Goal

Check proposal, message, and notification state, then hand off any replies to the message package flow.

## Inputs

- Submitted or prefilled proposal package records.
- Existing outcome records.
- Authorization policy.

## Outputs

- Outcome records.
- Message package drafts when a client thread needs a reply.
- Session log.
- Optional human-readable monitoring report.

## Steps

1. Read proposal package and outcome records.
2. Use bounded human-like Raw CDP only when an authorized monitoring run requires live state.
3. Check proposal state at `/nx/proposals/`.
4. Check messages at `/ab/messages/rooms/` and notifications at `/ab/notifications/`.
5. Record outcomes without sending replies.
6. Create draft message packages for reply-worthy client threads.
7. Write session and run records.

## Stop Conditions

- Session expired or login page.
- CAPTCHA, verification, or abnormal popup.
- A client message requires a response decision.
- Any action would send a message, accept work, decline work, or purchase anything.
- Message or notification pages require a response decision.
- Raw CDP action exceeds active volume limits or task scope.

## Files To Read

- `docs/authorization-policy.md`
- `docs/cdp-utils.md`
- `data/proposal-packages.jsonl`
- `data/outcomes.jsonl`
- `data/message-packages.jsonl`
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
