# Freelance AI Ops

AI-assisted freelancing workflow for Upwork. This repo is the single source of truth for the profile, proposal templates, portfolio demos, job leads, proposal drafts, automation scripts, and active client projects.

## Acquisition OS Entry Points

1. Read `docs/acquisition-os-architecture.md`
2. Set policy in `docs/connects-policy.md`
3. Use `task/plan-daily-acquisition.md`
4. Build proposal packages
5. Execute only authorized CDP actions
6. Review sessions and audit policy patches

## What This Repo Contains

| Path | Purpose |
|------|---------|
| `profile/` | Upwork profile draft, proposal templates, and client communication templates |
| `portfolio/` | Demo projects for AI/LLM, FastAPI backend, RAG, and dashboard work |
| `automation/` | Browser automation and helper scripts |
| `docs/` | Workflow, pricing, progress, job leads, proposal drafts, and tracker files |
| `projects/` | One folder per accepted client project |
| `task/` | Codex task specs used to run repeatable workflows |

## Daily Workflow

1. Search recent Upwork jobs with the Raw CDP scraper.
2. Review `docs/job-leads.md` and prioritize high-fit jobs.
3. Draft or refine proposals in `docs/proposal-drafts.md`.
4. Pre-fill proposal forms through Raw CDP and review manually before submit.
5. Track proposal status in `docs/proposal-tracker.md`.
6. When a contract is won, create a project folder under `projects/`.

## Job Search

Chrome must be running with CDP on port `9222`.

```bash
python C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper\scrape_jobs.py --output docs/job-leads.md
```

Or give Codex the task file:

```text
task/codex-task-job-search-v2.md
```

## Key Docs

- `docs/workflow.md` - operating workflow
- `docs/pricing.md` - pricing strategy
- `docs/progress.md` - current status
- `docs/job-leads.md` - latest job search results
- `docs/proposal-drafts.md` - proposal drafts for review

## Portfolio

- `portfolio/demo-rag-chatbot/` - FastAPI RAG chatbot with LangChain, OpenAI API, and ChromaDB
- `portfolio/demo-fastapi-llm/` - FastAPI LLM backend with completions, streaming, extraction, and summarization
- `portfolio/demo-dashboard/` - static AI Ops dashboard with Tailwind CSS and Chart.js
