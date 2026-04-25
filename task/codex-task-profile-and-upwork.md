# Task: Polish Profile + Fill Upwork Profile

## Part 1: Fix profile/upwork-profile.md

Edit `profile/upwork-profile.md` with these two changes only:

1. In the Overview section, change the first sentence from:
   ```
   Former product manager turned full-stack developer.
   ```
   to:
   ```
   Product manager turned full-stack developer.
   ```

2. In the Overview section, change the last line from:
   ```
   Rate: $35/hr. Let's build something useful.
   ```
   to:
   ```
   Let's talk about what you're building.
   ```

3. Update the character count comment to reflect the new length.

Do not change anything else in the file.

## Part 2: Create Proposal Templates

Create these files under `profile/proposal-templates/`:

### general-ai-integration.md

```markdown
# Proposal Template: AI/LLM Integration Project

Hi [Client Name],

I read your job post carefully — [one sentence showing you understood their specific need].

I've built similar solutions before: FastAPI backends integrated with OpenAI/Anthropic APIs, including RAG pipelines, structured data extraction, and streaming chat interfaces. You can see examples in my portfolio.

Here's how I'd approach this:
1. [Step 1 — scoped to their ask]
2. [Step 2]
3. [Step 3]

I can deliver a working first version within [X days]. Happy to jump on a quick call to discuss.

Best,
Zhijian
```

### general-fullstack-mvp.md

```markdown
# Proposal Template: Full-Stack MVP

Hi [Client Name],

[One sentence referencing their specific problem or product idea.]

I specialize in rapid MVP delivery: FastAPI backend + Tailwind CSS frontend, deployed and production-ready. My PM background means I focus on what actually matters for launch — no overengineering.

Proposed approach:
1. [Define scope together — 1 day]
2. [Build core API + basic UI — X days]
3. [Polish, test, deploy — X days]

Deliverables: working app, API docs, deployment guide, clean codebase you can hand off to any developer.

Let me know if you'd like to discuss further.

Best,
Zhijian
```

### general-bug-fix.md

```markdown
# Proposal Template: Bug Fix / Code Review

Hi [Client Name],

I can help with this. [One sentence showing you understood the bug or issue.]

My approach:
1. Reproduce the issue locally
2. Identify root cause (not just patch the symptom)
3. Fix + add a test to prevent regression
4. Document what was wrong and why

I'll keep you updated throughout. Turnaround is usually [X hours/days] for issues like this.

Best,
Zhijian
```

Remove the `.gitkeep` from `profile/proposal-templates/`.

## Part 3: Commit and Push

Commit message: `polish profile overview and add proposal templates`
Push to GitHub.

## Part 4: Fill Upwork Profile via Playwright

Log into Upwork using the credentials in `automation/upwork-browser/credentials.md` and fill in the freelancer profile using the content from `profile/upwork-profile.md`:

1. Navigate to the Upwork profile edit page
2. Set the professional title to: `Full-Stack Python Developer | FastAPI · AI Integration · LLM Applications`
3. Set the overview/bio to the Overview text from the markdown file (the polished version after Part 1 edits)
4. Set hourly rate to $35
5. Add skills: Python, FastAPI, OpenAI API, LangChain, RAG, Tailwind CSS, PostgreSQL, Celery, REST API, Docker
6. Set availability to "More than 30 hrs/week" and "Open to contract"

If any step requires CAPTCHA or 2FA, pause and wait for manual intervention. Save screenshots of each major step to `automation/upwork-browser/screenshots/`.

After profile is filled, update `docs/progress.md` — mark "Upwork account registered" as complete.
Commit message: `mark upwork registration complete`
Push to GitHub.
