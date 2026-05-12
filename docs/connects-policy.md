# Connects Policy

Connects are investment capital. The system should spend them only when expected response quality and contract probability justify the cost.

## Budget Model

- Set a weekly Connects budget before collecting jobs.
- Set a daily cap high enough that visible balance, not artificial reserve, is the practical limit.
- Set the active reserve floor to `0` unless the user explicitly asks to preserve Connects.
- Spend available Connects on qualifying opportunities instead of saving them for hypothetical later jobs.
- Record every observed cost, spend, refund, and balance in the spend ledger.
- Do not authorize a submit if the observed spend exceeds visible balance.

## Earning Connects

Track official Connects earning paths without gaming them:

- Profile setup, identity verification, and available onboarding or learning tasks.
- Monthly free Connects when the account is eligible.
- Rising Talent, Top Rated, and Top Rated Plus badge rewards.
- Eligible activity rewards from quality proposal activity.
- Interview rewards from established clients.
- First successful boost reward only if a specific boosted proposal is separately authorized.

Do not submit weak proposals to chase activity rewards. Reward eligibility is a secondary signal; expected contract value is the primary reason to spend Connects.

## Spend Ledger

Each Connects event should be recorded with:

- Opportunity ID.
- Proposal package ID.
- Connects delta.
- Observed balance.
- Budget scope.
- Daily cap, weekly cap, and reserve floor when relevant.
- Reason.
- Source session.

Allowed event types:

- `observe_balance`
- `reserve`
- `spend`
- `refund`
- `reward`
- `release_reserve`

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
| MVP/internal tools | Spend when the first paid scope can be bounded and shipped independently. |

## Risk Rules

- Zero-spend clients require stronger scope clarity and lower competition.
- High-competition jobs require strong category fit, fast posting time, and a distinctive showcase pack.
- Fixed-price unclear scope should default to `draft_only` or `prefill_only` unless an approved first paid scope can be stated.
- Fixed-price budgets below `$50` are not auto-submitted.
- Fixed-price budgets from `$50-$499` may use the visible budget as the first paid scope after form inspection.
- Fixed-price budgets from `$50-$99` may pass a small first-review exception when fit and client quality are strong, competition is acceptable, clarity is strong, and submit score is at least `28`.
- Fixed-price budgets from `$500-$999` may use a `$300` first paid scope after form inspection.
- Fixed-price budgets of `$1,000+` may use a `$500` first paid scope after form inspection.
- The cover letter must state that a fixed-price bid is for the first paid scope only.
- Do not spend Connects when the expected value band is low and competition is high.
- Do not preserve a reserve unless the active plan explicitly sets one above `0`.
- Do not spend on a proposal only to qualify for a Connects reward.

## Minimum Fields Before Spending Connects

- `connects_cost`
- `connects_balance_observed`
- `fit_score`
- `client_quality_score`
- `competition_score`
- `risk_score`
- `expected_value_band`
- `recommended_action`
- `reason`

Missing `connects_cost` should not block opening the apply form for inspection. It blocks final submit unless the form inspection observes a cost that fits the package cap and current visible balance.

## Sample Decision Record

```yaml
decision:
  job_id: example
  action: prefill_only
  connects_cost: 8
  max_authorized_connects: 8
  reason: "Good CRM automation fit, low proposals, payment verified, clear first milestone."
```
