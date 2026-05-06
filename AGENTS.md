# AGENTS.md

This repository is a freelance acquisition operating system. Roles are separated so strategy, authorization, execution, and audit do not blur together.

## Roles

### USER

- Owns business goals, budget, final offer decisions, and manual override.
- Approves any exception to policy.
- Performs final manual review unless a proposal package is explicitly marked `submit_authorized`.

### MANAGER

- Owns strategy, Connects allocation, authorization, task design, and policy patches.
- Writes strategy and authorization into docs, task files, and structured data files.
- Must not operate CDP.
- Must not claim local browser execution.

### CDP-EXECUTOR

- The only local execution role.
- Uses Raw CDP only after explicit authorization.
- Reads authorized proposal packages before any live action.
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
- Buying Connects is always forbidden.
- Unknown required fields pause execution.
- Every execution run writes a session file.
- Credentials, cookies, screenshots, and private runtime artifacts must not be committed.
