import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const CDP_HTTP = "http://127.0.0.1:9222";
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const QUERIES = [
  "FastAPI Python backend",
  "OpenAI API integration",
  "AI chatbot development",
  "LLM application development",
  "Python MVP",
];

const PORTFOLIO = {
  fastapi: "https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm",
  rag: "https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot",
  dashboard: "https://cnalks.github.io/freelance-ai-ops/",
};

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
      this.ws.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.pending.has(data.id)) {
          const { resolve: ok, reject: fail } = this.pending.get(data.id);
          this.pending.delete(data.id);
          if (data.error) fail(new Error(JSON.stringify(data.error)));
          else ok(data.result || {});
        } else if (data.method) {
          this.events.push(data);
        }
      });
    });
    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  async send(method, params = {}) {
    const id = ++this.nextId;
    const payload = Object.keys(params).length ? { id, method, params } : { id, method };
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
    this.ws.send(JSON.stringify(payload));
    return promise;
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    const value = result.result || {};
    if (value.type === "undefined") return undefined;
    return value.value ?? value.description;
  }

  async navigate(url, waitMs = 3500) {
    this.events.length = 0;
    await this.send("Page.navigate", { url });
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (this.events.some((e) => ["Page.loadEventFired", "Page.frameStoppedLoading"].includes(e.method))) break;
      await sleep(250);
    }
    await sleep(waitMs);
    await this.waitCloudflare();
  }

  async waitCloudflare() {
    for (let i = 0; i < 25; i++) {
      const title = String(await this.evaluate("document.title") || "");
      if (!/moment|challenge|checking|请稍候|just a moment/i.test(title)) return;
      await sleep(1000);
    }
  }

  close() {
    this.ws.close();
  }
}

async function getCdp() {
  const version = await fetch(`${CDP_HTTP}/json/version`);
  if (!version.ok) throw new Error("Chrome CDP is not reachable at 127.0.0.1:9222");
  const tabs = await (await fetch(`${CDP_HTTP}/json`)).json();
  let tab = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl && /upwork/i.test(t.url || ""));
  tab ||= tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!tab) {
    const created = await fetch(`${CDP_HTTP}/json/new?about:blank`, { method: "PUT" });
    tab = await created.json();
  }
  const cdp = new CDP(tab.webSocketDebuggerUrl);
  await cdp.connect();
  return cdp;
}

function read(rel) {
  return fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "";
}

function write(rel, text) {
  fs.writeFileSync(path.join(ROOT, rel), text, "utf8");
}

function jobId(url) {
  return (String(url).match(/~0?(\d{12,})/) || [])[1] || String(url);
}

function parseTableRows(markdown) {
  return markdown.split(/\r?\n/).filter((line) => /^\| \d{4}-\d{2}-\d{2} \|/.test(line)).map((line) => {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    return { line, date: cells[0], title: cells[1], url: cells[2], status: cells[3], rate: cells[4], notes: cells[5] || "" };
  });
}

function parseDrafts(markdown) {
  const entries = new Map();
  const chunks = markdown.split(/\n## Job: /).slice(1);
  for (const chunk of chunks) {
    const title = chunk.split(/\r?\n/)[0].trim();
    const url = (chunk.match(/\*\*URL:\*\*\s*(.+)/) || [])[1]?.trim();
    const cover = (chunk.match(/### Cover Letter\s+([\s\S]*?)\s+### Suggested Rate/) || [])[1]?.trim();
    const rate = (chunk.match(/### Suggested Rate\s+([\s\S]*?)(?:\n###|\n---|$)/) || [])[1]?.trim();
    if (url) entries.set(jobId(url), { title, url, cover, rate });
  }
  return entries;
}

function updateTrackerRows(updates) {
  const rel = "docs/proposal-tracker.md";
  let text = read(rel);
  for (const [id, change] of updates) {
    text = text.split(/\r?\n/).map((line) => {
      if (!line.includes("|") || !line.includes(id)) return line;
      const cells = line.split("|");
      if (cells.length < 7) return line;
      cells[4] = ` ${change.status} `;
      if (change.rate) cells[5] = ` ${change.rate} `;
      cells[6] = ` ${change.notes} `;
      return cells.join("|");
    }).join("\n");
  }
  write(rel, text.endsWith("\n") ? text : `${text}\n`);
}

function extractJobsScript() {
  return fs.readFileSync("C:/Users/a8744/Desktop/for-codex/Upwork/automation/upwork-cdp-scraper/extract_jobs.js", "utf8");
}

async function checkLogin(cdp) {
  await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches", 3500);
  const text = String(await cdp.evaluate("document.body.innerText.slice(0, 1000)") || "");
  if (/Log In|Sign Up/i.test(text)) throw new Error("Session expired: Upwork login required");
  return text.slice(0, 120);
}

async function checkNotifications(cdp) {
  const raw = await cdp.evaluate(`JSON.stringify({
    messages: document.querySelector('[data-test="messages-count"]')?.textContent?.trim() || '0',
    notifications: document.querySelector('[data-test="notifications-count"]')?.textContent?.trim() || '0'
  })`);
  return JSON.parse(raw || "{}");
}

function scoreJob(job) {
  let score = 0;
  const budget = `${job.budget || ""} ${job.description || ""}`;
  const proposals = String(job.proposals || "").toLowerCase();
  if (job.paymentVerified) score += 3;
  if (/\$[1-9]/.test(job.clientSpend || "")) score += 3;
  if (/less than 5|5 to 10|10 to 15/.test(proposals)) score += 2;
  if (/minute|hour|just now/.test(String(job.posted || "").toLowerCase())) score += 1;
  if (/FastAPI|Python|OpenAI|LLM|chatbot|API|backend|automation/i.test(`${job.title} ${job.description} ${(job.skills || []).join(" ")}`)) score += 3;
  if (/50\+|20 to 50/.test(proposals)) score -= 3;
  if (/\$0\s*spent/i.test(job.clientSpend || "")) score -= 3;
  if (/\$([0-2]?\d)\s*(fixed|budget)?/i.test(budget) && !/\$[3-9]\d|\$[1-9]\d{2,}/.test(budget)) score -= 5;
  if (/mobile-only|shopify|wordpress|angular|vue|blockchain|salesforce|sap/i.test(`${job.title} ${job.description}`)) score -= 2;
  return score;
}

function strategicDecision(job) {
  const text = `${job.title}\n${job.budget}\n${job.description}\n${job.fullText || ""}`.slice(0, 10000);
  const proposals = String(job.proposals || "");
  if (/50\+/.test(proposals)) return { decision: "SKIP", risk: "High", reason: "Proposal count is already too high for a new account." };
  if (/\$0\s*spent/i.test(job.clientSpend || "") && !job.paymentVerified) return { decision: "SKIP", risk: "High", reason: "Client history is too weak for cold-start Connects." };
  if (/\$([0-2]?\d)\s*(fixed|budget)?/i.test(`${job.budget} ${job.description}`) && !/\$[3-9]\d|\$[1-9]\d{2,}/.test(`${job.budget} ${job.description}`)) {
    return { decision: "SKIP", risk: "High", reason: "Budget is below the minimum practical threshold." };
  }
  if (/FastAPI|Python|OpenAI|LLM|RAG|chatbot|backend|API|automation/i.test(text) && !/20 to 50|50\+/.test(proposals)) {
    return {
      decision: "APPLY",
      risk: /fixed|unclear|asap|urgent/i.test(text) ? "Medium" : "Low",
      reason: "Good technical fit with Python/FastAPI/AI work, credible competition level, and a scoped first milestone path.",
    };
  }
  return { decision: "SKIP", risk: "Medium", reason: "Not enough direct fit for the current FastAPI/AI positioning." };
}

function proposalFor(job) {
  const title = job.title || "this project";
  const text = `${title}\n${job.description}\n${job.fullText || ""}`;
  const isChat = /chatbot|whatsapp|assistant|rag|conversation/i.test(text);
  const isBackend = /fastapi|backend|api|postgres|redis|database/i.test(text);
  const isAutomation = /automation|workflow|script|integrat/i.test(text);
  const demo = isChat ? PORTFOLIO.rag : isBackend ? PORTFOLIO.fastapi : PORTFOLIO.dashboard;
  const rate = /\$([1-2]\d)\s*-\s*\$?([2-3]\d)\s*\/?hr/i.test(job.budget || "")
    ? `$${RegExp.$2}/hr`
    : isChat || /LLM|OpenAI/i.test(text) ? "$35/hr" : "$30/hr";
  const hook = isChat
    ? "Your assistant needs reliable conversation flow, not just a generic chatbot wrapper."
    : isBackend
      ? "Your backend needs clear API boundaries, reliable data flow, and code that is easy to extend."
      : isAutomation
        ? "Your automation needs a small, testable workflow first so the integration is reliable before it grows."
        : "Your project needs a focused first slice that can be shipped and validated quickly.";
  const steps = isChat
    ? "I would start by mapping the message states, then wire the LLM/API layer, and finally add logs plus a small test set for common user paths."
    : isBackend
      ? "I would start by confirming the API contract, then implement the core endpoints/data model, and finally add simple verification docs so the handoff is clean."
      : "I would start by confirming the inputs/outputs, then build the smallest working integration, and finally document how to run and maintain it.";
  const question = isChat
    ? "Which channel or user flow should the first version support end to end?"
    : isBackend
      ? "Which endpoint or workflow should be delivered first?"
      : "What is the first workflow you want fully automated and tested?";
  const cover = `${hook}\n\n${steps}\n\nRelevant example: ${demo}\n\nTimeline estimate: 2-5 days for a first working slice, depending on existing code/API access.\n\n${question}`;
  return { cover, rate, hook, demo, question };
}

async function taskFindJobs() {
  const tracker = read("docs/proposal-tracker.md");
  const known = new Set([...tracker.matchAll(/https:\/\/www\.upwork\.com\/jobs\/[^ |]+/g)].map((m) => jobId(m[0])));
  const cdp = await getCdp();
  await checkLogin(cdp);
  const extractJs = extractJobsScript();
  const all = [];
  for (const query of QUERIES) {
    const url = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(query)}&sort=recency&per_page=10`;
    await cdp.navigate(url, 4500);
    const raw = await cdp.evaluate(extractJs);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    for (const job of parsed.jobs || []) all.push({ ...job, query });
    await sleep(1500);
  }
  const unique = [];
  const seen = new Set();
  let trackedOrDuplicate = 0;
  for (const job of all) {
    const id = jobId(job.url);
    if (seen.has(id) || known.has(id)) {
      trackedOrDuplicate += 1;
      continue;
    }
    seen.add(id);
    unique.push({ ...job, id, score: scoreJob(job) });
  }
  unique.sort((a, b) => b.score - a.score);
  const candidates = unique.filter((j) => j.score > 0).slice(0, 10);
  for (const job of candidates) {
    await cdp.navigate(job.url, 4000);
    job.fullText = String(await cdp.evaluate("document.body.innerText.slice(0, 6000)") || "");
    job.review = strategicDecision(job);
    await sleep(800);
  }
  const selected = candidates.filter((j) => j.review.decision === "APPLY").slice(0, 5);
  const notifs = await checkNotifications(cdp);
  cdp.close();

  const lines = [
    `# Job Leads - ${TODAY}`,
    "",
    "## Daily Run Summary",
    "",
    "- Source: Upwork Raw CDP, logged-in Chrome at `127.0.0.1:9222`.",
    `- Searches: ${QUERIES.join(", ")}.`,
    `- Raw results: ${all.length} scraped rows.`,
    `- Deduplicated against tracker: ${trackedOrDuplicate} already tracked/duplicate jobs skipped.`,
    `- New jobs found: ${unique.length} unique jobs.`,
    `- AI reviewed: ${candidates.length} candidates with full/visible job text.`,
    `- Selected for proposal: ${selected.length}.`,
    `- Notifications check: messages \`${notifs.messages || "0"}\`; notifications \`${notifs.notifications || "0"}\`.`,
    "- No proposals submitted, no messages sent, no Connects purchase clicked during Task 1.",
    "",
    "## Selected Leads",
    "",
  ];
  if (!selected.length) lines.push("No lead passed the AI strategic review today.", "");
  for (const job of selected) {
    const p = proposalFor(job);
    job.proposal = p;
    lines.push(`### ${job.title}`, "");
    lines.push(`- URL: ${job.url}`);
    lines.push(`- Budget: ${job.budget || "Not visible"}`);
    lines.push(`- Posted: ${job.posted || "Not visible"}`);
    lines.push(`- Proposals: ${job.proposals || "Not visible"}`);
    lines.push(`- Client: ${[job.clientCountry, job.clientSpend, job.paymentVerified ? "payment verified" : ""].filter(Boolean).join(", ") || "Not visible"}`);
    lines.push("- Decision: APPLY");
    lines.push(`- Reasoning: ${job.review.reason}`);
    lines.push(`- Proposal angle: ${p.hook}`);
    lines.push(`- Risk level: ${job.review.risk}`);
    lines.push("- Expected Connects cost: visible on apply form, not recorded in docs.");
    lines.push("");
  }
  lines.push("## Reviewed But Skipped", "", "| Job | Reason |", "|-----|--------|");
  for (const job of candidates.filter((j) => j.review.decision !== "APPLY")) {
    lines.push(`| ${job.title || "Untitled"} | ${job.review.reason.replace(/\|/g, "/")} |`);
  }
  lines.push("");
  write("docs/job-leads.md", `${lines.join("\n")}\n`);

  const draft = [`# Proposal Drafts - ${TODAY}`, ""];
  for (const job of selected) {
    const p = job.proposal || proposalFor(job);
    draft.push(`## Job: ${job.title}`);
    draft.push(`**URL:** ${job.url}`);
    draft.push(`**AI Review:** ${job.review.reason}`);
    draft.push("", "### Cover Letter", "", p.cover, "", "### Suggested Rate", p.rate, "", "### Proposal Strategy Notes");
    draft.push(`- Hook: ${p.hook}`);
    draft.push(`- Demo to link: ${p.demo}`);
    draft.push(`- Clarifying question: ${p.question}`);
    draft.push(`- Risk: ${job.review.risk} based on client history, competition, and scope clarity.`, "", "---", "");
  }
  write("docs/proposal-drafts.md", draft.join("\n"));

  if (selected.length) {
    const existing = read("docs/proposal-tracker.md");
    const rows = selected.filter((j) => !existing.includes(jobId(j.url))).map((job) => {
      const p = job.proposal || proposalFor(job);
      return `| ${TODAY} | ${job.title.replace(/\|/g, "/")} | ${job.url} | Ready to submit | ${p.rate} | ${job.review.reason.replace(/\|/g, "/")} |`;
    });
    if (rows.length) write("docs/proposal-tracker.md", `${existing.trimEnd()}\n${rows.join("\n")}\n`);
  }
  return { raw: all.length, duplicate: trackedOrDuplicate, reviewed: candidates.length, selected: selected.length };
}

async function clickApplyIfNeeded(cdp) {
  return await cdp.evaluate(`(() => {
    if ([...document.querySelectorAll('textarea')].some(t => t.offsetParent !== null)) return 'already form';
    if ([...document.querySelectorAll('button')].some(b => /send proposal|submit proposal|send for\\s+\\d+\\s+connects/i.test((b.textContent || '').trim()) && b.offsetParent !== null)) return 'already form';
    const els = [...document.querySelectorAll('a,button')];
    const btn = els.find(e => /apply now|submit a proposal|send proposal/i.test((e.textContent || '').trim())
      && !/buy|purchase|connects|upgrade/i.test(e.textContent || '')
      && !e.disabled && e.offsetParent !== null);
    if (!btn) return 'no apply button';
    btn.click();
    return 'clicked apply';
  })()`);
}

function coverFromPage(title, pageText) {
  const text = `${title}\n${pageText}`;
  const isVoice = /voice|avatar|speech|conversation/i.test(text);
  const isData = /database|postgres|mapping|geofence|survey|twilio|sms/i.test(text);
  const isAi = /AI|OpenAI|agent|chatbot|LLM|automation/i.test(text);
  const demo = isAi ? PORTFOLIO.rag : isData ? PORTFOLIO.fastapi : PORTFOLIO.dashboard;
  const hook = isVoice
    ? "Your real-time voice workflow needs a reliable conversation loop before the avatar layer grows."
    : isData
      ? "Your MVP needs the backend data flow working cleanly before polishing the interface."
      : isAi
        ? "Your AI workflow needs a practical first slice that can be tested and improved quickly."
        : "Your project needs a focused implementation path with clear deliverables.";
  const steps = isData
    ? "I would start by confirming the data model and inputs, then build the core API/workflow, and finally add simple logging or export checks so results can be verified."
    : "I would start by confirming the first user workflow, then build the API/automation layer, and finally document how to test and extend it.";
  const question = isData
    ? "Which dataset or user workflow should be completed first?"
    : "Which workflow should the first milestone prove end to end?";
  return `${hook}\n\n${steps}\n\nRelevant example: ${demo}\n\nTimeline estimate: 2-5 days for a first working slice, depending on access.\n\n${question}`;
}

async function fillProposalForm(cdp, proposal) {
  const safeCover = JSON.stringify(proposal.cover || "");
  const numeric = (proposal.rate || "").match(/(\d+(?:\.\d+)?)/)?.[1] || "";
  const safeNumber = JSON.stringify(numeric);
  const safeTitle = JSON.stringify(proposal.title || "");
  return JSON.parse(await cdp.evaluate(`(() => {
    const out = { cover: false, rate: false, duration: false, questions: 0, requiredEmpty: [], title: ${safeTitle} };
    const setVal = (el, value) => {
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    };
    const textareas = [...document.querySelectorAll('textarea')].filter(t => t.offsetParent !== null);
    const coverTa = textareas.find(t => /cover|letter|proposal|details/i.test((t.closest('label,fieldset,section,div')?.innerText || '').slice(0, 500))) || textareas[0];
    if (coverTa) {
      if ((coverTa.value || '').trim().length < 50 && (${safeCover}).length > 50) setVal(coverTa, ${safeCover});
      out.cover = (coverTa.value || '').trim().length > 50;
    }
    const answerFor = (el, index) => {
      const label = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.closest('label,fieldset,section,div')?.innerText]
        .filter(Boolean).join('\\n').slice(0, 1400).toLowerCase();
      const title = (${safeTitle}).toLowerCase();
      if (/qa engineer|code auditor|security backend/.test(title)) {
        if (index === 0) return 'I would make the Slack endpoint do only signature/auth checks, durable persistence, and SQS enqueue, then return 200 immediately. Twilio Lookup, the secondary API, PostgreSQL writes, and SMS delivery should run in idempotent background workers with correlation IDs, retry limits, and explicit status transitions.';
        if (index === 1) return 'The worker should call the external API with a strict timeout and catch network/5xx/parse failures separately. On failure it should update that specific record to MANUAL_REVIEW_REQUIRED with the failure reason, emit structured logs/alerts, and ack or retry according to policy so the queue never locks.';
        if (index === 2) return 'I would audit JWT claims through FastAPI dependencies per protected route, keep S3 private with short-lived presigned URLs issued only after authorization, and log every access decision. For GeoIP/IP checks, I would trust headers only from known proxies and route suspicious mismatches to manual verification.';
      }
      if (/full-stack software developer|openai|long-term position/.test(title)) {
        if (index === 0) return 'I build Python/FastAPI and AI API workflows with a focus on reliable pipelines, clean API boundaries, and maintainable handoff docs. For this project, the best fit is turning Zoom recordings into structured Markdown and vector-ingestion-ready knowledge assets.';
        if (index === 1) return 'Relevant examples: FastAPI + LLM backend: https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm and RAG chatbot: https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot.';
        if (index === 2) return 'I have worked with LLM API workflows including structured prompts, retrieval patterns, API-backed generation, and logging around model outputs. I would keep the ingestion and retrieval steps testable so content quality problems are easy to trace.';
        if (index === 3) return 'GitHub: https://github.com/CNalks. Relevant demos are under https://github.com/CNalks/freelance-ai-ops.';
        if (index === 4) return 'I would run a pilot batch first: transcribe through AssemblyAI, segment by speaker/client and question boundaries, normalize each answer into the required Markdown schema with source timestamps, then validate before vector ingestion. Once accepted, the same pipeline can process the full archive in batches.';
      }
      if (/simple chat bot|landing page/.test(title)) {
        if (index === 0) return 'Typical clients are founder-led teams, solo operators, coaches, consultants, and small service businesses that need practical automation, booking, CRM, chatbot, or internal workflow systems.';
        if (index === 1) return 'My stack is Python/FastAPI for backend/API work, JavaScript/TypeScript when needed, Telegram/chatbot flows, booking/calendar integrations, email automation, and simple dashboards or documentation for handoff.';
        if (index === 2) return 'For a clear implementation package, I usually quote a focused fixed milestone around $500, or $35/hr for ongoing technical work. I prefer one complete, tested launch flow first before expanding.';
      }
      if (/claude ai expert/.test(title)) {
        if (index === 0) return 'Recent similar work includes AI workflow design, LLM API integration patterns, CRM-style routing, lead workflow automation, and handoff documentation. I would start with one lead path, then connect Claude responses, CRM fields, and Zapier triggers around that path.';
        if (index === 1) return 'Frameworks and tools: Python/FastAPI, OpenAI/Anthropic API patterns, webhook/API integrations, Zapier-style automations, CRM pipelines, chatbot flows, GitHub, and lightweight dashboard/reporting workflows.';
      }
      if (/hud parser|computer vision/.test(title)) {
        if (index === 0) return 'I would audit class distribution and ROI crop quality first, then use stratified splits plus targeted augmentation/oversampling for rare states such as KO banners. The eval log should report per-class precision/recall and confusion cases, not only aggregate accuracy, before ONNX export.';
        if (index === 1) return 'I would reduce OCR calls by running detection/ROI gating first, crop only text regions that changed or affect state transitions, and cache stable HUD values across frames. If PaddleOCR still dominates, I would tune preprocessing and batch/async the OCR stage while keeping the 2fps pipeline deterministic.';
        if (index === 2) return 'I would replay false negatives with ROI crops, confidence scores, labels, and state-machine context side by side. Then I would classify the miss as label noise, ROI drift, model confusion, or threshold/post-processing error and prove the fix in a new append-only shadow-mode run.';
        if (index === 3) return 'My closest experience is production-oriented Python AI/API work: typed pipelines, Pydantic schemas, FastAPI integration, eval/logging discipline, and handoff docs. For this project I would keep the CV model work tied to measurable JSON event accuracy.';
      }
      if (/timeout|slack|3 seconds|webhook acknowledgment|drop the slack/i.test(label)) {
        return 'I would keep the Slack route thin: verify the signature, persist the payload, enqueue a job to SQS/background worker, and return 200 immediately inside the 3-second window. Twilio lookup, secondary API calls, PostgreSQL updates, and SMS sending belong in idempotent workers with correlation IDs, retries, and status transitions.';
      }
      if (/graceful degradation|external api|offline|manual_review|required|queue/i.test(label)) {
        return 'The worker should wrap the external call with a strict timeout and typed exception handling, then update only that load/user record to MANUAL_REVIEW_REQUIRED with the failure reason and retry metadata. The job should ack/fail deliberately so the queue does not lock, while alerts/logs make the manual path visible.';
      }
      if (/security|rbac|jwt|s3|presigned|zero-trust|geoip|anti-spoof/i.test(label)) {
        return 'I would audit JWT claims through FastAPI dependencies per route/action, keep S3 buckets private, issue short-lived presigned URLs only after authorization, and log every access decision. For IP/GeoIP, I would trust proxy headers only from known infrastructure and treat location mismatch as a risk signal routed to manual verification.';
      }
      if (/short intro|about your experience/i.test(label)) {
        return 'I build Python/FastAPI and AI API workflows with a focus on reliable pipelines, clean API boundaries, and maintainable handoff docs. My strongest fit here is turning OpenAI/vector/transcription requirements into a tested processing flow rather than a one-off script.';
      }
      if (/examples|relevant projects|past projects/i.test(label)) {
        return 'Relevant examples: FastAPI + LLM backend: https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-fastapi-llm and RAG chatbot: https://github.com/CNalks/freelance-ai-ops/tree/main/portfolio/demo-rag-chatbot. These show the same API, LLM, and retrieval patterns needed for knowledge-system work.';
      }
      if (/openai api|anthropic|claude/i.test(label) && /experience|worked|similar/i.test(label)) {
        return 'I have worked with LLM API patterns including structured prompts, retrieval flows, API-backed workflows, and logging around model outputs. For this project I would keep prompts, routing rules, and data mappings explicit so the workflow can be maintained after delivery.';
      }
      if (/github profile|github/i.test(label)) {
        return 'GitHub: https://github.com/CNalks. Relevant demos are under https://github.com/CNalks/freelance-ai-ops.';
      }
      if (/zoom|transcription|assemblyai|segmentation|markdown|vector/i.test(label)) {
        return 'I would run a pilot batch first: transcribe through AssemblyAI, segment by speaker/client and question boundaries, normalize each answer into the required Markdown schema with source timestamps, then validate before vector ingestion. Once the schema is accepted, the same pipeline can process the full archive in batches.';
      }
      if (/typical client|industry|company size/i.test(label)) {
        return 'Typical clients are founder-led teams, solo operators, and small service businesses that need practical automation, booking, CRM, chatbot, or internal workflow systems. The best fit is a clear launch package where implementation and handoff matter more than heavy custom architecture.';
      }
      if (/what stack|stack do you use|frameworks/i.test(label)) {
        if (/hud|computer vision|parser/i.test(title)) return 'Python 3.11, OpenCV, ONNX Runtime, PaddleOCR-style OCR pipelines, FastAPI, Pydantic, pytest/eval scripts, and structured JSON event outputs. I would keep production inference separate from training utilities and log every eval run.';
        return 'Python/FastAPI, JavaScript/TypeScript where needed, OpenAI/Anthropic APIs, webhook/API integrations, lightweight dashboards, GitHub, and SaaS automation tools such as Zapier-style workflows, CRMs, chatbots, and calendars.';
      }
      if (/average fee|fee for your services/i.test(label)) {
        return 'For implementation packages, I usually quote either a focused fixed first milestone around $500 when scope is clear, or $35/hr for ongoing technical work. I prefer one complete, tested launch flow first before expanding.';
      }
      if (/500 labelled|500 labeled|imbalanced|ko banner|target classes/i.test(label)) {
        return 'I would first audit class distribution and ROI crop quality, then use stratified splits plus targeted augmentation/oversampling for rare states such as KO banners. The eval log should report per-class precision/recall, not only aggregate accuracy, so imbalance problems are visible before ONNX export.';
      }
      if (/2fps|ocr|paddleocr|180ms|bottleneck/i.test(label)) {
        return 'I would reduce OCR calls by running detection/ROI gating first, crop only text regions that changed or matter for state transitions, and cache stable HUD values across frames. If PaddleOCR remains the bottleneck, I would tune image preprocessing and batch/async the OCR stage while keeping the 2fps event pipeline deterministic.';
      }
      if (/shadow mode|97% accuracy|missing one specific event|specific event/i.test(label)) {
        return 'I would isolate the missed event by replaying false negatives with ROI crops, confidence scores, and state-machine context, then decide whether the issue is labels, ROI calibration, model class confusion, or post-processing thresholds. The fix should be proven by another append-only shadow-mode run against the same reference recording.';
      }
      return 'Available to start immediately. I would begin by confirming the first workflow and acceptance criteria, then deliver a small working slice with clear testing notes and handoff documentation.';
    };
    let questionIndex = 0;
    for (const ta of textareas) {
      if (ta === coverTa) continue;
      if ((ta.value || '').trim().length < 10) {
        setVal(ta, answerFor(ta, questionIndex));
        out.questions += 1;
      }
      questionIndex += 1;
    }
    const inputs = [...document.querySelectorAll('input')].filter(i => i.offsetParent !== null && !/hidden|checkbox|radio|file/i.test(i.type || ''));
    const defaultFixed = document.querySelector('input[name="milestoneMode"][value="default"]');
    if (defaultFixed && !defaultFixed.checked) defaultFixed.click();
    const rateInputs = inputs.filter(i => {
      const label = [i.name, i.id, i.placeholder, i.getAttribute('aria-label'), i.closest('label,div')?.innerText].filter(Boolean).join(' ');
      return /rate|amount|bid|price|hourly|weekly|earn|charge|milestone-amount|\\$0\\.00/i.test(label)
        && !/connects|boost/i.test(label);
    });
    for (const input of rateInputs) {
      if (${safeNumber} && (!(input.value || '').trim() || /^\\$?0(?:\\.00)?$/.test(input.value.trim()))) {
        setVal(input, ${safeNumber});
      }
      if ((input.value || '').trim() && !/^\\$?0(?:\\.00)?$/.test(input.value.trim())) out.rate = true;
    }
    for (const sel of [...document.querySelectorAll('select')].filter(s => s.offsetParent !== null)) {
      const label = [sel.name, sel.id, sel.getAttribute('aria-label'), sel.closest('label,div')?.innerText].filter(Boolean).join(' ');
      if (/duration|timeline|time|project length/i.test(label) || sel.options.length > 1) {
        const opts = [...sel.options].filter(o => o.value && !/select|choose/i.test(o.textContent));
        const picked = opts.find(o => /less than 1 month|1 to 3 months|1-3|one to three|less than/i.test(o.textContent)) || opts[0];
        if (picked) {
          sel.value = picked.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          out.duration = true;
        }
      }
    }
    for (const group of [...document.querySelectorAll('[role="radiogroup"],fieldset')]) {
      if (!group.querySelector('input[type="radio"]:checked')) {
        const radio = group.querySelector('input[type="radio"]');
        if (radio) {
          radio.click();
        }
      }
    }
    const required = [...document.querySelectorAll('textarea[required],input[required],select[required]')].filter(e => e.offsetParent !== null);
    out.requiredEmpty = required.filter(e => !String(e.value || '').trim()).map(e => [e.tagName, e.name, e.id, e.placeholder].filter(Boolean).join(':')).slice(0, 10);
    out.page = (document.body?.innerText || '').slice(0, 700);
    return JSON.stringify(out);
  })()`));
}

async function fillRequiredComboboxes(cdp) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const combos = JSON.parse(await cdp.evaluate(`(() => {
      return JSON.stringify([...document.querySelectorAll('[role="combobox"]')]
        .filter(e => e.offsetParent !== null && /^Select\\s+/i.test((e.innerText || '').trim()))
        .map(e => {
          const r = e.getBoundingClientRect();
          return { text: (e.innerText || '').trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }));
    })()`));
    if (!combos.length) return;
    for (let i = 0; i < combos.length; i += 1) {
      await cdp.evaluate(`(() => {
        const combos = [...document.querySelectorAll('[role="combobox"]')]
          .filter(e => e.offsetParent !== null && /^Select\\s+/i.test((e.innerText || '').trim()));
        const combo = combos[${i}];
        if (!combo) return 'no combo';
        combo.scrollIntoView({ block: 'center' });
        combo.click();
        return 'opened: ' + (combo.innerText || '').trim();
      })()`);
      await sleep(600);
      const picked = await cdp.evaluate(`(() => {
        const options = [...document.querySelectorAll('[role="option"], .air3-menu-item')]
          .filter(e => e.offsetParent !== null);
        const option = options.find(e => /1\\s*to\\s*3\\s*months|1-3|less than 1 month/i.test(e.innerText || ''))
          || options.find(e => !/select|choose/i.test(e.innerText || ''));
        if (!option) return 'no visible option';
        ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(type => {
          option.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        });
        return 'clicked option: ' + (option.innerText || '').trim();
      })()`);
      if (/no visible option/i.test(String(picked))) {
        await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 });
        await sleep(100);
        await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      }
      await sleep(350);
    }
  }
}

async function preSubmitCheck(cdp) {
  return JSON.parse(await cdp.evaluate(`(() => {
    const text = document.body?.innerText || '';
    const submitBtn = [...document.querySelectorAll('button')].find(b =>
      /send proposal|submit proposal|send for\\s+\\d+\\s+connects/i.test((b.textContent || '').trim())
      && b.offsetParent !== null
      && !/buy|purchase|cancel|back|upgrade/i.test(b.textContent || '')
    );
    const requiredEmpty = [...document.querySelectorAll('textarea[required],input[required],select[required]')]
      .filter(e => e.offsetParent !== null && !String(e.value || '').trim()).length;
    const durationMissing = [...document.querySelectorAll('[role="combobox"]')]
      .some(e => e.offsetParent !== null && /select\\s+a\\s+duration/i.test(e.innerText || ''));
    return JSON.stringify({
      buyConnects: /buy connects|purchase connects|insufficient connects/i.test(text),
      submitFound: !!submitBtn,
      disabled: submitBtn ? !!submitBtn.disabled : true,
      btnText: submitBtn?.textContent?.trim() || '',
      requiredEmpty: requiredEmpty + (durationMissing ? 1 : 0),
      text: text.slice(0, 1000)
    });
  })()`));
}

async function handleFixedPriceNotice(cdp) {
  for (let i = 0; i < 8; i += 1) {
    const raw = await cdp.evaluate(`(() => {
      const modal = [...document.querySelectorAll('[role="dialog"], .air3-modal, [class*="modal"]')]
        .find(e => e.offsetParent !== null && /3 things you need to know|Yes, I understand|Fixed-price projects/i.test(e.innerText || ''));
      if (!modal) return JSON.stringify({ found: false });
      const checkbox = modal.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
        setter.call(checkbox, true);
        checkbox.dispatchEvent(new Event('input', { bubbles: true }));
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = [...modal.querySelectorAll('button')].find(b =>
        /continue/i.test((b.textContent || '').trim()) && b.offsetParent !== null && !b.disabled
      );
      const btnRect = btn ? btn.getBoundingClientRect() : null;
      return JSON.stringify({
        found: true,
        button: btnRect ? { x: btnRect.left + btnRect.width / 2, y: btnRect.top + btnRect.height / 2 } : null
      });
    })()`);
    const result = JSON.parse(raw || "{}");
    if (result.found) {
      for (const point of [result.button].filter(Boolean)) {
        await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none" });
        await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await sleep(400);
      }
      await sleep(6500);
      return result.button ? "modal continued" : "modal found";
    }
    await sleep(1000);
  }
  return "no modal";
}

async function clickSubmit(cdp) {
  return await cdp.evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b =>
      /send proposal|submit proposal|send for\\s+\\d+\\s+connects/i.test((b.textContent || '').trim())
      && b.offsetParent !== null && !b.disabled
      && !/buy|purchase|cancel|back|upgrade/i.test(b.textContent || '')
    );
    if (!btn) return 'submit button not found';
    btn.click();
    return 'clicked ' + btn.textContent.trim();
  })()`);
}

async function taskApplyJobs() {
  const tracker = read("docs/proposal-tracker.md");
  const rows = parseTableRows(tracker);
  const drafts = parseDrafts(read("docs/proposal-drafts.md"));
  const processable = rows.filter((r) => /^Pre-filled\b/.test(r.status) || r.status === "Ready to submit").slice(0, 10);
  const cdp = await getCdp();
  await checkLogin(cdp);
  let submitted = 0;
  const maxSubmissions = Number(process.env.MAX_SUBMISSIONS || 10);
  const updates = new Map();
  const results = [];
  for (const row of processable) {
    const draft = drafts.get(jobId(row.url));
    const proposal = {
      title: row.title,
      url: row.url,
      cover: draft?.cover || "",
      rate: draft?.rate || row.rate,
      wasPrefilled: row.status === "Pre-filled",
    };
    await cdp.navigate(row.url, 4500);
    let text = String(await cdp.evaluate("document.body.innerText.slice(0, 2500)") || "");
    if (!proposal.cover) proposal.cover = coverFromPage(row.title, text);
    if (/Log In|Sign Up/i.test(text)) throw new Error("Session expired during Task 2");
    if (/no longer available|this job is closed|no longer accepting/i.test(text)) {
      updates.set(jobId(row.url), { status: "Job closed", notes: "Upwork displayed job closed/no longer accepting. No submit action taken." });
      results.push({ title: row.title, status: "Job closed" });
      continue;
    }
    const apply = await clickApplyIfNeeded(cdp);
    await sleep(4500);
    for (let i = 0; i < 20; i += 1) {
      const loadingCheck = String(await cdp.evaluate("(document.body?.innerText || '').slice(0, 1200)") || "");
      if (!/\\bLoading\\b/i.test(loadingCheck) && /cover letter|send proposal|submit proposal|send for\\s+\\d+\\s+connects/i.test(loadingCheck)) break;
      await sleep(1000);
    }
    text = String(await cdp.evaluate("document.body.innerText.slice(0, 2500)") || "");
    if (/buy connects|purchase connects/i.test(text)) {
      updates.set(jobId(row.url), { status: "Needs Connects", notes: "Upwork displayed Buy/Purchase Connects; automation did not click purchase." });
      results.push({ title: row.title, status: "Needs Connects" });
      continue;
    }
    if (/no apply button/i.test(apply) && !/cover letter|send proposal|submit proposal/i.test(text)) {
      updates.set(jobId(row.url), { status: "No apply button", notes: "No safe Apply/Submit Proposal button found. No submit action taken." });
      results.push({ title: row.title, status: "No apply button" });
      continue;
    }
    const filled = await fillProposalForm(cdp, proposal);
    await fillRequiredComboboxes(cdp);
    await sleep(1200);
    const check = await preSubmitCheck(cdp);
    if (check.buyConnects) {
      updates.set(jobId(row.url), { status: "Needs Connects", notes: "Upwork displayed Buy/Purchase Connects; automation did not click purchase." });
      results.push({ title: row.title, status: "Needs Connects" });
      continue;
    }
    if (!check.submitFound || check.disabled || check.requiredEmpty > 0 || !filled.cover) {
      updates.set(jobId(row.url), {
        status: "Pre-filled",
        notes: `Form not safely submittable: submitFound=${check.submitFound}, disabled=${check.disabled}, requiredEmpty=${check.requiredEmpty}, cover=${filled.cover}.`,
      });
      results.push({ title: row.title, status: "Pre-filled", check, filled });
      continue;
    }
    const clicked = await clickSubmit(cdp);
    await sleep(2500);
    await handleFixedPriceNotice(cdp);
    await sleep(3500);
    const post = JSON.parse(await cdp.evaluate(`(() => {
      const text = (document.body && document.body.innerText || '').slice(0, 1800);
      return JSON.stringify({
        success: /proposal sent|proposal submitted|submitted successfully|successfully submitted|your proposal was submitted|thank you/i.test(text),
        needsConnects: /buy connects|purchase connects|insufficient connects/i.test(text),
        error: /error|failed|problem|try again/i.test(text),
        text: text.slice(0, 500)
      });
    })()`));
    if (post.success) {
      submitted += 1;
      updates.set(jobId(row.url), { status: "Submitted", notes: `Submitted via Raw CDP on ${TODAY}; ${clicked}.` });
      results.push({ title: row.title, status: "Submitted" });
    } else if (post.needsConnects) {
      updates.set(jobId(row.url), { status: "Needs Connects", notes: "Upwork asked to buy/purchase Connects after submit attempt; purchase not clicked." });
      results.push({ title: row.title, status: "Needs Connects" });
    } else {
      updates.set(jobId(row.url), { status: "Submit failed", notes: `Submit click did not verify success. Snippet: ${post.text.replace(/\s+/g, " ").slice(0, 180)}` });
      results.push({ title: row.title, status: "Submit failed" });
    }
    if (submitted >= maxSubmissions) break;
    const wait = 8000 + Math.floor(Math.random() * 7000);
    await sleep(wait);
  }
  updateTrackerRows(updates);
  cdp.close();
  return { total: processable.length, prefilled: processable.filter((r) => r.status === "Pre-filled").length, submitted, results };
}

async function taskMonitorBids() {
  const tracker = read("docs/proposal-tracker.md");
  const rows = parseTableRows(tracker).filter((r) => /Submitted|Viewed|Interviewing|Hired \(other\)/i.test(r.status));
  const cdp = await getCdp();
  await checkLogin(cdp);
  await cdp.navigate("https://www.upwork.com/nx/proposals/", 5000);
  const pageData = JSON.parse(await cdp.evaluate(`(() => {
    const text = document.body?.innerText || '';
    const items = [...document.querySelectorAll('[data-test="proposal-tile"], .up-card-section, article')].slice(0, 30).map(item => ({
      text: item.innerText.slice(0, 500),
      hasInterview: /interview/i.test(item.innerText),
      isViewed: /viewed/i.test(item.innerText),
      isArchived: /archived|declined|withdrawn/i.test(item.innerText)
    }));
    return JSON.stringify({ text: text.slice(0, 1000), items });
  })()`));
  const checked = [];
  const updates = new Map();
  for (const row of rows) {
    await cdp.navigate(row.url, 3500);
    const data = JSON.parse(await cdp.evaluate(`(() => {
      const text = document.body?.innerText || '';
      const activityStart = text.search(/Activity on this job/i);
      const clientStart = text.search(/About the client/i);
      const activity = activityStart >= 0 ? text.slice(activityStart, clientStart > activityStart ? clientStart : activityStart + 1600) : text;
      const proposalCount = (activity.match(/Proposals:\\s*(Less than 5|\\d+\\s+to\\s+\\d+|50\\+)/i) || [])[1]
        || (activity.match(/(Less than 5|\\d+\\s+to\\s+\\d+|50\\+)\\s+proposals/i) || [])[1]
        || 'unknown';
      const lastViewed = (activity.match(/Last viewed by client:\\s*([^\\n]+)/i) || [])[1]?.trim() || '';
      const interviewing = (activity.match(/Interviewing:\\s*(\\d+)/i) || [])[1] || '0';
      const invites = (activity.match(/Invites sent:\\s*(\\d+)/i) || [])[1] || '0';
      const hires = (activity.match(/Hires:\\s*(\\d+)/i) || [])[1]
        || (activity.match(/(\\d+)\\s+hire/i) || [])[1]
        || '0';
      return JSON.stringify({
        isClosed: /this job is closed|no longer accepting|no longer available/i.test(text.slice(0, 3500)),
        proposalCount,
        hires,
        interviewing,
        invites,
        isHiring: Number(interviewing) > 0 || Number(hires) > 0,
        clientActivity: lastViewed ? 'Last viewed by client: ' + lastViewed : 'unknown'
      });
    })()`));
    checked.push({ ...row, ...data });
    const activeNote = `Checked ${TODAY} via Raw CDP. Still submitted; proposals ${data.proposalCount}; ${data.clientActivity}; ${data.interviewing} interviewing, ${data.invites} invites.`;
    if (data.isClosed) {
      updates.set(jobId(row.url), { status: "Job Closed", notes: `Checked ${TODAY} via Raw CDP. Job closed/no longer accepting; proposals ${data.proposalCount}.` });
    } else if (Number(data.hires) > 0) {
      updates.set(jobId(row.url), { status: "Hired (other)", notes: `Checked ${TODAY} via Raw CDP. Job shows Hires: ${data.hires}; proposals ${data.proposalCount}; ${data.clientActivity}. Treat as likely lost unless client reopens.` });
    } else if (/viewed by client: (?:\d+\s+hour|today|yesterday)/i.test(data.clientActivity)) {
      updates.set(jobId(row.url), { status: `Submitted (${data.proposalCount} proposals, client active)`, notes: activeNote });
    } else {
      updates.set(jobId(row.url), { status: `Submitted (${data.proposalCount} proposals)`, notes: activeNote });
    }
    await sleep(900);
  }
  updateTrackerRows(updates);
  const active = checked.filter((j) => !j.isClosed && Number(j.hires) === 0);
  const closed = checked.filter((j) => j.isClosed || Number(j.hires) > 0);
  const interviews = pageData.items.filter((i) => i.hasInterview).length;
  const report = [
    `# Bid Monitoring Report - ${TODAY}`,
    "",
    `## Active Proposals: ${active.length}`,
    `## Interviews: ${interviews}`,
    `## Closed/Lost: ${closed.length}`,
    "",
    "## Upwork Proposal Page Check",
    "",
    "- Raw CDP check completed at https://www.upwork.com/nx/proposals/.",
    `- Submitted proposals checked from tracker: ${rows.length}`,
    `- Proposal tiles visible on page: ${pageData.items.length}`,
    "- No submit, withdraw, purchase, or messaging actions were clicked.",
    "",
    "### Needs Attention",
    "",
    "| Job | Status | Change | Recommended Action |",
    "|-----|--------|--------|--------------------|",
  ];
  const attention = checked.filter((j) => j.isClosed || /50\+/.test(j.proposalCount) || /unknown/i.test(j.clientActivity) === false);
  if (!attention.length) report.push("| None | No urgent bid changes detected | No action | Continue monitoring |");
  for (const j of attention) report.push(`| ${j.title.replace(/\|/g, "/")} | ${j.isClosed || Number(j.hires) > 0 ? "Closed/Lost" : "Active"} | ${j.proposalCount}; ${j.clientActivity} | ${j.isClosed || Number(j.hires) > 0 ? "No action unless client reopens/messages" : "Monitor for reply"} |`);
  report.push("", "### Still Active", "", "| Job | Proposals Now | Client Activity |", "|-----|---------------|-----------------|");
  if (!active.length) report.push("| None | N/A | No active submitted proposals detected |");
  for (const j of active) report.push(`| ${j.title.replace(/\|/g, "/")} | ${j.proposalCount} | ${j.clientActivity} |`);
  report.push("", "### Closed/Archived", "", "| Job | Outcome | Notes |", "|-----|---------|-------|");
  if (!closed.length) report.push("| None | N/A | No closed submitted proposal detected |");
  for (const j of closed) report.push(`| ${j.title.replace(/\|/g, "/")} | ${Number(j.hires) > 0 ? `Hired (${j.hires})` : "Job closed"} | ${j.proposalCount}; ${j.clientActivity} |`);
  const recentlyViewed = active.filter((j) => /Last viewed by client: (?:\d+\s+hours? ago|today)/i.test(j.clientActivity));
  report.push("", "## Recommended Actions", "", interviews ? "- Interview/invitation detected on proposals page: user should review Upwork manually." : "- No interviews detected by the proposal page selectors.");
  if (recentlyViewed.length) report.push(`- Monitor recently viewed proposals today: ${recentlyViewed.map((j) => j.title).join("; ")}.`);
  if (closed.length) report.push(`- Treat closed/lost entries as low priority unless the client reopens or messages: ${closed.map((j) => j.title).join("; ")}.`);
  report.push("- Do not send follow-up messages unless a client starts a thread or explicitly asks for more information.");
  write("docs/bid-report.md", `${report.join("\n")}\n`);
  cdp.close();
  return { active: active.length, interviews, closed: closed.length };
}

async function taskClientComms() {
  const cdp = await getCdp();
  await checkLogin(cdp);
  await cdp.navigate("https://www.upwork.com/messages/", 6000);
  const messages = JSON.parse(await cdp.evaluate(`(() => {
    const threads = [...document.querySelectorAll('[data-test="message-thread"], .thread-list-item, [class*="thread"]')].slice(0, 20);
    return JSON.stringify(threads.map((t, index) => ({
      index,
      text: t.innerText.slice(0, 300),
      isUnread: t.classList.contains('unread') || !!t.querySelector('.unread,.badge,[data-test="unread"]') || /unread/i.test(t.className)
    })));
  })()`));
  const unread = messages.filter((m) => m.isUnread);
  const drafts = [];
  for (const thread of unread.slice(0, 5)) {
    await cdp.evaluate(`(() => {
      const threads = [...document.querySelectorAll('[data-test="message-thread"], .thread-list-item, [class*="thread"]')];
      threads[${thread.index}]?.click();
      return true;
    })()`);
    await sleep(3000);
    const detail = JSON.parse(await cdp.evaluate(`(() => {
      const msgs = [...document.querySelectorAll('[data-test="message"], .msg-body, [class*="message-body"], [class*="composer"]')].map(m => m.innerText.slice(0, 1000)).filter(Boolean);
      const jobLink = document.querySelector('a[href*="/jobs/"]');
      return JSON.stringify({ url: location.href, jobTitle: jobLink?.textContent?.trim() || 'unknown', messages: msgs.slice(-10) });
    })()`));
    const last = detail.messages.at(-1) || thread.text;
    drafts.push({
      title: detail.jobTitle,
      url: detail.url,
      said: last.replace(/\s+/g, " ").slice(0, 180),
      reply: "Thanks for reaching out. I can help with this. To make sure I scope it correctly, could you share the current code/API access details and the first workflow you want delivered? Once I have that, I can suggest a focused first milestone and timeline.",
      priority: /interview|offer|availability|contract/i.test(last) ? "P0 immediate" : "P1 today",
    });
  }
  await cdp.navigate("https://www.upwork.com/ab/notifications/", 3500);
  const notifications = JSON.parse(await cdp.evaluate(`(() => {
    const lines = (document.body?.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
    const jobs = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i] === 'Jobs' && /^New job:/i.test(lines[i + 1] || '')) {
        jobs.push({ text: lines[i + 1] + ' (' + (lines[i + 2] || 'time unknown') + ')', isNew: false });
      }
    }
    const items = [...document.querySelectorAll('[data-test="notification-item"], .notification, [class*="notif"]')]
      .map(n => ({ text: n.innerText.replace(/\\s+/g, ' ').trim(), isNew: n.classList.contains('unread') || !!n.querySelector('.unread,.badge') }))
      .filter(n => n.text && !/^See all notifications$/i.test(n.text));
    return JSON.stringify((jobs.length ? jobs : items).slice(0, 15));
  })()`));
  const doc = [
    `# Pending Messages - ${TODAY}`,
    "",
    "## Summary",
    "",
    `- Unread message threads: ${unread.length}`,
    `- Client conversations detected: ${messages.length}`,
    `- Notifications checked: ${notifications.length} visible items`,
    `- Draft replies written: ${drafts.length}`,
    "",
    "## Priority Breakdown",
    "",
    `- P0 immediate: ${drafts.filter((d) => d.priority.startsWith("P0")).length}`,
    `- P1 today: ${drafts.filter((d) => d.priority.startsWith("P1")).length}`,
    `- P2 later: ${notifications.filter((n) => /^New job:/i.test(n.text)).length}`,
    "",
    "## Notification Notes",
    "",
    "| Type | Summary | Action Needed |",
    "|------|---------|---------------|",
  ];
  if (!notifications.length) doc.push("| None | No visible notifications detected | No reply needed |");
  for (const n of notifications.slice(0, 10)) doc.push(`| ${/interview|offer|contract/i.test(n.text) ? "High priority" : /^New job:/i.test(n.text) ? "Jobs" : "Notification"} | ${n.text.replace(/[\u2013\u2014]/g, "-").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, 140)} | ${/^New job:/i.test(n.text) ? "Optional review in Task 1" : "Review manually if relevant"} |`);
  doc.push("", "## Pending Replies", "");
  if (!drafts.length) doc.push("No client messages, interview invitations, or contract offers were detected. No message was sent.");
  for (const [i, d] of drafts.entries()) {
    doc.push(`## Message ${i + 1}: ${d.title}`, `**Thread URL:** ${d.url}`, `**Type:** Client message`, `**Priority:** ${d.priority}`, `**Client said:** ${d.said}`, "", "### Draft Reply:", d.reply, "", "### Notes:", "User review and send manually on Upwork.", "", "---", "");
  }
  write("docs/messages.md", `${doc.join("\n")}\n`);
  cdp.close();
  return { unread: unread.length, notifications: notifications.length, drafts: drafts.length };
}

const mode = process.argv[2] || "all";
const summary = {};
if (mode === "find" || mode === "all") summary.find = await taskFindJobs();
if (mode === "apply" || mode === "all") summary.apply = await taskApplyJobs();
if (mode === "monitor" || mode === "all") summary.monitor = await taskMonitorBids();
if (mode === "comms" || mode === "all") summary.comms = await taskClientComms();
console.log(JSON.stringify(summary, null, 2));
