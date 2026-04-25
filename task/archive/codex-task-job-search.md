# Task: Upwork Job Search + Proposal Drafting Workflow

## Context

Repository: `freelance-ai-ops`
The Upwork account is registered and profile is live.
Proposal templates are in `profile/proposal-templates/`.

## Objective

Search for suitable jobs on Upwork and prepare proposal drafts for review.

## Step 1: Search for Jobs

Using the logged-in Chrome browser (Windows MCP), go to Upwork and search for jobs matching these criteria:

**Search queries** (run each one):
1. `FastAPI Python backend`
2. `OpenAI API integration`
3. `AI chatbot development`
4. `LLM application development`
5. `Python MVP`

**Filters to apply:**
- Payment verified: Yes
- Client history: At least 1 hire
- Budget: Any (but note the budget in results)
- Posted: Last 24 hours (if too few results, expand to last 3 days)
- Proposals: Fewer than 15 (less competition)

## Step 2: Collect Job Listings

For each search query, collect the top 3-5 most relevant jobs. Save results to `docs/job-leads.md` with this format:

```markdown
# Job Leads — [Date]

## Search: [query]

### Job 1: [Job Title]
- **URL:** [link]
- **Budget:** [fixed/hourly, amount]
- **Posted:** [time ago]
- **Proposals:** [count]
- **Client:** [country, hire rate, total spent]
- **Description summary:** [2-3 sentences — what they need]
- **Why good fit:** [1 sentence — why this matches our skills]
- **Priority:** High / Medium / Low
```

## Step 3: Draft Proposals

For the top 5 highest-priority jobs, draft a customized proposal in `docs/proposal-drafts.md`:

```markdown
# Proposal Drafts — [Date]

## Job: [Title]
**URL:** [link]

### Cover Letter

[Write a personalized proposal. Structure:
1. Opening — reference something specific from their job post (not generic)
2. Relevant experience — connect to our FastAPI/AI/LLM skills
3. Proposed approach — 2-3 concrete steps
4. Timeline estimate
5. Closing — suggest a quick call or ask a clarifying question]

### Suggested Rate
[Based on job budget and complexity]

---
```

**Proposal rules:**
- Never copy-paste the template verbatim. Each proposal must reference specific details from the job post.
- Keep under 200 words.
- Tone: professional but conversational. Not salesy.
- Do NOT submit any proposals. Only draft them for review.

## Step 4: Git

Commit message: `add job leads and proposal drafts [date]`
Push to GitHub.

## Important

- Do NOT submit any proposals or send any messages on Upwork. Only search and draft.
- Do NOT apply to jobs. This is research and preparation only.
- Save screenshots of interesting job posts to `automation/upwork-browser/screenshots/`.
