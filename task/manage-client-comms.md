# Manage Client Communications

## Goal

Monitor and prepare client communication while keeping negotiation inside Upwork and within the active autonomy level.

## Inputs

- Active autonomy level and platform channel.
- Existing proposal packages and outcomes.
- Pricing policy.
- Client templates.
- Upwork platform rules.

## Outputs

- Message observations.
- Draft replies.
- Concrete `message_send_authorized` records in `data/message-packages.jsonl` only when all gates pass.
- Session and run records for any live platform inspection.

## Steps

1. Read `docs/upwork-platform-rules.md`, `docs/autonomous-ops-policy.md`, and `docs/authorization-policy.md`.
2. Confirm whether the task is draft-only, monitor-only, or message-send-authorized.
3. If live message inspection is authorized, use only the declared execution channel.
4. Classify each thread as interview, scope question, pricing question, contract offer, off-platform request, suspicious request, or job alert.
5. Draft replies from `profile/client-templates/` and `docs/pricing.md`.
6. Mark replies `message_send_authorized` only when every message gate passes.
7. Send only concrete `message_send_authorized` replies when the execution channel is allowed.
8. Record outcomes, blockers, and drafts.

## Stop Conditions

- Execution channel is not allowed.
- Raw CDP action exceeds active volume limits or task scope.
- Session expired, CAPTCHA, verification, Cloudflare, or abnormal platform state.
- Client asks for off-platform contact or payment.
- Message includes suspicious links, abusive content, or free test work.
- Reply would accept or decline a contract.
- Reply would agree to a price exception.
- Reply would share contact information before a contract starts.
- Reply needs more than two clarification questions.
- Thread content is ambiguous.

## Files To Read

- `docs/upwork-platform-rules.md`
- `docs/autonomous-ops-policy.md`
- `docs/authorization-policy.md`
- `docs/pricing.md`
- `profile/client-templates/`
- `data/proposal-packages.jsonl`
- `data/message-packages.jsonl`
- `data/outcomes.jsonl`
- `templates/session-log-template.md`

## Files To Write

- `docs/messages.md`
- `data/message-packages.jsonl`
- `data/outcomes.jsonl`
- `data/runs.jsonl`
- `sessions/*.md` when live platform inspection is used.

## Safety Rules

- Keep all pre-contract communication on Upwork.
- Never buy Connects.
- Never accept or decline contracts.
- Never send off-platform contact or payment information.
- Never send messages unless a concrete message is authorized and the execution channel is allowed.
