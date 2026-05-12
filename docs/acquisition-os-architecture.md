# Acquisition OS Architecture

## North Star

Earn first revenue quickly, then maximize qualified client responses, contract wins, and revenue per Connect while protecting Upwork account trust and proposal quality.

## Non-Goals

- More raw proposals.
- Blind auto-submit.
- Bulk low-quality bidding.
- Unapproved platform automation.
- Connects reward farming.
- Off-platform communication or payment.

## Control Planes

### 1. Intent Plane

Defines business mode, target outcomes, risk appetite, preferred job types, and avoid-list.

### 2. Platform Rules Plane

Defines Upwork Terms, automation, Connects, communication, payment, and AI-use constraints from `docs/upwork-platform-rules.md`.

### 3. Autonomy Plane

Defines how much authority agents have for planning, product work, proposal submission, messages, and business decisions from `docs/autonomous-ops-policy.md`.

### 4. Policy Plane

Scores opportunities, allocates Connects, and decides `skip`, `draft_only`, `prefill_only`, or `submit_authorized`.

### 5. Offer Plane

Maps job categories to profile positioning, proof assets, demos, proposal angles, pricing anchors, and clarifying questions.

### 6. Product Plane

Improves reusable service offers, demos, templates, and proof assets when they directly raise expected response or close probability.

### 7. Execution Plane

Uses bounded human-like Raw CDP only after an action is authorized. It discovers proposal form structure before filling and records exact form observations and blockers.

### 8. Memory Plane

Stores jobs, proposals, Connects, form observations, runs, messages, and outcomes as structured data. Markdown can remain as reporting, but JSONL/YAML is the source of truth for state.

### 9. Audit & Learning Plane

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
| `OperatingMandate` | The active autonomy level, allowed execution channel, budget, reserve, and forbidden actions. |
| `MessagePackage` | A drafted or authorized client reply with gates, risks, and send authority. |
| `ProductOffer` | A reusable service package tied to showcase assets, pricing, and target job categories. |

## Data Flow

1. Check platform rules and active autonomy policy.
2. Plan the acquisition cycle.
3. Collect opportunities through an allowed channel.
4. Score opportunities.
5. Allocate Connects.
6. Build proposal package.
7. Authorize concrete package or message actions.
8. Execute only through an allowed channel.
9. Record session.
10. Update memory.
11. Audit and patch policy.

## Legacy Task Redirect

Existing Task 1-6 files are legacy task shapes. They should be redirected toward the new acquisition pipeline:

`Plan -> Collect -> Score -> Package -> Authorize -> Execute -> Monitor -> Audit`

The task files can remain for historical context, but they must not override the authorization policy.
