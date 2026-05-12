# Autonomous Ops Policy

## Objective

Delegate day-to-day Upwork acquisition operations to agents as far as the platform rules and account-risk limits allow, with the goal of earning first revenue quickly and then increasing qualified revenue per Connect.

## Operating Mandate

The user grants agents authority to make acquisition decisions inside this repo:

- Choose target categories and offers.
- Design and improve service products, demos, proposal templates, and proof assets.
- Allocate available Connects within the active budget and reserve floor.
- Build proposal packages.
- Promote concrete proposal package IDs to `submit_authorized` when all policy gates pass.
- Draft client replies and negotiation positions.
- Produce audit reports and policy patches for archived review.

This mandate does not authorize platform actions that Upwork disallows, and it does not authorize buying Connects, accepting contracts, declining contracts, sharing off-platform contact information, moving payment off Upwork, or sending messages without the message gates below.

The active mandate is recorded in `data/autonomy-plans.jsonl` with `status: "active"` and a future `expires_at`. A recurring cycle without an active, unexpired plan must stop before live platform action.

## Autonomy Levels

| Level | Name | Agent authority | Platform action |
|---|---|---|---|
| L0 | Strategy only | Plan, score, package, audit, and improve assets. | None. |
| L1 | Human-like inspection | Search, inspect pages, inspect forms, and monitor state after run authorization. | Raw CDP, session required. |
| L2 | Delegated submit | Submit only concrete `submit_authorized` package IDs that pass all gates. | Only through an authorized and compliant channel. |
| L3 | Delegated messages | Send only concrete `message_send_authorized` replies that pass all gates. | Only through an authorized and compliant channel. |
| L4 | Business decision | Contract acceptance, contract decline, purchases, subscriptions, boosted bids, off-platform conversion. | User only. |

## Platform Channel Gate

Every platform action must declare one execution channel:

| Channel | Allowed use |
|---|---|
| `none` | Planning, packaging, product work, and audit only. |
| `raw_cdp_humanlike` | Bounded human-like search, inspection, proposal, monitoring, and message actions with a session file. |
| `approved_api` | API actions inside the exact approved Upwork API scope. |
| `user_manual` | Agent prepares instructions or drafts; user performs the platform action. |

Periodic jobs may use `raw_cdp_humanlike` when the task has a concrete objective, a low-volume limit, an active autonomy plan, and session logging. They must not perform bulk crawling, high-frequency polling, credential replay, or unbounded background collection.

## Default Volume Limits

- Search sources per cycle: 3.
- Job pages inspected per cycle: 20.
- Proposal forms inspected per cycle: 5.
- Proposals submitted per cycle: 3.
- Message threads inspected per cycle: 10.
- Messages sent per cycle: 5.

The manager may lower these limits for risk. Raising them requires a policy patch with evidence.

## Proposal Submission Gates

Delegated submit is allowed only when all conditions are true:

- Active operating mandate allows delegated submit for this run.
- Package ID and job ID are concrete.
- Package mode is `submit_authorized`.
- Execution channel is allowed by `docs/upwork-platform-rules.md`.
- Observed Connects cost is present.
- Observed Connects balance is present.
- Cost is within package cap, daily cap, weekly cap, and reserve floor.
- No unknown required fields.
- No Buy Connects, purchase, payment, boost, or subscription UI is selected.
- No off-platform contact or payment request.
- No free test work.
- Pricing satisfies `docs/pricing.md`.
- Fixed-price bid is an approved first milestone amount.
- Session and ledger outputs are written.

## Message Gates

Delegated message sending is allowed only when all conditions are true:

- Message is a reply inside an existing Upwork conversation.
- Message package ID is concrete in `data/message-packages.jsonl` and marked `message_send_authorized`.
- Execution channel is allowed by `docs/upwork-platform-rules.md`.
- Reply does not include contact information, payment links, external chat handles, or off-platform scheduling.
- Reply does not accept or decline a contract.
- Reply does not agree to a price below policy floors.
- Reply asks at most two clarification questions.
- Reply is under 150 words unless the client explicitly requested detail.

Escalate to the user instead of sending when the message involves a contract offer, legal terms, NDA, identity documents, account access, off-platform contact, off-platform payment, abusive content, suspicious links, or a price exception.

## Connects Strategy

Connects are operating capital.

- Maintain a reserve floor before any delegated submit run.
- Spend early Connects on high-fit, clear-scope jobs with credible clients and low or moderate competition.
- Track official free-Connects opportunities without gaming rewards.
- Do not buy Connects.
- Do not boost unless a specific boosted proposal is explicitly authorized.
- Prefer interview probability and first-contract probability over proposal volume.

## Product Strategy

Agents may autonomously improve assets that make proposals stronger:

- Focused productized offers.
- Portfolio demos.
- Proposal templates.
- Client reply templates.
- Pricing notes.
- Case-study style proof pages based on real demos.

Product work must stay aligned to the current showcase catalog and pricing policy. Do not invent credentials, client history, or results.

## Reporting

Each autonomous cycle should produce an archive-readable summary:

- Run objective.
- Budget and reserve state.
- Packages created or authorized.
- Found jobs, submitted count, tracked bids, and observed Connects state.
- Platform actions attempted or blocked.
- Connects spend, earned rewards, and balance observations.
- Messages drafted or sent.
- Outcomes and next policy patch.
