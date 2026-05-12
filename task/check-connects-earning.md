# Check Connects Earning

## Goal

Track legitimate Connects earning opportunities and budget state without buying Connects or gaming platform rewards.

## Inputs

- Active autonomy plan.
- `docs/upwork-platform-rules.md`
- `docs/connects-policy.md`
- `data/connects-ledger.jsonl`
- Recent session files.

## Outputs

- `observe_balance`, `reward`, `reserve`, or blocker records in `data/connects-ledger.jsonl` when evidence exists.
- A run record in `data/runs.jsonl` when structured state changes.
- A session file when Raw CDP is used to observe account state.

## Steps

1. Read the active autonomy plan and Connects policy.
2. Review recent ledger entries and sessions for the latest observed balance.
3. Check only legitimate earning paths described by platform rules, such as monthly free Connects, interview rewards, or profile/account eligibility prompts.
4. Use bounded Raw CDP only when balance or eligibility cannot be determined from existing records.
5. Record any earned Connects as `reward`; record failed checks as blockers, not spend.

## Stop Conditions

- No active autonomy plan.
- Login, verification, CAPTCHA, Cloudflare, or abnormal account state.
- Any page asks to buy Connects, subscribe, boost, or enter payment details.
- The earning path would require misleading behavior, spam, or platform manipulation.

## Safety Rules

- Never buy Connects.
- Never boost.
- Never submit proposals from this task.
- Never send client messages from this task.
- Do not claim a reward unless the platform clearly presents it as available to this account.
