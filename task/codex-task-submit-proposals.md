# Task: Pre-fill Upwork Proposals via Raw CDP

## Context

Repository: `freelance-ai-ops`
Proposal drafts are in `docs/proposal-drafts.md`.
Job leads are in `docs/job-leads.md`.
Raw CDP scraper tools are at `C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\`.
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.

## CRITICAL SAFETY RULE

**DO NOT click Submit / Send Proposal.** Only pre-fill the form.
The user will review and submit manually.

## Browser Access Method

Same as `codex-task-job-search-v2.md` — use Raw CDP via WebSocket only.
DO NOT use Playwright. DO NOT use Windows MCP.

```python
import websockets, json, asyncio, urllib.request
CDP_HTTP = "http://127.0.0.1:9222"
```

## Objective

For each High-priority job in `docs/proposal-drafts.md`, open the proposal form on Upwork and pre-fill the cover letter and rate. Do NOT submit.

## Step 1: Parse Proposal Drafts

Read `docs/proposal-drafts.md` and extract:
- Job URL
- Cover letter text
- Suggested rate

## Step 2: For Each Proposal

### 2a. Navigate to the Job Page

```python
await cdp.navigate(job_url)
await cdp.wait_cloudflare(timeout=15)
```

### 2b. Check Job Status

Verify the job is still open:
```python
status = await cdp.evaluate("""
    document.body.innerText.includes('This job is closed')
    || document.body.innerText.includes('No longer accepting')
""")
```
If closed, skip and log.

### 2c. Click "Apply Now" / "Submit a Proposal"

Find and click the apply button:
```python
await cdp.evaluate("""
    const btn = document.querySelector(
        'button[data-test="apply-button"], a[href*="proposals/job"], button.up-btn-primary'
    );
    if (btn) btn.click();
""")
```
Wait for the proposal form to load.

### 2d. Fill Cover Letter

```python
cover_letter = "..."  # from parsed proposal
await cdp.evaluate(f"""
    const textarea = document.querySelector(
        'textarea[data-test="cover-letter"], textarea#cover_letter, textarea'
    );
    if (textarea) {{
        textarea.focus();
        textarea.value = {json.dumps(cover_letter)};
        textarea.dispatchEvent(new Event('input', {{bubbles: true}}));
        textarea.dispatchEvent(new Event('change', {{bubbles: true}}));
    }}
""")
```

### 2e. Fill Rate (if hourly)

```python
rate = "35"  # from parsed proposal
await cdp.evaluate(f"""
    const rateInput = document.querySelector(
        'input[data-test="rate-input"], input[name*="rate"], input[type="number"]'
    );
    if (rateInput) {{
        rateInput.focus();
        rateInput.value = {json.dumps(rate)};
        rateInput.dispatchEvent(new Event('input', {{bubbles: true}}));
        rateInput.dispatchEvent(new Event('change', {{bubbles: true}}));
    }}
""")
```

### 2f. DO NOT Submit — Log Status

```python
# Verify fields are filled
filled_letter = await cdp.evaluate("document.querySelector('textarea')?.value?.length || 0")
print(f"  Cover letter filled: {filled_letter} chars")
print(f"  STATUS: READY FOR REVIEW — user must click Submit manually")
```

## Step 3: Track Submitted Proposals

Create or update `docs/proposal-tracker.md`:

```markdown
# Proposal Tracker

| Date | Job Title | URL | Status | Rate | Notes |
|------|-----------|-----|--------|------|-------|
| 2026-04-25 | AI Agent Developer | [link] | Pre-filled | $35/hr | Awaiting user review |
```

## Step 4: Git

```bash
git add docs/proposal-tracker.md
git commit -m "track proposal submissions [date]"
git push origin main
```

## Important Constraints

- **NEVER click Submit, Send, or any button that would actually submit the proposal.**
- Only fill in form fields and navigate to the right pages.
- If the proposal form UI has changed and selectors don't match, use `document.body.innerText` to inspect and adapt.
- If Upwork requires "Connects" to submit and you can't determine the connect cost, log it and move on.
- Keep a 3-second delay between proposals to avoid rate limiting.
- If any error occurs, log it and continue to the next proposal — don't stop.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Apply" button not found | Job may require different flow. Log and skip. |
| Cover letter textarea not found | Upwork may have redesigned. Use `document.body.innerText` to inspect. |
| Rate input not found | May be a fixed-price job. Skip rate filling. |
| Redirected to login | Session expired. User must log in again in CDP Chrome. |
