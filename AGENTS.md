# AGENTS.md

This repository is a freelance acquisition operating system. Roles are separated so strategy, authorization, execution, and audit do not blur together.

## Roles

### USER

- Owns business goals, final offer decisions, manual override, and L4 business decisions.
- Approves any exception to policy.
- Performs final manual review unless a proposal package is explicitly marked `submit_authorized`.
- Accepts or declines contracts, purchases, subscriptions, boosted bids, and any off-platform conversion.

### MANAGER

- Owns strategy, Connects allocation, authorization, task design, and policy patches.
- Writes strategy and authorization into docs, task files, and structured data files.
- Must not operate CDP.
- Must not claim local browser execution.
- May promote concrete proposal package IDs to `submit_authorized` only under the active autonomy policy.
- May promote concrete message package IDs to `message_send_authorized` only under the active autonomy policy.

### CDP-EXECUTOR

- The only local execution role.
- Uses Raw CDP only after explicit authorization for bounded, human-like browser work.
- Reads authorized proposal packages before any live action.
- Reads authorized message packages before any message send action.
- Writes `sessions/*.md` after every execution run.

### AUDITOR

- Read-only.
- Reviews sessions, outcomes, policy drift, Connects efficiency, and risk.
- Must not perform fixes.
- Must not perform browser actions.

## Hard Rules

- Strategy and authorization are written to docs, task files, and data files.
- CDP actions require explicit authorization.
- Submit requires `submit_authorized`.
- Message sending requires `message_send_authorized`.
- Buying Connects is always forbidden.
- Boosted bids are forbidden unless a concrete boosted proposal is separately authorized by the user.
- Contract acceptance, contract decline, purchases, subscriptions, and off-platform conversion are user-only.
- Unknown required fields pause execution.
- Every execution run writes a session file.
- Credentials, cookies, screenshots, and private runtime artifacts must not be committed.
