# Task: Deploy Portfolio Demos to Public URLs

## Context

Repository: `freelance-ai-ops`
Three demo projects exist in `portfolio/`:
- `portfolio/demo-dashboard/` — Static HTML AI Ops Dashboard
- `portfolio/demo-fastapi-llm/` — FastAPI + LLM backend with structured extraction & streaming
- `portfolio/demo-rag-chatbot/` — RAG chatbot demo

The Upwork profile (`profile/upwork-profile.md`) currently says "Demo links coming soon" for all three.
Proposal templates in `profile/proposal-templates/` do not include live demo URLs.

## Objective

Deploy all three demos to public URLs so clients can see working examples. Update the profile and proposal templates with the live links.

## Step 1: Deploy Dashboard (GitHub Pages)

The dashboard is a static HTML page — perfect for GitHub Pages.

1. The file is at `portfolio/demo-dashboard/index.html`.
2. Deploy to GitHub Pages using one of these approaches:
   - **Option A:** Push `portfolio/demo-dashboard/` as a GitHub Pages source (use `gh-pages` branch or configure in repo settings).
   - **Option B:** Use `gh-pages` npm package or manual branch creation.
3. Verify the deployed URL works: `https://cnalks.github.io/freelance-ai-ops/` or similar.

If GitHub Pages is not easily scriptable, create a standalone `docs/` directory with the dashboard HTML and configure Pages to serve from `/docs`.

## Step 2: Deploy FastAPI LLM Demo

This is a Python backend — needs a hosting service with Python support.

**Option A: Railway (preferred)**
```bash
cd portfolio/demo-fastapi-llm
# Create a Procfile if not exists
echo "web: uvicorn main:app --host 0.0.0.0 --port $PORT" > Procfile
# Create requirements.txt if not exists from the project
pip freeze > requirements.txt
# Deploy via Railway CLI (if available) or push to a deploy branch
```

**Option B: Render**
- Create a `render.yaml` or just push; Render auto-detects Python.

**Option C: If no cloud CLI available**, create a Dockerfile and document the deployment steps for the user to do manually.

**Minimum viable:** If cloud deployment is blocked (no API keys, no CLI), at minimum:
1. Ensure the project has a proper `README.md` with setup instructions.
2. Ensure `requirements.txt` exists.
3. Ensure the app runs locally with `uvicorn main:app`.
4. Add a Dockerfile for easy deployment.
5. Record the local demo URL as a placeholder.

## Step 3: Deploy RAG Chatbot Demo

Same approach as Step 2. This is also a Python backend.

## Step 4: Update Profile with Live Links

Edit `profile/upwork-profile.md`:
- Replace all "Demo links coming soon" with actual deployed URLs.
- If a demo couldn't be deployed, replace with the GitHub repo link + setup instructions.

## Step 5: Update Proposal Templates

Edit all files in `profile/proposal-templates/`:
- Add a line like: "You can see a working example at [URL]" where relevant.
- Match the demo to the template context:
  - `general-ai-integration.md` → link to RAG chatbot + FastAPI LLM demos
  - `general-fullstack-mvp.md` → link to Dashboard + FastAPI LLM demos
  - `general-bug-fix.md` → link to GitHub repo (shows code quality)

## Step 6: Update Progress Tracker

Edit `docs/progress.md`:
- Mark demo deployment as done.
- Update the current phase.

## Step 7: Git

```bash
git add -A
git commit -m "deploy portfolio demos and update profile links [date]"
git push origin main
```

## Important

- Do NOT use paid hosting services without explicit user approval.
- Prefer free tiers (GitHub Pages, Railway free tier, Render free tier).
- If deployment requires API keys or secrets, document what's needed and STOP — let the user provide them.
- If a demo requires an OpenAI API key to function, deploy it but note that the live demo needs a key configured.
