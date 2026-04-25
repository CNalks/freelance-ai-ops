# Task: Upwork Job Search + Proposal Drafting (v2 — Raw CDP)

## Context

Repository: `freelance-ai-ops`
The Upwork account is registered and profile is live.
Proposal templates are in `profile/proposal-templates/`.

## CRITICAL: Browser Access Method

**DO NOT use Windows MCP (screenshots).** Too expensive.
**DO NOT use Playwright** (launch or connect_over_cdp). Cloudflare detects Playwright injection.
**DO NOT use curl_cffi or raw HTTP.** Cloudflare JS challenge requires a real browser.

**USE Raw CDP (Chrome DevTools Protocol via WebSocket):**

This is the same protocol Chrome DevTools (F12) uses. Zero injection, zero automation flags.
Cloudflare cannot detect or distinguish it from a human using DevTools.

### Dependencies

```bash
pip install websockets
```

### How it works

1. Chrome runs with `--remote-debugging-port=9222` and `--user-data-dir=%LOCALAPPDATA%\Chrome-CDP-Profile`
2. Script connects via WebSocket to a browser tab (same as DevTools)
3. Sends CDP commands: `Page.navigate`, `Runtime.evaluate`
4. Extracts DOM data via `Runtime.evaluate` — no screenshots, no Playwright

### Auto-launch Chrome if needed

```python
import subprocess, os, time, json, urllib.request

CDP_PORT = 9222
CDP_HTTP = f"http://127.0.0.1:{CDP_PORT}"
PROFILE_DIR = os.path.expandvars(r"%LOCALAPPDATA%\Chrome-CDP-Profile")

def ensure_chrome_cdp():
    try:
        with urllib.request.urlopen(f"{CDP_HTTP}/json/version", timeout=2) as r:
            return  # already running
    except Exception:
        pass
    os.makedirs(PROFILE_DIR, exist_ok=True)
    subprocess.Popen([
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={PROFILE_DIR}",
        "--remote-allow-origins=*",
        "--no-first-run", "--no-default-browser-check",
        "https://www.upwork.com",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(25):
        time.sleep(1)
        try:
            urllib.request.urlopen(f"{CDP_HTTP}/json/version", timeout=2)
            return
        except Exception:
            pass
    raise RuntimeError("CDP did not start")
```

### Connect to a tab

```python
import websockets, json, asyncio

# Get tab list
with urllib.request.urlopen(f"{CDP_HTTP}/json") as r:
    tabs = json.loads(r.read())
tab = next(t for t in tabs if t["type"] == "page" and t.get("webSocketDebuggerUrl"))
ws_url = tab["webSocketDebuggerUrl"]

async with websockets.connect(ws_url, max_size=10_000_000) as ws:
    _id = 0

    async def cdp_send(method, params=None):
        nonlocal _id; _id += 1
        msg = {"id": _id, "method": method}
        if params: msg["params"] = params
        await ws.send(json.dumps(msg))
        while True:
            data = json.loads(await asyncio.wait_for(ws.recv(), 30))
            if data.get("id") == _id:
                return data.get("result", {})

    await cdp_send("Page.enable")
    await cdp_send("Runtime.enable")
```

### Navigate (with Cloudflare wait)

```python
async def navigate(url, wait=3):
    await cdp_send("Page.navigate", {"url": url})
    # Wait for load event
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            data = json.loads(await asyncio.wait_for(ws.recv(), 1))
            if data.get("method") in ("Page.loadEventFired", "Page.frameStoppedLoading"):
                break
        except asyncio.TimeoutError:
            pass
    await asyncio.sleep(wait)
    # Wait for Cloudflare "请稍候" to resolve
    for _ in range(15):
        title = (await cdp_send("Runtime.evaluate",
            {"expression": "document.title", "returnByValue": True}
        ))["result"].get("value", "")
        if "稍候" not in title and "moment" not in title.lower():
            break
        await asyncio.sleep(1)
```

### Extract data (cheap — text only)

```python
async def evaluate(expression):
    r = await cdp_send("Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": True,
    })
    return r.get("result", {}).get("value")

# Example: extract job titles
jobs = await evaluate("""
    JSON.stringify(
        [...document.querySelectorAll('a[data-test="job-tile-title-link"]')]
        .map(a => ({ title: a.textContent.trim(), url: a.href }))
    )
""")
```

### Pre-built scraper

A complete scraper is at `automation/upwork-cdp-scraper/scrape_jobs.py`:

```bash
python automation/upwork-cdp-scraper/scrape_jobs.py --output docs/job-leads.md
```

## Objective

Search for suitable jobs on Upwork and prepare proposal drafts for review.

## Step 1: Verify CDP Connection

```python
ensure_chrome_cdp()
# Then verify tab access:
with urllib.request.urlopen(f"{CDP_HTTP}/json") as r:
    tabs = json.loads(r.read())
    print(f"Tabs: {len(tabs)}")
```

If Chrome can't start CDP, STOP and tell the user to:
1. Close all Chrome windows
2. Run: `python automation/upwork-cdp-scraper/launch_and_validate.py`

## Step 2: Search for Jobs

**Search queries** (run each one):
1. `FastAPI Python backend`
2. `OpenAI API integration`
3. `AI chatbot development`
4. `LLM application development`
5. `Python MVP`

**URL pattern:**
```
https://www.upwork.com/nx/search/jobs/?q={URL_ENCODED_QUERY}&sort=recency&per_page=10
```

**For each query:**
1. Navigate via CDP `Page.navigate`
2. Wait for Cloudflare and page load
3. Extract via `Runtime.evaluate` — inject the JS from `extract_jobs.js`
4. DO NOT take screenshots

## Step 3: Save Job Leads

Save to `docs/job-leads.md` in this format:

```markdown
# Job Leads — [Date]

## Search: [query]

### Job 1: [Job Title]
- **URL:** [link]
- **Budget:** [fixed/hourly, amount]
- **Posted:** [time ago]
- **Proposals:** [count]
- **Client:** [country, hire rate, total spent]
- **Description summary:** [2-3 sentences]
- **Why good fit:** [1 sentence]
- **Priority:** High / Medium / Low
```

## Step 4: Draft Proposals

For the top 5 highest-priority jobs, draft proposals in `docs/proposal-drafts.md`:

- Each proposal under 200 words
- Reference specific details from the job post
- Professional but conversational tone
- DO NOT submit any proposals

## Step 5: Git

```bash
git add docs/job-leads.md docs/proposal-drafts.md
git commit -m "add job leads and proposal drafts [date]"
git push origin main
```

## Important Constraints

- Do NOT submit proposals or send messages on Upwork
- Do NOT use Playwright (Cloudflare detects it)
- Do NOT use Windows MCP screenshots
- Use ONLY raw CDP via WebSocket (`websockets` library)
- `--user-data-dir=%LOCALAPPDATA%\Chrome-CDP-Profile` is required to avoid Chrome single-instance issue

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CDP won't start | Must use `--user-data-dir` to avoid Chrome merging into existing instance |
| Cloudflare "请稍候" | Wait up to 15s, it auto-resolves. Visit main page first to warm up cookie |
| Need login | Log into Upwork in the CDP Chrome window manually once. Cookies persist in the profile |
| Empty extraction | DOM selectors may have changed. Use `Runtime.evaluate` with `document.body.innerText` to inspect |
| Port 9222 in use | Another CDP Chrome is running. Reuse it or kill and restart |
