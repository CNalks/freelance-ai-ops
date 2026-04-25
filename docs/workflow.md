# Workflow - Codex-Assisted Upwork Freelancing

## Daily Routine

### 1. Job Search

- Ensure CDP Chrome is running on port `9222`.
- Run the Raw CDP scraper:

```bash
python C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\scrape_jobs.py --output docs/job-leads.md
```

- Or give Codex `task/codex-task-job-search-v2.md`.
- Review `docs/job-leads.md` and focus on high-priority jobs with payment verification, client history, recent posting time, and lower proposal count.

### 2. Review and Draft Proposals

- Use `docs/proposal-drafts.md` as the working draft file.
- Keep each proposal under 200 words.
- Reference specific details from the job post.
- Match the proposal to the portfolio: AI integration, FastAPI backend, RAG chatbot, dashboard, or MVP delivery.

### 3. Submit Proposals

- Use Raw CDP to open proposal forms and pre-fill fields.
- Do not let automation click Submit or Send Proposal.
- User reviews, edits, sets any missing bid details, and submits manually.
- Track every attempt in `docs/proposal-tracker.md`.

### 4. Client Communication

- When a client replies, answer in Upwork messages.
- Use `profile/client-templates/` for first response, scope clarification, and milestone updates.
- Use `profile/proposal-templates/` only as a starting point; customize every message.

### 5. Project Execution

- Accept contract on Upwork only after scope, milestone, timeline, and payment terms are clear.
- Create a new folder under `projects/`.
- Keep code, notes, deliverables, and client-specific context inside that project folder.
- Commit regularly and document setup, test, and delivery steps.

## Tools

| Tool | Purpose | Location |
|------|---------|----------|
| Raw CDP Scraper | Job search and proposal form pre-fill | `C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\` |
| Proposal Templates | Drafting proposal starting points | `profile/proposal-templates/` |
| Client Templates | Reply and delivery communication | `profile/client-templates/` |
| Job Leads | Saved search results | `docs/job-leads.md` |
| Proposal Drafts | Ready-to-review proposals | `docs/proposal-drafts.md` |
| Proposal Tracker | Proposal status log | `docs/proposal-tracker.md` |

## Codex Task Files

| Task | File | Description |
|------|------|-------------|
| Job Search | `task/codex-task-job-search-v2.md` | Search jobs and draft proposals with Raw CDP |
| Deploy Demos | `task/codex-task-deploy-demos.md` | Publish demo links and update profile/templates |
| Submit Proposals | `task/codex-task-submit-proposals.md` | Pre-fill Upwork proposal forms |
| Complete Docs | `task/codex-task-complete-docs.md` | Maintain docs, pricing, workflow, and progress |

## Operating Rules

- Never submit Upwork proposals automatically.
- Never commit secrets, credentials, `.env`, `.venv`, runtime data, or local screenshots unless explicitly required.
- Keep profile and templates aligned with the latest portfolio links.
- Update `docs/progress.md` after each major workflow milestone.
