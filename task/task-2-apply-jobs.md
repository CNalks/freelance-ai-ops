# Task 2: Apply to Jobs — Pre-fill Proposal Forms via CDP

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.

Input files (written by Task 1):
- `docs/proposal-drafts.md` — cover letters and rates for each job
- `docs/proposal-tracker.md` — tracks status of all proposals

## Prerequisites

- Chrome CDP running and logged into Upwork at `127.0.0.1:9222`
- Upwork account has Connects available (Freelancer Plus plan or purchased bundle)
- Task 1 already completed — `proposal-drafts.md` has entries with status "Ready to submit" in `proposal-tracker.md`
- `pip install websockets`

## CRITICAL SAFETY RULES

1. **DO NOT click Submit / Send Proposal / any button that finalizes submission**
2. **DO NOT click "Buy Connects" or any purchase button**
3. **DO NOT send messages to clients**
4. Only fill form fields. The user will review each pre-filled form and click Submit manually.

## CRITICAL: Browser Access Rules

- **USE Raw CDP only** (WebSocket to `127.0.0.1:9222`)
- **DO NOT use Playwright** — Cloudflare detects it
- **DO NOT use Windows MCP** — too expensive

## CDP Quick Reference

```python
import websockets, json, asyncio, urllib.request, time

CDP_HTTP = "http://127.0.0.1:9222"

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

## Step 1: Parse Proposals to Submit

Read `docs/proposal-tracker.md`. Filter rows where Status = "Ready to submit".
Read `docs/proposal-drafts.md`. Match each "Ready to submit" job URL to its cover letter and rate.

Build a list:
```python
proposals = [
    {"title": "...", "url": "...", "cover_letter": "...", "rate": "...", "rate_type": "hourly|fixed"},
    ...
]
```

## Step 2: For Each Proposal

Process one at a time. Wait 5 seconds between proposals to avoid rate limits.

### 2a. Navigate to Job Page

```python
await navigate(proposal["url"])
await asyncio.sleep(2)
```

### 2b. Check Job Status

```python
page_text = await evaluate("document.body.innerText.slice(0, 2000)")
```

Check for:
- "This job is closed" / "No longer accepting" → **skip**, update tracker to "Job closed"
- "Log in" / "Sign Up" → **stop all**, session expired, tell user to re-login
- "Buy Connects" without an Apply button → **skip**, update tracker to "Needs Connects"

### 2c. Find and Click Apply Button

Try multiple selectors (Upwork changes their UI):

```python
apply_result = await evaluate("""
(() => {
    // Try common apply button selectors
    const selectors = [
        'button[data-test="apply-button"]',
        'a[data-test="apply-button"]',
        'button.air3-btn-primary[data-test="submit-proposal-btn"]',
        'a[href*="/proposals/job/"]',
        'a[href*="apply/"]',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
            el.click();
            return 'clicked: ' + sel;
        }
    }
    // Fallback: find by text content
    const allBtns = [...document.querySelectorAll('button, a')];
    const applyBtn = allBtns.find(el =>
        /apply now|submit a proposal/i.test(el.textContent) &&
        el.offsetParent !== null
    );
    if (applyBtn) {
        applyBtn.click();
        return 'clicked: text match';
    }
    return 'not found';
})()
""")
```

If "not found" → **skip**, update tracker to "No apply button found".

Wait for proposal form to load:
```python
await asyncio.sleep(5)
```

### 2d. Verify Proposal Form Loaded

```python
form_check = await evaluate("""
(() => {
    const text = document.body.innerText.slice(0, 3000);
    const hasForm = text.includes('Cover Letter') || text.includes('cover letter')
        || document.querySelector('textarea') !== null;
    const needsConnects = text.includes('Buy Connects') || text.includes('purchase Connects');
    return JSON.stringify({ hasForm, needsConnects, snippet: text.slice(0, 500) });
})()
""")
```

If no form found or needs Connects → **skip**, update tracker accordingly.

### 2e. Fill Cover Letter

```python
cover_letter_escaped = json.dumps(proposal["cover_letter"])

fill_result = await evaluate(f"""
(() => {{
    // Find the cover letter textarea
    const textareas = [...document.querySelectorAll('textarea')];
    const ta = textareas.find(t =>
        t.getAttribute('data-test')?.includes('cover-letter')
        || t.id?.includes('cover')
        || t.name?.includes('cover')
        || t.placeholder?.toLowerCase().includes('cover')
        || t.closest('[data-test*="cover"]')
    ) || textareas[0]; // fallback to first textarea

    if (!ta) return 'no textarea found';

    ta.focus();
    // Use native input setter to trigger React change detection
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(ta, {cover_letter_escaped});
    ta.dispatchEvent(new Event('input', {{ bubbles: true }}));
    ta.dispatchEvent(new Event('change', {{ bubbles: true }}));
    ta.dispatchEvent(new Event('blur', {{ bubbles: true }}));
    return 'filled: ' + ta.value.length + ' chars';
}})()
""")
```

### 2f. Fill Rate (Hourly Jobs)

Only if rate_type is hourly:

```python
rate_value = proposal["rate"].replace("$", "").replace("/hr", "").strip()

rate_result = await evaluate(f"""
(() => {{
    // Find rate input
    const inputs = [...document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])')];
    const rateInput = inputs.find(i =>
        i.getAttribute('data-test')?.includes('rate')
        || i.name?.includes('rate')
        || i.placeholder?.toLowerCase().includes('rate')
        || i.closest('[data-test*="rate"]')
        || i.closest('label')?.textContent?.toLowerCase().includes('rate')
    );

    if (!rateInput) return 'no rate input found';

    rateInput.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(rateInput, '{rate_value}');
    rateInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
    rateInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
    rateInput.dispatchEvent(new Event('blur', {{ bubbles: true }}));
    return 'filled: ' + rateInput.value;
}})()
""")
```

### 2g. Verify Fill and Log — DO NOT SUBMIT

```python
verify = await evaluate("""
(() => {
    const ta = document.querySelector('textarea');
    const charCount = ta ? ta.value.length : 0;
    const pageText = document.body.innerText.slice(0, 500);
    return JSON.stringify({ coverLetterChars: charCount, pageSnippet: pageText });
})()
""")
print(f"  Verified: {verify}")
print(f"  STATUS: PRE-FILLED — waiting for user to review and click Submit")
```

**STOP HERE. DO NOT click any submit/send button.**

## Step 3: Update Tracker

After processing all proposals, update `docs/proposal-tracker.md`:

For successful pre-fills:
```markdown
| [date] | [title] | [url] | Pre-filled | [rate] | Form ready — user must click Submit |
```

For failures:
```markdown
| [date] | [title] | [url] | [Failure reason] | [rate] | [Details] |
```

Possible failure statuses: `Job closed`, `No apply button`, `Needs Connects`, `Form not found`, `Session expired`, `Fill failed`

## Step 4: Git

```bash
git add docs/proposal-tracker.md
git commit -m "pre-fill proposals [date]"
git push origin main
```

## Step 5: Final Report

```
=== Apply Jobs Summary [date] ===
Total proposals to process: X
Successfully pre-filled: Y
Skipped (job closed): A
Skipped (no apply button): B
Skipped (needs Connects): C
Skipped (other error): D

Pre-filled proposals are open in Chrome tabs.
Next step: User reviews each tab and clicks Submit on Upwork.
```

## Constraints

- **NEVER click Submit / Send Proposal**
- **NEVER click Buy Connects or any purchase button**
- **NEVER send messages**
- Use Raw CDP only (no Playwright, no Windows MCP)
- Process one proposal at a time with 5s delay between
- If session expires (redirected to login), STOP and tell user
- If form UI is unrecognizable, use `document.body.innerText` to inspect and adapt selectors
- Log all actions for debugging

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Apply button not found | Upwork may have redesigned. Use `document.body.innerText` to find the button text and adapt. |
| Cover letter textarea not found | Check if form loaded. May need longer wait or different selector. |
| Rate input not found | May be fixed-price job. Skip rate filling. |
| "Buy Connects" shown | Account may need more Connects. Skip and log. |
| Redirected to login | Session expired. STOP all. User must re-login in CDP Chrome. |
| React doesn't detect value change | Use `nativeInputValueSetter` pattern (already in the code above). |
