# Task 2: Apply to Jobs - Legacy Redirect

This legacy task no longer grants submit authority. Use `task/execute-cdp-applications.md` with `docs/authorization-policy.md`.

- Default mode is `prefill_only`.
- Submit requires a specific `submit_authorized` proposal package ID and all required gates.
- Buying Connects remains forbidden.
- Unknown required fields pause execution.

# Historical Task 2: Fill Forms and Submit Proposals via CDP

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.

Input files:
- `docs/proposal-drafts.md` — cover letters and rates for each job
- `docs/proposal-tracker.md` — tracks status of all proposals

## Prerequisites

- Chrome CDP running and logged into Upwork at `127.0.0.1:9222`
- Upwork account has Connects available (Freelancer Plus plan or purchased bundle)
- `pip install websockets`

## HISTORICAL SUBMISSION RULES - SUPERSEDED

1. **SUPERSEDED — this file does not authorize Submit / Send Proposal**
2. **DO NOT click "Buy Connects" or any purchase/payment button**
3. **DO NOT send messages to clients**
4. **DO NOT accept contracts or offers**
5. **Max 10 submissions per run** — stop after 10 to conserve Connects
6. **Wait 8-15 seconds between submissions** (use `random.randint(8, 15)`)

## CRITICAL: Browser Access Rules

- **USE Raw CDP only** (WebSocket to `127.0.0.1:9222`)
- **DO NOT use Playwright** — Cloudflare detects it
- **DO NOT use Windows MCP** — too expensive

## CDP 工具函数

完整的 CDP 工具函数在 `docs/cdp-utils.md` 中。

## CDP Quick Reference

```python
import websockets, json, asyncio, urllib.request, time, random

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

## Step 0: Determine Which Proposals to Process（重跑控制）

Read `docs/proposal-tracker.md` and select rows to process based on status:

**Processing order (priority):**
1. Status = `"Pre-filled"` — 上次填了但没提交的，优先处理（只需重新打开页面提交）
2. Status = `"Ready to submit"` — 新的，需要完整填写+提交

**Skip these statuses:**
- `Submitted` — 已提交
- `Job closed` — 已失效
- `Skipped`, `Blocked`, `Needs Connects`, `Fill failed`, `Submit failed` — 之前失败的

This means: **重跑不会从头开始**。它会先处理上次遗留的 Pre-filled，再处理新的 Ready to submit。

Read `docs/proposal-drafts.md` and match each processable job URL to its cover letter and rate.

```python
proposals = [
    {"title": "...", "url": "...", "cover_letter": "...", "rate": "...", "rate_type": "hourly|fixed", "was_prefilled": True|False},
    ...
]
submitted_count = 0
max_submissions = 10
```

## Step 1: For Each Proposal

Process one at a time.

### 1a. Navigate to Job Page / Proposal Form

```python
await navigate(proposal["url"])
await asyncio.sleep(3)
```

### 1b. Check Job Status

```python
page_text = await evaluate("document.body.innerText.slice(0, 3000)")
```

Check for:
- "This job is closed" / "No longer accepting" → **skip**, update tracker to "Job closed"
- "Log in" / "Sign Up" → **STOP ALL**, session expired
- Page contains a proposal form already (if Pre-filled, form may already be open)

### 1c. Find and Click Apply Button (if not already on form)

```python
apply_result = await evaluate("""
(() => {
    // Check if we're already on the proposal form
    if (document.querySelector('textarea') && document.body.innerText.includes('Cover Letter')) {
        return 'already on form';
    }
    const selectors = [
        'button[data-test="apply-button"]',
        'a[data-test="apply-button"]',
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

Wait for proposal form:
```python
await asyncio.sleep(5)
```

### 1d. Verify Proposal Form

```python
form_check = await evaluate("""
(() => {
    const text = document.body.innerText.slice(0, 5000);
    const hasTextarea = document.querySelector('textarea') !== null;
    const needsConnects = /buy connects|purchase connects/i.test(text);
    const hasSubmitBtn = [...document.querySelectorAll('button')].some(b =>
        /send proposal|submit proposal/i.test(b.textContent) && !b.disabled
    );
    return JSON.stringify({ hasTextarea, needsConnects, hasSubmitBtn, snippet: text.slice(0, 800) });
})()
""")
```

If `needsConnects` → **skip**, update tracker to "Needs Connects".
If no textarea → **skip**, update tracker to "Form not found".

### 1e. Fill Cover Letter

```python
cover_letter_escaped = json.dumps(proposal["cover_letter"])

fill_result = await evaluate(f"""
(() => {{
    const textareas = [...document.querySelectorAll('textarea')];
    const ta = textareas.find(t =>
        t.getAttribute('data-test')?.includes('cover-letter')
        || t.id?.includes('cover')
        || t.name?.includes('cover')
        || t.placeholder?.toLowerCase().includes('cover')
        || t.closest('[data-test*="cover"]')
    ) || textareas[0];

    if (!ta) return 'no textarea found';

    ta.focus();
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    setter.call(ta, {cover_letter_escaped});
    ta.dispatchEvent(new Event('input', {{ bubbles: true }}));
    ta.dispatchEvent(new Event('change', {{ bubbles: true }}));
    ta.dispatchEvent(new Event('blur', {{ bubbles: true }}));
    return 'filled: ' + ta.value.length + ' chars';
}})()
""")
```

### 1f. Fill Rate (Hourly Jobs)

```python
rate_value = proposal["rate"].replace("$", "").replace("/hr", "").strip()

await evaluate(f"""
(() => {{
    const inputs = [...document.querySelectorAll('input[type="text"], input[type="number"], input:not([type])')];
    const rateInput = inputs.find(i =>
        i.getAttribute('data-test')?.includes('rate')
        || i.name?.includes('rate')
        || i.placeholder?.toLowerCase().includes('rate')
        || i.closest('[data-test*="rate"]')
        || i.closest('label')?.textContent?.toLowerCase().includes('rate')
    );
    if (!rateInput) return 'no rate input';
    rateInput.focus();
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(rateInput, '{rate_value}');
    rateInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
    rateInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
    rateInput.dispatchEvent(new Event('blur', {{ bubbles: true }}));
    return 'set: ' + rateInput.value;
}})()
""")
```

### 1g. Handle Additional Form Fields（关键新增）

Upwork 提案表单经常有额外字段。必须检测并处理：

```python
extra_fields = await evaluate("""
(() => {
    const result = { questions: [], hasMilestones: false, hasDuration: false, hasFixedBid: false };

    // 1. Client screening questions
    // These appear as labeled textareas or text inputs beyond the cover letter
    const allTextareas = [...document.querySelectorAll('textarea')];
    const allLabels = [...document.querySelectorAll('label, [data-test*="question"], .question-text, h4, h5')];

    for (const label of allLabels) {
        const text = label.textContent.trim();
        // Skip the cover letter label
        if (/cover letter/i.test(text)) continue;
        // Find associated input
        const forId = label.getAttribute('for');
        const input = forId ? document.getElementById(forId)
            : label.closest('.question-container, .form-group, [class*="question"]')?.querySelector('textarea, input[type="text"]');
        if (input && !input.value) {
            result.questions.push({ question: text.slice(0, 200), tagName: input.tagName, inputId: input.id || '' });
        }
    }

    // 2. Fixed-price bid amount
    const bidInputs = [...document.querySelectorAll('input')].filter(i =>
        /bid|amount|price|budget/i.test(i.getAttribute('data-test') || '')
        || /bid|amount|price/i.test(i.name || '')
        || i.closest('label')?.textContent?.toLowerCase()?.match(/bid|amount|your price/)
    );
    if (bidInputs.length > 0) result.hasFixedBid = true;

    // 3. Milestone section
    if (document.body.innerText.match(/milestone|project milestone/i)) {
        result.hasMilestones = true;
    }

    // 4. Project duration
    const durationSelects = document.querySelectorAll('select');
    for (const sel of durationSelects) {
        if (sel.closest('label')?.textContent?.toLowerCase()?.includes('duration')
            || /duration|timeline/i.test(sel.name || '')) {
            result.hasDuration = true;
        }
    }

    return JSON.stringify(result);
})()
""")
```

**Handle each extra field type:**

#### Client Screening Questions
Generate a brief, relevant answer for each question based on the cover letter context and job description:

```python
import json as json_lib
fields = json_lib.loads(extra_fields)

for q in fields["questions"]:
    # Generate a concise answer (2-3 sentences) based on the question and our proposal
    answer = generate_answer(q["question"], proposal["cover_letter"])
    # The answer should be relevant, specific, and professional
    # Fill it using the same native setter pattern
    await evaluate(f"""
    (() => {{
        const inputs = [...document.querySelectorAll('textarea, input[type="text"]')];
        const target = inputs.find(i => i.id === '{q["inputId"]}')
            || document.querySelector('[id="{q["inputId"]}"]');
        if (!target) return 'not found';
        target.focus();
        const proto = target.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(target, {json.dumps(answer)});
        target.dispatchEvent(new Event('input', {{ bubbles: true }}));
        target.dispatchEvent(new Event('change', {{ bubbles: true }}));
        return 'answered';
    }})()
    """)
```

When answering screening questions, follow these rules:
- Keep answers to 2-3 sentences
- Reference specific experience from the cover letter
- If the question asks about availability: "Available to start immediately, typical response time under 2 hours during working hours."
- If the question asks about experience with a tool/tech: be honest — if we know it, describe briefly; if not, describe the closest equivalent we know
- If the question asks for portfolio/examples: include relevant GitHub demo link

#### Fixed-Price Bid Amount
```python
if fields.get("hasFixedBid"):
    bid_amount = proposal["rate"].replace("$", "").replace("fixed", "").strip()
    # Only fill if we have a numeric value
    await evaluate(f"""
    (() => {{
        const bidInput = [...document.querySelectorAll('input')].find(i =>
            /bid|amount|price|budget/i.test(i.getAttribute('data-test') || i.name || '')
            || i.closest('label')?.textContent?.toLowerCase()?.match(/bid|amount|your price/)
        );
        if (!bidInput) return 'no bid input';
        bidInput.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(bidInput, '{bid_amount}');
        bidInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
        bidInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
        return 'bid set: ' + bidInput.value;
    }})()
    """)
```

#### Duration / Timeline Select
```python
if fields.get("hasDuration"):
    # Select a reasonable duration based on job scope
    await evaluate("""
    (() => {
        const selects = document.querySelectorAll('select');
        for (const sel of selects) {
            if (sel.closest('label')?.textContent?.toLowerCase()?.includes('duration')
                || /duration|timeline/i.test(sel.name || '')) {
                // Pick "1 to 3 months" or similar mid-range option
                const options = [...sel.options];
                const preferred = options.find(o => /1 to 3|1-3|less than|1 month/i.test(o.text));
                if (preferred) {
                    sel.value = preferred.value;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    return 'duration set: ' + preferred.text;
                }
            }
        }
        return 'no duration select found';
    })()
    """)
```

### 1h. Final Pre-Submit Verification

Before clicking Submit, verify:

```python
pre_submit = await evaluate("""
(() => {
    const ta = document.querySelector('textarea');
    const coverOk = ta && ta.value.length > 50;
    const submitBtn = [...document.querySelectorAll('button')].find(b =>
        /send proposal|submit proposal/i.test(b.textContent.trim())
        && !b.disabled
        && !/buy|purchase|cancel|back|upgrade/i.test(b.textContent)
    );
    const btnDisabled = submitBtn ? submitBtn.disabled : true;
    const pageText = document.body.innerText.slice(0, 500);
    const needsConnects = /buy connects|purchase connects/i.test(pageText);
    return JSON.stringify({
        coverLetterOk: coverOk,
        submitBtnFound: !!submitBtn,
        submitBtnDisabled: btnDisabled,
        needsConnects,
        btnText: submitBtn?.textContent?.trim() || 'none',
    });
})()
""")
```

If `submitBtnDisabled` or `needsConnects` → **skip**, update tracker.

### 1i. HISTORICAL CLICK SUBMIT STEP - SUPERSEDED

Do not execute this step from this legacy file. Use `task/execute-cdp-applications.md` and require `submit_authorized` plus all gates in `docs/authorization-policy.md`.

```python
submit_result = await evaluate("""
(() => {
    const allBtns = [...document.querySelectorAll('button')];
    const submitBtn = allBtns.find(b =>
        /send proposal|submit proposal/i.test(b.textContent.trim())
        && !b.disabled
        && b.offsetParent !== null
        && !/buy|purchase|cancel|back|upgrade/i.test(b.textContent)
    );
    if (!submitBtn) return 'submit button not found';
    submitBtn.click();
    return 'clicked: ' + submitBtn.textContent.trim();
})()
""")
```

Wait and verify submission:
```python
await asyncio.sleep(6)

post_submit = await evaluate("""
(() => {
    const text = document.body.innerText.slice(0, 1500);
    const success = /proposal sent|proposal submitted|successfully|thank you/i.test(text);
    const error = /error|failed|problem|try again/i.test(text);
    const needsConnects = /buy connects|purchase connects/i.test(text);
    return JSON.stringify({ success, error, needsConnects, snippet: text.slice(0, 400) });
})()
""")
```

Handle result:
- `success` → update tracker to **"Submitted"**
- `needsConnects` → update tracker to "Needs Connects"
- `error` → update tracker to "Submit failed" with error snippet
- button not found → update tracker to "Submit button not found"

```python
if success:
    submitted_count += 1
    if submitted_count >= max_submissions:
        print(f"Reached max {max_submissions} submissions. Stopping.")
        break

# Random delay before next
await asyncio.sleep(random.randint(8, 15))
```

## Step 2: Update Tracker

Update `docs/proposal-tracker.md` with new statuses for every processed proposal.

Status values:
- `Submitted` — proposal sent successfully
- `Pre-filled` — form filled but submit failed (will be retried next run)
- `Job closed` — job no longer available
- `Needs Connects` — insufficient Connects
- `No apply button` — couldn't find apply button
- `Form not found` — proposal form didn't load
- `Fill failed` — couldn't fill required fields
- `Submit failed` — submit button click didn't work
- `Session expired` — redirected to login

## Step 3: Git

```bash
git add docs/proposal-tracker.md
git commit -m "submit proposals [date] - [submitted_count] submitted"
git push origin main
```

## Step 4: Final Report

```
=== Apply Jobs Summary [date] ===
Total to process: X (Y pre-filled from last run + Z new)
Successfully SUBMITTED: A
Pre-filled but submit failed (retry next run): B
Skipped (job closed): C
Skipped (needs Connects): D
Skipped (other): E
Connects remaining: [if visible]

Next step: Run Task 3 to monitor bid status
```

## Historical Safety Constraints - Superseded By Authorization Policy

- **NOT AUTHORIZED BY THIS FILE:** Click "Send Proposal" / "Submit Proposal"
- **NEVER** click Buy Connects or any payment button
- **NEVER** send messages to clients
- **NEVER** accept contracts
- Max 10 submissions per run
- 8-15 second random delay between submissions
- If session expires, STOP immediately
- Log all actions for debugging

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Apply button not found | Use `document.body.innerText` to inspect page. Upwork may have redesigned. |
| Submit button disabled | Form may have required fields unfilled. Check for screening questions. |
| "Buy Connects" shown | Skip — do NOT purchase. Log and move to next. |
| Screening questions empty | Must answer them. Use `generate_answer()` based on job context. |
| Fixed bid field empty | Fill with rate from proposal-drafts.md. |
| Duration select unfilled | Pick mid-range option (1-3 months). |
| Redirected to login | STOP ALL. User must re-login. |
