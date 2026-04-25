# Task: Build Demo 3 — AI Ops Dashboard

## Context

This is the `freelance-ai-ops` repo at `https://github.com/CNalks/freelance-ai-ops`.
Work in `portfolio/demo-dashboard/`. Remove the `.gitkeep` file.

## Requirements

Build a static responsive dashboard that showcases frontend skills. This is a portfolio demo — it must look polished and professional. No backend needed; use mock data.

### What to Build

A single-page AI Operations Dashboard that displays:

1. **Top stats row** — 4 metric cards: Total Requests (e.g. 124,892), Avg Latency (342ms), Token Usage (2.1M), Error Rate (0.3%)
2. **Charts section** — Two charts side by side:
   - Daily request volume (bar chart, last 7 days)
   - Token usage by model (donut/pie chart: gpt-4, gpt-3.5-turbo, claude-3)
3. **Recent activity table** — 10 rows showing: timestamp, endpoint, model, tokens, latency, status (success/error)
4. **Sidebar** — Navigation with: Dashboard (active), Models, API Keys, Settings, Docs

### Technical Details

- **Single HTML file** with embedded CSS and JS. No build tools needed.
- Use **Tailwind CSS** via CDN.
- Use **Chart.js** via CDN for the charts.
- All data is hardcoded mock data in JS.
- Must be **fully responsive**: sidebar collapses to hamburger menu on mobile (<768px).
- Color scheme: dark sidebar (#1e293b), white content area, blue accent (#3b82f6).
- Touch-friendly: minimum 44px tap targets on mobile.

### File Structure

```
demo-dashboard/
├── README.md
├── index.html
└── screenshot.png    # Take a screenshot after building (or skip if not possible)
```

### README.md Content

- Project title and one-line description
- Screenshot placeholder
- How to open: "Open index.html in a browser"
- Tech: Tailwind CSS, Chart.js
- Note: "Static demo with mock data. In production, this connects to a FastAPI backend."

### Quality Checks

- Open the HTML file and verify it renders without console errors.
- Verify responsive layout works at 390px width and 1440px width.

### Git

Commit message: `add ai-ops dashboard demo with responsive layout`
Push to GitHub.
Update `docs/progress.md` — mark "Demo project 3: Dashboard" as complete.
