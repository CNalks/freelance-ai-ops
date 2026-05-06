# Connects Policy

Connects are investment capital. The system should spend them only when expected response quality and contract probability justify the cost.

## Budget Model

- Set a weekly Connects budget before collecting jobs.
- Set a daily cap before scoring opportunities.
- Reserve Connects for high-fit late-week opportunities.
- Record every observed cost, spend, refund, and balance in the spend ledger.

## Spend Ledger

Each Connects event should be recorded with:

- Opportunity ID.
- Proposal package ID.
- Connects delta.
- Observed balance.
- Reason.
- Source session.

## Client Quality Rules

Prefer clients with:

- Payment verified.
- Meaningful client spend.
- Clear hire history.
- Low or moderate proposal count.
- Recent posting time.
- Clear scope and decision criteria.

Treat weak client quality as a reason to reduce max authorized Connects or choose `draft_only`.

## Job Type Rules

| Job type | Spend posture |
|---|---|
| AI automation | Spend when workflow, data sources, and measurable outcome are clear. |
| FastAPI backend | Spend when API scope, integrations, and deployment expectations are defined. |
| RAG/chatbot | Spend when knowledge source, user flow, and success criteria are described. |
| CRM/workflow automation | Spend when pipeline, follow-up logic, and existing tools are named. |
| MVP/internal tools | Spend when first milestone can be bounded and shipped independently. |

## Risk Rules

- Zero-spend clients require stronger scope clarity and lower competition.
- High-competition jobs require strong category fit, fast posting time, and a distinctive showcase pack.
- Fixed-price unclear scope should default to `draft_only` or `prefill_only` unless an approved milestone is included.
- Do not spend Connects when the expected value band is low and competition is high.

## Minimum Fields Before Spending Connects

- `connects_cost`
- `fit_score`
- `client_quality_score`
- `competition_score`
- `risk_score`
- `expected_value_band`
- `recommended_action`
- `reason`

## Sample Decision Record

```yaml
decision:
  job_id: example
  action: prefill_only
  connects_cost: 8
  max_authorized_connects: 8
  reason: "Good CRM automation fit, low proposals, payment verified, clear first milestone."
```
