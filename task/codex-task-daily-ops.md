# Task: Daily Job Search + Proposal Cycle

## Context

Repository: `freelance-ai-ops`
Raw CDP scraper: `C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.

Previous job leads and proposals are in `docs/job-leads.md` and `docs/proposal-drafts.md`.
Proposal tracker is in `docs/proposal-tracker.md`.

## Prerequisites (User Must Do Before Running This Task)

1. **Connects**: Ensure the Upwork account has Connects available. New accounts get some free Connects. If needed, purchase a Connects bundle at https://www.upwork.com/nx/plans/connects/
2. **CDP Chrome**: Must be running and logged into Upwork.
3. **Previous proposals**: Review `docs/proposal-tracker.md` for any pending items.

## Objective

Run a fresh job search, draft new proposals for top matches, and prepare them for manual submission.

## Step 1: Fresh Job Search

Run the scraper for today's jobs:

```bash
cd C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper
python scrape_jobs.py --output C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops\docs\job-leads.md --max-per-query 5
```

Or if running from inside the repo:
```python
# Use Raw CDP directly — see codex-task-job-search-v2.md for the full CDP pattern
```

## Step 2: Deduplicate Against Previous Leads

Read the existing `docs/proposal-tracker.md` and `docs/proposal-drafts.md`.
Remove any jobs from the new leads that were already tracked or drafted previously.
Keep only genuinely new jobs.

## Step 3: Score and Select Top Jobs

From the new leads, select the top 5 based on these criteria (in priority order):

1. **Payment verified** + **client has spent money** (most important)
2. **Proposals < 15** (less competition)
3. **Posted < 12 hours ago** (freshness)
4. **Budget aligns with our pricing** (see `docs/pricing.md`)
5. **Skills match**: FastAPI, Python, OpenAI/LLM, AI automation, MVP

Skip jobs where:
- Budget is under $5/hr or under $30 fixed
- Client has $0 spent and no hire history
- 50+ proposals already submitted
- Requires skills we don't have (mobile-only, blockchain, specific CMS)

## Step 4: Draft Personalized Proposals

For each selected job, write a proposal in `docs/proposal-drafts.md`:

Rules:
- Under 200 words
- Reference something specific from the job post (not generic)
- Connect to our FastAPI/AI/LLM skills
- Include 2-3 concrete steps of proposed approach
- Include timeline estimate
- End with a clarifying question
- Tone: professional but conversational, not salesy

Include the live dashboard demo link where relevant:
`https://cnalks.github.io/freelance-ai-ops/`

Include GitHub repo links for backend demos:
- FastAPI LLM: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm`
- RAG Chatbot: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot`

## Step 5: Prepare Submission Notes

For each proposal, add a submission-ready entry to `docs/proposal-tracker.md`:

```markdown
| [date] | [title] | [url] | Ready to submit | [rate] | Cover letter in proposal-drafts.md |
```

DO NOT attempt to submit proposals via CDP. The user will submit manually because:
- Upwork requires Connects (which cost money)
- The proposal form may require additional fields (milestones, attachments)
- Manual review ensures quality

## Step 6: Check for Client Responses

Navigate to the Upwork messages/notifications page via CDP:

```python
await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches")
```

Check if there are any notification badges or messages:
```python
notifications = await cdp.evaluate("""
    JSON.stringify({
        messages: document.querySelector('[data-test="messages-count"]')?.textContent || '0',
        notifications: document.querySelector('[data-test="notifications-count"]')?.textContent || '0',
        pageText: document.body.innerText.slice(0, 200),
    })
""")
```

If there are unread messages or notifications, report them in the output.

## Step 7: Git

```bash
git add docs/job-leads.md docs/proposal-drafts.md docs/proposal-tracker.md
git commit -m "daily job search and proposal cycle [date]"
git push origin main
```

## Output Summary

At the end, print a summary:

```
=== Daily Ops Summary [date] ===
New jobs found: X
Deduplicated (already tracked): Y
Top proposals drafted: Z
Proposals ready for manual submission: Z
Client messages/notifications: [count]
Next step: User reviews proposals and submits on Upwork
```

## Important Constraints

- Do NOT submit proposals or click any purchase/submit buttons
- Do NOT buy Connects
- Do NOT send messages to clients
- Use Raw CDP only (no Playwright, no Windows MCP)
- Keep proposals under 200 words
- Always deduplicate against previous tracker entries
