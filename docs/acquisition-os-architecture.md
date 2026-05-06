# Acquisition OS Architecture

## North Star

Maximize qualified client responses and contract wins per Connect spent while protecting Upwork account trust, proposal quality, and user attention.

## Non-Goals

- More raw proposals.
- Blind auto-submit.
- Bulk low-quality bidding.

## Control Planes

### 1. Intent Plane

Defines business mode, target outcomes, risk appetite, preferred job types, and avoid-list.

### 2. Policy Plane

Scores opportunities, allocates Connects, and decides `skip`, `draft_only`, `prefill_only`, or `submit_authorized`.

### 3. Offer Plane

Maps job categories to profile positioning, proof assets, demos, proposal angles, pricing anchors, and clarifying questions.

### 4. Execution Plane

Uses Raw CDP only after an action is authorized. It discovers proposal form structure before filling and records exact form observations and blockers.

### 5. Memory Plane

Stores jobs, proposals, Connects, form observations, runs, messages, and outcomes as structured data. Markdown can remain as reporting, but JSONL/YAML is the source of truth for state.

### 6. Audit & Learning Plane

Reviews outcomes and emits policy patches, not generic advice.

## Core Object Model

| Object | Purpose |
|---|---|
| `Opportunity` | A potential Upwork job with scoring inputs and policy decision fields. |
| `Client` | Buyer quality signals such as verification, spend, country, hire history, and risk markers. |
| `Job` | The live Upwork job details, scope, budget, skills, and status. |
| `Offer` | The proposed service shape, price, scope framing, and milestone logic. |
| `ShowcasePack` | Reusable profile, demo, and proof assets matched to job category. |
| `ProposalPackage` | Authorized proposal content, pricing, risk notes, and stop conditions. |
| `ConnectsBudget` | Weekly budget, daily cap, reserved Connects, and spend ledger rules. |
| `Authorization` | The allowed action mode and max Connects for a specific job or package. |
| `FormObservation` | Actual form fields, warnings, Connects cost, blockers, and submit safety state. |
| `ExecutionSession` | A run record with inputs, actions, evidence, files changed, and result. |
| `Outcome` | Client response, interview, contract, loss, withdrawal, or other result. |
| `PolicyPatch` | A proposed change to scoring, budget, offer positioning, or stop rules. |

## Data Flow

1. Collect opportunities.
2. Score opportunities.
3. Allocate Connects.
4. Build proposal package.
5. Authorize action.
6. Execute via CDP.
7. Record session.
8. Update memory.
9. Audit and patch policy.

## Legacy Task Redirect

Existing Task 1-6 files are legacy task shapes. They should be redirected toward the new acquisition pipeline:

`Plan -> Collect -> Score -> Package -> Authorize -> Execute -> Monitor -> Audit`

The task files can remain for historical context, but they must not override the authorization policy.
