# Task 1: Find Jobs — Search, Score, Draft Proposals

## Context

Repository: `freelance-ai-ops`
Raw CDP scraper: `C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.

State files (read before starting):
- `docs/proposal-tracker.md` — all previous proposals (dedup against this)
- `docs/proposal-drafts.md` — previous drafts (will be overwritten with today's)
- `docs/job-leads.md` — previous leads (will be overwritten with today's)
- `docs/pricing.md` — pricing rules

## Prerequisites

- Chrome CDP running and logged into Upwork at `127.0.0.1:9222`
- `pip install websockets` (already done in scraper venv)

## CRITICAL: Browser Access Rules

- **USE Raw CDP only** (WebSocket to `127.0.0.1:9222`)
- **DO NOT use Playwright** — Cloudflare detects it
- **DO NOT use Windows MCP** — too expensive
- **DO NOT submit proposals, send messages, or click purchase buttons**

## CDP 工具函数

完整的 CDP 工具函数（CDPSession class, navigate, evaluate, check_login, check_notifications, fill_input）在 `docs/cdp-utils.md` 中。所有 task 共用同一套工具代码。

## CDP Quick Reference

```python
import websockets, json, asyncio, urllib.request, time

CDP_HTTP = "http://127.0.0.1:9222"

# Get tab WebSocket URL
with urllib.request.urlopen(f"{CDP_HTTP}/json") as r:
    tabs = json.loads(r.read())
tab = next(t for t in tabs if t["type"] == "page" and t.get("webSocketDebuggerUrl"))

async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=10_000_000) as ws:
    _id = 0

    async def cdp_send(method, params=None):
        nonlocal _id; _id += 1
        msg = {"id": _id, "method": method}
        if params: msg["params"] = params
        await ws.send(json.dumps(msg))
        while True:
            data = json.loads(await asyncio.wait_for(ws.recv(), 30))
            if data.get("id") == _id:
                if "error" in data: raise Exception(f"CDP error: {data['error']}")
                return data.get("result", {})

    async def navigate(url):
        await cdp_send("Page.enable")
        await cdp_send("Page.navigate", {"url": url})
        await asyncio.sleep(3)
        # Wait for Cloudflare
        for _ in range(20):
            title = (await cdp_send("Runtime.evaluate",
                {"expression": "document.title", "returnByValue": True}
            ))["result"].get("value", "")
            if "稍候" not in title and "moment" not in title.lower():
                break
            await asyncio.sleep(1)

    async def evaluate(expression):
        r = await cdp_send("Runtime.evaluate", {
            "expression": expression, "returnByValue": True, "awaitPromise": True
        })
        return r.get("result", {}).get("value")
```

## Step 1: Run Job Search

Use the pre-built scraper:

```bash
cd C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper
python scrape_jobs.py --output C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops\docs\job-leads.md --max-per-query 5
```

If the scraper fails or is unavailable, use Raw CDP directly with these search URLs:

```
https://www.upwork.com/nx/search/jobs/?q={URL_ENCODED_QUERY}&sort=recency&per_page=10
```

Search queries:
1. `FastAPI Python backend`
2. `OpenAI API integration`
3. `AI chatbot development`
4. `LLM application development`
5. `Python MVP`

Extract job data via `Runtime.evaluate` on the DOM. For each job, capture: title, URL, budget, posted time, proposal count, client country, client spend, payment verified, description excerpt, required skills.

## Step 2: Deduplicate

Read `docs/proposal-tracker.md`. Remove any jobs whose URL already appears in the tracker.
Keep only genuinely new jobs.

## Step 3: Initial Score and Filter

Apply hard filters to eliminate obvious mismatches:

**Skip** jobs where:
- Budget < $5/hr or < $30 fixed
- Client has $0 spent AND no hire history
- 50+ proposals already
- Requires skills we don't have (mobile-only, blockchain, specific CMS, Angular/Vue-only)

From the remaining jobs, rank by these signals:
1. **Payment verified + client has spent money** (most important)
2. **Proposals < 15** (less competition)
3. **Posted < 12 hours ago** (freshness)
4. **Budget aligns with pricing** (see `docs/pricing.md`)
5. **Skills match**: FastAPI, Python, OpenAI/LLM, AI automation, MVP

Take the **top 10 candidates** forward to the AI review step.

## Step 4: AI Strategic Review （重要 — 发挥 AI 判断力）

This is the step where you (Claude/Codex) do what you're best at — **strategic thinking, not mechanical filtering**.

For each of the top 10 candidates, read the full job description via CDP:

```python
for job in top_10:
    await navigate(job["url"])
    await asyncio.sleep(3)
    full_description = await evaluate("document.body.innerText.slice(0, 5000)")
    job["full_text"] = full_description
```

Then conduct a structured analysis. For each job, evaluate:

### 4a. Strategic Fit Assessment

Think through these questions (write your reasoning in `docs/job-leads.md`):

- **Win probability**: Given our profile (new account, 0 reviews, AI/FastAPI focus), how likely are we to win this one? Be honest.
- **Review potential**: If we win, will this lead to a strong 5-star review we can showcase? Or is the client likely to be difficult?
- **Portfolio value**: Does completing this project give us a new portfolio piece or case study that opens doors to better jobs?
- **Scope clarity**: Is the scope well-defined enough to deliver on time, or is it vague and likely to scope-creep?
- **Rate sustainability**: Can we deliver quality work at the proposed rate without burning out?

### 4b. Red Flag Detection

Check for these warning signs:

- **Vague scope + fixed price** → high risk of scope creep and disputes
- **"Need it ASAP" + low budget** → unrealistic expectations
- **Client has many hires but low avg review given** → difficult client
- **Mentions "just a small task" but description is complex** → underestimating work
- **Requires proprietary platform knowledge** (Salesforce, SAP, specific CRM) we don't have
- **Asks for "ongoing" work but budget is one-time** → mismatch
- **Multiple past freelancers hired and fired for same project** → project is problematic

### 4c. Proposal Angle Strategy

For jobs that pass the red flag check, determine:

- **What hook should the cover letter open with?** — What specific pain point from the job post should we address first?
- **Which portfolio piece to showcase?** — Match the most relevant demo (RAG chatbot for chatbot jobs, FastAPI LLM for API jobs, Dashboard for data/admin jobs)
- **What's our competitive edge on this specific job?** — Why would the client pick us over the 10-20 other applicants?
- **What clarifying question will show domain expertise?** — Not a generic question, but one that demonstrates we understand the problem

### 4d. Final Selection

From the 10 candidates, select **the top 5** (or fewer if quality is low):

Write a brief decision for each in `docs/job-leads.md`:

```markdown
### [Job Title]
**Decision:** APPLY / SKIP
**Reasoning:** [2-3 sentences explaining why — be specific, not generic]
**Proposal angle:** [1 sentence — the hook]
**Risk level:** Low / Medium / High
**Expected Connects cost:** [if visible]
```

**Selection principles:**
- Prefer jobs where we have a genuine edge (not just "I can do this")
- Prefer smaller scope with clear deliverables over ambiguous large projects
- For a new account: prioritize jobs where we can deliver fast and get a review
- If unsure between two jobs, pick the one with fewer proposals
- It's better to send 3 strong proposals than 5 mediocre ones

## Step 5: Draft Proposals

Overwrite `docs/proposal-drafts.md` with today's drafts. **Only for jobs marked APPLY in Step 4.**

For each selected job:

```markdown
## Job: [Title]
**URL:** [url]
**AI Review:** [1-line summary of why we're applying]

### Cover Letter

[proposal text — under 200 words]

### Suggested Rate
[rate]

### Proposal Strategy Notes
- Hook: [what specific pain point we're addressing]
- Demo to link: [which portfolio piece]
- Clarifying question: [the expert question we're ending with]
- Risk: [Low/Medium/High and why]

---
```

Proposal rules:
- Under 200 words
- **Open with the specific hook identified in Step 4** — not a generic intro
- Reference something specific from the job post (not generic)
- Connect to our FastAPI/AI/LLM skills
- Include 2-3 concrete steps of proposed approach
- Include timeline estimate
- End with the clarifying question from Step 4 (shows domain expertise)
- Tone: professional but conversational, not salesy
- **Do NOT start with "I" or "Hi"** — start with a statement about THEIR problem

Portfolio links to include where relevant:
- Dashboard: `https://cnalks.github.io/freelance-ai-ops/`
- FastAPI LLM: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm`
- RAG Chatbot: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot`

## Step 6: Update Tracker

Append new rows to `docs/proposal-tracker.md` **only for APPLY jobs**:

```markdown
| [date] | [title] | [url] | Ready to submit | [rate] | [AI review 1-liner] |
```

## Step 7: Check Notifications

Navigate to `https://www.upwork.com/nx/find-work/best-matches` via CDP.

```python
notifications = await evaluate("""
    JSON.stringify({
        messages: document.querySelector('[data-test="messages-count"]')?.textContent || '0',
        notifications: document.querySelector('[data-test="notifications-count"]')?.textContent || '0'
    })
""")
```

Report any unread messages/notifications.

## Step 8: Git

```bash
git add docs/job-leads.md docs/proposal-drafts.md docs/proposal-tracker.md
git commit -m "job search [date]"
git push origin main
```

## Output Summary

```
=== Job Search Summary [date] ===
New jobs found: X
Deduplicated (already tracked): Y
AI reviewed: Z candidates
Selected for proposal: W (with reasoning)
Skipped with reason: [list of skipped jobs and why]
Client messages/notifications: [count]
Next step: Run Task 2 (apply-jobs) to pre-fill proposal forms
```

## Constraints

- Do NOT submit proposals, click Submit, or send messages
- Do NOT buy Connects or click purchase buttons
- Use Raw CDP only (no Playwright, no Windows MCP)
- Keep proposals under 200 words
- Always deduplicate against proposal-tracker.md
- Always read full job description before making APPLY/SKIP decision
- Quality over quantity: 3 strong proposals > 5 weak ones
