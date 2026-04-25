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

## Step 3: Score and Select Top 5

Scoring criteria (in priority order):

1. **Payment verified + client has spent money** (most important)
2. **Proposals < 15** (less competition)
3. **Posted < 12 hours ago** (freshness)
4. **Budget aligns with pricing** (see `docs/pricing.md`)
5. **Skills match**: FastAPI, Python, OpenAI/LLM, AI automation, MVP

**Skip** jobs where:
- Budget < $5/hr or < $30 fixed
- Client has $0 spent AND no hire history
- 50+ proposals already
- Requires skills we don't have (mobile-only, blockchain, specific CMS)

## Step 4: Draft Proposals

Overwrite `docs/proposal-drafts.md` with today's drafts. For each selected job:

```markdown
## Job: [Title]
**URL:** [url]

### Cover Letter

[proposal text — under 200 words]

### Suggested Rate
[rate]

---
```

Proposal rules:
- Under 200 words
- Reference something specific from the job post (not generic)
- Connect to our FastAPI/AI/LLM skills
- Include 2-3 concrete steps of proposed approach
- Include timeline estimate
- End with a clarifying question
- Tone: professional but conversational, not salesy

Portfolio links to include where relevant:
- Dashboard: `https://cnalks.github.io/freelance-ai-ops/`
- FastAPI LLM: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm`
- RAG Chatbot: `https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot`

## Step 5: Update Tracker

Append new rows to `docs/proposal-tracker.md`:

```markdown
| [date] | [title] | [url] | Ready to submit | [rate] | Cover letter in proposal-drafts.md |
```

## Step 6: Check Notifications

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

## Step 7: Git

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
Top proposals drafted: Z
Client messages/notifications: [count]
Next step: Run Task 2 (apply-jobs) to pre-fill proposal forms
```

## Constraints

- Do NOT submit proposals, click Submit, or send messages
- Do NOT buy Connects or click purchase buttons
- Use Raw CDP only (no Playwright, no Windows MCP)
- Keep proposals under 200 words
- Always deduplicate against proposal-tracker.md
