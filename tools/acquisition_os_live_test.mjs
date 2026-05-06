import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = process.cwd();
const CDP_HTTP = "http://127.0.0.1:9222";
const RUN_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const RUN_STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_ID = `run-${RUN_DATE}-acquisition-os-live-test-${RUN_STAMP}`;
const SESSION_FILE = `sessions/${RUN_DATE}-acquisition-os-live-test-${RUN_STAMP}.md`;
const SOURCE_SESSION = SESSION_FILE;
const MODE = "delegated_submit_run";

const SEARCH_URLS = [
  ["best-matches", "https://www.upwork.com/nx/find-work/best-matches"],
  ["fastapi-python-backend", "https://www.upwork.com/nx/search/jobs/?q=FastAPI%20Python%20backend&sort=recency"],
  ["openai-api-integration", "https://www.upwork.com/nx/search/jobs/?q=OpenAI%20API%20integration&sort=recency"],
  ["ai-chatbot-development", "https://www.upwork.com/nx/search/jobs/?q=AI%20chatbot%20development&sort=recency"],
];

const actions = [];
const blockers = [];
const warnings = [];
const submittedPackageIds = [];
let cdp;
let runStartedAt = now();

function now() {
  return new Date().toISOString();
}

function abs(rel) {
  return path.join(ROOT, rel);
}

function ensureDir(rel) {
  fs.mkdirSync(abs(rel), { recursive: true });
}

function readText(rel) {
  const file = abs(rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function baseCommit() {
  const head = readText(".git/HEAD").trim();
  const ref = (head.match(/^ref:\s+(.+)$/) || [])[1];
  return ref ? readText(`.git/${ref}`).trim() || head : head || "unknown";
}

function writeText(rel, text) {
  ensureDir(path.dirname(rel));
  fs.writeFileSync(abs(rel), text, "utf8");
}

function appendLine(rel, obj) {
  ensureDir(path.dirname(rel));
  fs.appendFileSync(abs(rel), `${JSON.stringify(obj)}\n`, "utf8");
}

function readJsonl(rel) {
  return readText(rel)
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function writeJsonl(rel, rows) {
  const text = rows.map((row) => JSON.stringify(row)).join("\n");
  writeText(rel, text ? `${text}\n` : "");
}

function upsertJsonl(rel, rows, key = "id") {
  const existing = fs.existsSync(abs(rel)) ? readJsonl(rel) : [];
  const map = new Map(existing.map((row) => [row[key], row]));
  for (const row of rows) map.set(row[key], row);
  writeJsonl(rel, [...map.values()]);
}

function sanitizeText(text, max = 700) {
  return String(text || "")
    .replace(/Cloudflare Ray ID:[^\n]+/gi, "Cloudflare Ray ID: [redacted]")
    .replace(/Your IP:[^\n]+/gi, "Your IP: [redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function slug(text) {
  return String(text || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

function jobIdFromUrl(url) {
  return (String(url).match(/~0?(\d{12,})/) || [])[1] || slug(url);
}

function applyUrl(jobUrl) {
  const id = jobIdFromUrl(jobUrl);
  return `https://www.upwork.com/nx/proposals/job/~${id}/apply/`;
}

function parseMoney(text) {
  const raw = String(text || "").replace(/,/g, "");
  const match = raw.match(/\$\s*(\d+(?:\.\d+)?)([kKmM])?/);
  if (!match) return null;
  let amount = Number(match[1]);
  if (match[2]?.toLowerCase() === "k") amount *= 1000;
  if (match[2]?.toLowerCase() === "m") amount *= 1000000;
  return amount;
}

function parseConnects(text) {
  const matches = [...String(text || "").matchAll(/(\d{1,3})\s+Connects/gi)].map((m) => Number(m[1]));
  return matches.find((n) => n > 0 && n < 100) ?? null;
}

function parseConnectsBalance(text) {
  const patterns = [
    /Available\s+Connects[:\s]+(\d{1,5})/i,
    /Connects\s+available[:\s]+(\d{1,5})/i,
    /You\s+have\s+(\d{1,5})\s+Connects/i,
  ];
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function uniqueBy(rows, keyFn) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyFn(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

  send(method, params = {}) {
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
    return value.value ?? value.description ?? null;
  }

  async navigate(url, waitMs = 4500) {
    this.events.length = 0;
    await this.send("Page.navigate", { url });
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (this.events.some((e) => ["Page.loadEventFired", "Page.frameStoppedLoading"].includes(e.method))) break;
      await sleep(250);
    }
    await sleep(waitMs);
    for (let i = 0; i < 25; i++) {
      const title = String(await this.evaluate("document.title") || "");
      if (!/moment|challenge|checking|just a moment/i.test(title)) return;
      await sleep(1000);
    }
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // no-op
    }
  }
}

async function ensureCdp() {
  try {
    const version = await fetch(`${CDP_HTTP}/json/version`);
    if (version.ok) {
      actions.push("reused Chrome CDP at 127.0.0.1:9222");
      return;
    }
  } catch {
    // launch below
  }

  const chrome = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ].find((file) => fs.existsSync(file));
  if (!chrome) throw new Error("Chrome executable not found");

  const profile = path.join(process.env.LOCALAPPDATA || "", "Chrome-CDP-Profile");
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(chrome, [
    "--remote-debugging-port=9222",
    `--user-data-dir=${profile}`,
    "--remote-allow-origins=*",
    "--no-first-run",
    "--no-default-browser-check",
    "https://www.upwork.com",
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const version = await fetch(`${CDP_HTTP}/json/version`);
      if (version.ok) {
        actions.push("started Chrome CDP at 127.0.0.1:9222");
        return;
      }
    } catch {
      // retry
    }
  }
  throw new Error("Chrome CDP did not start");
}

async function connectCdp() {
  const tabs = await (await fetch(`${CDP_HTTP}/json`)).json();
  let tab = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl && /upwork/i.test(t.url || ""));
  tab ||= tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!tab) {
    const created = await fetch(`${CDP_HTTP}/json/new?about:blank`, { method: "PUT" });
    tab = await created.json();
  }
  const session = new CDP(tab.webSocketDebuggerUrl);
  await session.connect();
  return session;
}

async function pageState() {
  const raw = await cdp.evaluate(`JSON.stringify({
    url: location.href,
    title: document.title,
    text: (document.body && document.body.innerText || '').slice(0, 2500),
    hasLogin: /Log In|Sign Up/i.test(document.body && document.body.innerText || ''),
    hasCaptcha: /captcha|verify you are human|security check|unusual activity|just a moment|Cloudflare Ray ID/i.test(document.body && document.body.innerText || '')
  })`);
  const state = JSON.parse(raw || "{}");
  state.text = sanitizeText(state.text, 2500);
  return state;
}

function classifyBlocker(state) {
  if (state.hasLogin) return "login page or session expired";
  if (state.hasCaptcha || /Cloudflare|Just a moment/i.test(`${state.title} ${state.text}`)) return "Cloudflare or verification interstitial";
  if (/This job is no longer available|no longer accepting/i.test(state.text)) return "job closed or no longer accepting";
  return null;
}

async function checkLoginAndNotifications() {
  await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches", 6000);
  const state = await pageState();
  const blocker = classifyBlocker(state);
  if (blocker) throw new Error(`STOP login check: ${blocker}`);
  const raw = await cdp.evaluate(`JSON.stringify({
    messages: document.querySelector('[data-test="messages-count"]')?.textContent?.trim() || '0',
    notifications: document.querySelector('[data-test="notifications-count"]')?.textContent?.trim() || '0'
  })`);
  const counts = JSON.parse(raw || "{}");
  actions.push(`checked Upwork login; messages=${counts.messages || "0"} notifications=${counts.notifications || "0"}`);
  return counts;
}

async function extractJobCards(source) {
  const raw = await cdp.evaluate(`JSON.stringify((() => {
    const nodes = Array.from(document.querySelectorAll('article, section, li, div[data-test], div.air3-card, div[class*="job"]'));
    const rows = [];
    for (const el of nodes) {
      const text = (el.innerText || '').trim().replace(/\\s+/g, ' ');
      if (!text || text.length < 80) continue;
      if (!/Posted|Proposals:|Fixed-price|Hourly/i.test(text)) continue;
      const links = Array.from(el.querySelectorAll('a[href*="/jobs/"]'));
      const link = links.find(a => /~0?\\d{12,}/.test(a.href));
      if (!link) continue;
      rows.push({
        href: link.href,
        linkText: (link.textContent || '').trim().replace(/\\s+/g, ' '),
        text: text.slice(0, 1800)
      });
    }
    return rows;
  })())`);
  const cards = JSON.parse(raw || "[]");
  return uniqueBy(cards, (row) => jobIdFromUrl(row.href)).map((row) => cardToOpportunity(row, source));
}

function cardToOpportunity(row, source) {
  const text = sanitizeText(row.text, 1600);
  const cleanTitle = sanitizeTitle(row.linkText || text.split(" Posted ")[0]);
  return {
    id: `opp-${jobIdFromUrl(row.href)}`,
    source,
    job_url: row.href.split("?")[0],
    title: cleanTitle,
    category: inferCategory(`${cleanTitle} ${text}`),
    budget_type: inferBudgetType(text),
    budget: parseBudget(text),
    posted_at_text: parsePosted(text),
    proposal_count_text: parseProposalCount(text),
    client_country: "",
    client_spend_text: (text.match(/\$[\d.,]+[KkMm]?\+?\s+spent/i) || [])[0] || "",
    payment_verified: /payment verified/i.test(text),
    description_excerpt: text,
    skills: inferSkills(`${cleanTitle} ${text}`),
    fit_score: 0,
    client_quality_score: 0,
    competition_score: 0,
    scope_clarity_score: 0,
    risk_score: 0,
    connects_cost: parseConnects(text),
    expected_value_band: "unknown",
    recommended_action: "draft_only",
    decision_reason: "Collected from visible Upwork card; not scored yet.",
    created_at: now(),
  };
}

function sanitizeTitle(title) {
  return sanitizeText(String(title || "Untitled job")
    .replace(/Job feedback.+$/i, "")
    .replace(/Save job.+$/i, ""), 180) || "Untitled job";
}

function parseBudget(text) {
  const normalized = String(text || "");
  const fixed = normalized.match(/Est\.\s*Budget:\s*(\$[\d.,]+(?:\s*-\s*\$[\d.,]+)?|\$[\d.,]+[KkMm]?)/i)
    || normalized.match(/Budget:\s*(\$[\d.,]+(?:\s*-\s*\$[\d.,]+)?|\$[\d.,]+[KkMm]?)/i);
  if (fixed) return fixed[1].trim();
  const hourlyRange = normalized.match(/Hourly:?\s*(\$[\d.,]+\s*-\s*\$[\d.,]+)/i);
  if (hourlyRange) return hourlyRange[1].replace(/\s+/g, "");
  const hourly = normalized.match(/\$[\d.,]+\s*-\s*\$[\d.,]+\/hr|\$[\d.,]+\/hr/i);
  if (hourly) return hourly[0];
  const amount = normalized.match(/\$\s*[\d.,]+[KkMm]?/);
  return amount ? amount[0] : null;
}

function inferBudgetType(text) {
  const normalized = String(text || "");
  if (/Hourly:?\s*\$|Hourly\s+-|\$[\d.,]+\s*-\s*\$[\d.,]+\/hr|\$[\d.,]+\/hr/i.test(normalized)) return "hourly";
  if (/fixed[-\s]?price|Est\.\s*Budget|Est\.\s*budget|Fixed price/i.test(normalized)) return "fixed";
  if (/hourly/i.test(normalized)) return "hourly";
  return "fixed";
}

function parsePosted(text) {
  return (String(text || "").match(/Posted\s+((?:\d+\s+(?:minutes?|hours?|days?)\s+ago)|yesterday|just now)/i) || [])[1]?.trim() || "unknown";
}

function parseProposalCount(text) {
  return (String(text || "").match(/Proposals:\s*(Less than 5|5 to 10|10 to 15|15 to 20|20 to 50|50\+)/i) || [])[1] || "unknown";
}

function inferSkills(text) {
  const skills = [];
  const pairs = [
    ["FastAPI", /fastapi/i],
    ["Python", /\bpython\b/i],
    ["OpenAI API", /openai/i],
    ["LLM", /\bllm|large language model/i],
    ["RAG", /\brag\b|retrieval/i],
    ["Chatbot", /chatbot|chat bot/i],
    ["API", /\bapi\b/i],
    ["Automation", /automation|workflow/i],
    ["CRM", /\bcrm\b/i],
    ["Dashboard", /dashboard/i],
  ];
  for (const [name, pattern] of pairs) if (pattern.test(text)) skills.push(name);
  return skills;
}

function inferCategory(text) {
  if (/crm/i.test(text)) return "crm-ai-automation";
  if (/rag|chatbot|chat bot/i.test(text)) return "rag-chatbot";
  if (/dashboard|internal tool/i.test(text)) return "ai-ops-dashboard";
  if (/mvp|founder|product slice/i.test(text)) return "mvp-product-slice";
  return "fastapi-llm-backend";
}

async function enrichOpportunity(opp) {
  await cdp.navigate(opp.job_url, 5500);
  const state = await pageState();
  const blocker = classifyBlocker(state);
  if (blocker) {
    warnings.push(`${opp.id}: detail page blocked by ${blocker}`);
    return opp;
  }
  const text = state.text;
  return {
    ...opp,
    title: sanitizeTitle(opp.title === "Untitled job" ? state.title : opp.title),
    budget: opp.budget || parseBudget(text),
    budget_type: inferBudgetType(text),
    proposal_count_text: opp.proposal_count_text !== "unknown"
      ? opp.proposal_count_text
      : parseProposalCount(text),
    client_spend_text: opp.client_spend_text || (text.match(/\$[\d.,]+[KkMm]?\+?\s+spent/i) || [])[0] || "",
    payment_verified: opp.payment_verified || /payment verified/i.test(text),
    description_excerpt: sanitizeText(text, 700),
    skills: inferSkills(`${opp.title} ${text}`),
    connects_cost: opp.connects_cost ?? parseConnects(text),
  };
}

async function collectOpportunities() {
  const collected = [];
  for (const [source, url] of SEARCH_URLS) {
    await cdp.navigate(url, 6500);
    const state = await pageState();
    const blocker = classifyBlocker(state);
    if (blocker) {
      blockers.push(`${source}: ${blocker}`);
      actions.push(`stopped source ${source}: ${blocker}`);
      continue;
    }
    const cards = await extractJobCards(source);
    actions.push(`collected ${cards.length} candidate cards from ${source}`);
    collected.push(...cards);
  }

  const deduped = uniqueBy(collected, (opp) => opp.id).slice(0, 8);
  const enriched = [];
  for (const opp of deduped) enriched.push(await enrichOpportunity(opp));
  return enriched;
}

function scoreOpportunity(opp) {
  const text = `${opp.title} ${opp.description_excerpt} ${opp.skills.join(" ")}`;
  const budgetAmount = parseMoney(`${opp.budget || ""} ${opp.description_excerpt}`);
  const proposalText = String(opp.proposal_count_text || "").toLowerCase();
  const offPlatform = /telegram|whatsapp|skype|outside upwork|off-platform|email me/i.test(text);
  const freeTest = /free test|unpaid test|trial task for free/i.test(text);
  const lowBudget = opp.budget_type === "fixed" && budgetAmount !== null && budgetAmount < 100;
  const veryLowBudget = opp.budget_type === "fixed" && budgetAmount !== null && budgetAmount < 50;
  const highCompetition = /50\+|20 to 50/.test(proposalText);

  const fit = Math.min(10, 3 + (/\bpython\b|fastapi/i.test(text) ? 3 : 0) + (/openai|llm|rag|chatbot|automation|api/i.test(text) ? 3 : 0) + (opp.skills.length ? 1 : 0));
  const client = Math.min(10, (opp.payment_verified ? 4 : 0) + (parseMoney(opp.client_spend_text) ? 4 : 0) + (/united states|canada|australia|united kingdom|germany/i.test(opp.client_country) ? 1 : 0) + (!highCompetition ? 1 : 0));
  const competition = /less than 5/.test(proposalText) ? 9 : /5 to 10/.test(proposalText) ? 8 : /10 to 15/.test(proposalText) ? 6 : highCompetition ? 2 : 5;
  const clarity = Math.min(10, 3 + (opp.description_excerpt.length > 350 ? 2 : 0) + (/deliver|build|integrat|api|endpoint|database|workflow|requirements/i.test(text) ? 3 : 0) + (/first milestone|mvp|prototype|acceptance|scope/i.test(text) ? 2 : 0));
  let risk = 2;
  if (lowBudget) risk += 3;
  if (veryLowBudget) risk += 2;
  if (highCompetition) risk += 3;
  if (offPlatform) risk += 5;
  if (freeTest) risk += 5;
  if (!opp.payment_verified) risk += 1;
  if (!opp.connects_cost) risk += 1;
  risk = Math.min(10, risk);

  const expected = fit >= 8 && client >= 6 && competition >= 6 && clarity >= 6 && risk <= 4 ? "high" : fit >= 6 && risk <= 6 ? "medium" : "low";
  let action = "draft_only";
  let reason = "Does not meet submit threshold.";
  if (offPlatform || freeTest || veryLowBudget) {
    action = "skip";
    reason = offPlatform ? "Off-platform communication risk." : freeTest ? "Free-test risk." : "Budget is below the minimum practical threshold.";
  } else if (expected === "high" && opp.connects_cost !== null) {
    action = "submit_authorized";
    reason = "High fit, credible client signals, acceptable competition, clear enough scope, and observed Connects cost.";
  } else if (fit >= 6 && risk <= 6) {
    action = "prefill_only";
    reason = opp.connects_cost === null ? "Technical fit is acceptable, but Connects cost is not observed for submit." : "Fit is acceptable but submit threshold is not fully met.";
  }

  return {
    ...opp,
    fit_score: fit,
    client_quality_score: client,
    competition_score: competition,
    scope_clarity_score: clarity,
    risk_score: risk,
    expected_value_band: expected,
    recommended_action: action,
    decision_reason: reason,
  };
}

function buildPackage(opp) {
  const hourly = opp.budget_type === "hourly";
  const mode = opp.recommended_action === "submit_authorized" && hourly ? "submit_authorized" : opp.recommended_action === "skip" ? "draft_only" : "prefill_only";
  const maxConnects = opp.connects_cost ?? 0;
  return {
    id: `pkg-${jobIdFromUrl(opp.job_url)}`,
    opportunity_id: opp.id,
    job_url: opp.job_url,
    mode,
    max_authorized_connects: maxConnects,
    cover_letter: coverLetter(opp),
    rate_or_bid: hourly ? "$35/hr" : "manual fixed-price review required",
    pricing_rationale: hourly
      ? "Uses the current profile base rate for serious Python, FastAPI, AI, and API work."
      : "Fixed-price amount is not auto-submitted; a bounded milestone needs manual review first.",
    showcase_pack_id: inferCategory(`${opp.title} ${opp.description_excerpt}`),
    screening_answers: [],
    risk_notes: `Scores: fit ${opp.fit_score}, client ${opp.client_quality_score}, competition ${opp.competition_score}, clarity ${opp.scope_clarity_score}, risk ${opp.risk_score}. ${opp.decision_reason}`,
    stop_conditions: [
      "unknown required fields",
      "Buy Connects wall",
      "payment or purchase button",
      "boost requirement",
      "off-platform contact request",
      "free test work",
      `connects cost above ${maxConnects}`,
    ],
    created_at: now(),
  };
}

function coverLetter(opp) {
  const pack = inferCategory(`${opp.title} ${opp.description_excerpt}`);
  const angle = pack === "rag-chatbot"
    ? "I can separate ingestion, retrieval, and API behavior so the chatbot is testable from the first milestone."
    : pack === "crm-ai-automation"
      ? "I can build one controlled workflow first, keeping human review where it matters."
      : "I can ship a focused Python/FastAPI implementation with typed inputs, clear endpoints, and practical test coverage.";
  return [
    "Hi,",
    "",
    `This looks close to the kind of ${opp.skills.includes("FastAPI") ? "FastAPI/Python" : "AI automation"} work I focus on. ${angle}`,
    "",
    "For a first milestone, I would keep the scope narrow: confirm the inputs, build the core workflow/API path, add basic validation, and leave you with something reviewable instead of a broad unfinished build.",
    "",
    "A few details I would confirm before starting: the exact first workflow, any existing API/database constraints, and what output would count as accepted for the first delivery.",
    "",
    "Best,",
  ].join("\n");
}

async function inspectAndMaybeSubmit(pkg) {
  const observation = {
    id: `form-${pkg.id}-${RUN_STAMP}`,
    proposal_package_id: pkg.id,
    job_url: pkg.job_url,
    form_type: "unknown",
    connects_cost: null,
    required_fields: [],
    optional_fields: [],
    unknown_required_fields: [],
    warnings: [],
    filled_fields: [],
    safe_to_submit: false,
    blockers: [],
    observed_at: now(),
    source_session: SOURCE_SESSION,
  };

  await cdp.navigate(applyUrl(pkg.job_url), 6500);
  const state = await pageState();
  const blocker = classifyBlocker(state);
  if (blocker) observation.blockers.push(blocker);
  const text = state.text;
  observation.connects_cost = parseConnects(text);
  const balance = parseConnectsBalance(text);
  observation.form_type = /hourly/i.test(text) || /#step-rate/i.test(text) ? "hourly" : /fixed/i.test(text) ? "fixed_price" : "unknown";

  const rawBefore = await cdp.evaluate(`JSON.stringify((() => {
    const controls = Array.from(document.querySelectorAll('textarea, input, select')).map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        index,
        tag: el.tagName,
        type: el.getAttribute('type') || '',
        id: el.id || '',
        name: el.getAttribute('name') || '',
        required: !!el.required || el.getAttribute('aria-required') === 'true',
        visible: rect.width > 0 && rect.height > 0,
        value: el.value || '',
        label: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').slice(0, 120)
      };
    });
    const buttons = Array.from(document.querySelectorAll('button')).map((button, index) => ({
      index,
      text: (button.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
      disabled: button.disabled,
      visible: button.getBoundingClientRect().width > 0 && button.getBoundingClientRect().height > 0
    }));
    return { controls, buttons };
  })())`);
  const before = JSON.parse(rawBefore || "{}");
  const visibleControls = (before.controls || []).filter((control) => control.visible && control.type !== "hidden");
  const textareas = visibleControls.filter((control) => control.tag === "TEXTAREA");
  observation.required_fields = visibleControls.filter((control) => control.required).map((control) => control.label || control.name || control.id || `${control.tag}-${control.index}`);
  observation.optional_fields = visibleControls.filter((control) => !control.required).map((control) => control.label || control.name || control.id || `${control.tag}-${control.index}`);

  if (pkg.mode !== "submit_authorized") observation.blockers.push(`mode is ${pkg.mode}`);
  if (observation.connects_cost === null) observation.blockers.push("Connects cost missing");
  if (observation.connects_cost !== null && observation.connects_cost > pkg.max_authorized_connects) observation.blockers.push("Connects cost exceeds authorization");
  if (balance !== null && observation.connects_cost !== null && observation.connects_cost > balance) observation.blockers.push("Connects cost exceeds observed balance");
  if (/buy connects|purchase connects/i.test(text)) observation.blockers.push("Buy Connects wall");
  if ((before.buttons || []).some((button) => button.visible && /buy|purchase/i.test(button.text))) observation.blockers.push("payment or purchase button");
  if (/boost your proposal|boosted proposal|bid for boosted/i.test(text)) observation.warnings.push("Boost UI observed; boost not used");
  if (/payment|purchase/i.test(text) && /button/i.test(text)) observation.warnings.push("Payment or purchase wording observed");
  if (/outside upwork|off-platform|telegram|whatsapp|skype/i.test(text)) observation.blockers.push("off-platform communication risk");
  if (/free test|unpaid test|trial task for free/i.test(text)) observation.blockers.push("free test work risk");
  if (pkg.rate_or_bid.includes("manual fixed-price")) observation.blockers.push("fixed-price bid requires manual review");

  const coverFilled = await fillFirstTextarea(pkg.cover_letter);
  if (coverFilled) observation.filled_fields.push("cover_letter");

  const hourlyFilled = await fillHourlyRate(pkg.rate_or_bid);
  if (hourlyFilled) observation.filled_fields.push("hourly_rate");

  const requiredTextareasAfterCover = textareas.slice(1);
  for (const control of requiredTextareasAfterCover) {
    observation.unknown_required_fields.push(control.label || control.name || control.id || `textarea-${control.index}`);
  }

  const unfilledRequired = visibleControls.filter((control) => {
    if (!control.required) return false;
    if (control.tag === "TEXTAREA" && control.index === textareas[0]?.index && coverFilled) return false;
    if ((control.id === "step-rate" || control.name === "step-rate") && hourlyFilled) return false;
    return !control.value;
  });
  for (const control of unfilledRequired) {
    const label = control.label || control.name || control.id || `${control.tag}-${control.index}`;
    if (!observation.unknown_required_fields.includes(label)) observation.unknown_required_fields.push(label);
  }

  if (observation.unknown_required_fields.length) observation.blockers.push("unknown required fields");

  const submitInfo = await getSubmitInfo();
  if (!submitInfo.hasSubmitButton) observation.blockers.push("submit button not found");
  if (submitInfo.submitDisabled) observation.blockers.push("submit button disabled");
  observation.safe_to_submit = observation.blockers.length === 0 && submitInfo.hasSubmitButton && !submitInfo.submitDisabled;

  if (observation.safe_to_submit) {
    const clickResult = await clickSubmit();
    actions.push(`${pkg.id}: clicked submit button`);
    await sleep(5000);
    const after = await pageState();
    if (/proposal sent|proposal submitted|submitted a proposal|successfully submitted|your proposal was submitted/i.test(after.text)) {
      submittedPackageIds.push(pkg.id);
      actions.push(`${pkg.id}: submit verified`);
      appendLine("data/connects-ledger.jsonl", {
        id: `connects-${pkg.id}-${RUN_STAMP}`,
        date: RUN_DATE,
        event_type: "spend",
        opportunity_id: pkg.opportunity_id,
        proposal_package_id: pkg.id,
        connects_delta: -observation.connects_cost,
        connects_balance_observed: balance,
        reason: "Submitted by delegated Acquisition OS live test after all gates passed.",
        source_session: SOURCE_SESSION,
        created_at: now(),
      });
      appendLine("data/outcomes.jsonl", {
        id: `outcome-${pkg.id}-${RUN_STAMP}`,
        proposal_package_id: pkg.id,
        event_type: "submitted",
        status: "submitted",
        observed_at: now(),
        source_session: SOURCE_SESSION,
      });
    } else if (/yes, i understand|confirm|are you sure|submit proposal/i.test(after.text)) {
      observation.blockers.push("post-click confirmation required; not clicked");
      observation.safe_to_submit = false;
      warnings.push(`${pkg.id}: ${clickResult}; confirmation or non-terminal state observed`);
    } else {
      observation.blockers.push("submit click did not verify success");
      observation.safe_to_submit = false;
      warnings.push(`${pkg.id}: ${clickResult}; success text not observed`);
    }
  }

  return observation;
}

async function fillFirstTextarea(value) {
  const result = await cdp.evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('textarea')).find((item) => {
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !item.disabled;
    });
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  })()`);
  return !!result;
}

async function fillHourlyRate(rateText) {
  const rate = Number((String(rateText).match(/(\d+(?:\.\d+)?)/) || [])[1] || 35);
  const result = await cdp.evaluate(`(() => {
    const el = document.querySelector('#step-rate') || Array.from(document.querySelectorAll('input')).find((item) => {
      const label = [item.id, item.name, item.getAttribute('aria-label'), item.placeholder].join(' ');
      return /rate|hourly/i.test(label) && item.getBoundingClientRect().width > 0 && !item.disabled;
    });
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(String(rate))});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  })()`);
  return !!result;
}

async function getSubmitInfo() {
  const raw = await cdp.evaluate(`JSON.stringify((() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((button) => {
      const text = (button.textContent || '').trim();
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /send proposal|submit proposal|submit/i.test(text) && !/buy|purchase|boost/i.test(text);
    });
    const button = buttons[0];
    return { hasSubmitButton: !!button, submitDisabled: button ? button.disabled : true, text: button ? button.textContent.trim() : '' };
  })())`);
  return JSON.parse(raw || "{}");
}

async function clickSubmit() {
  return await cdp.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => {
      const text = (item.textContent || '').trim();
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /send proposal|submit proposal|submit/i.test(text) && !/buy|purchase|boost/i.test(text) && !item.disabled;
    });
    if (!button) return 'submit button not found';
    button.click();
    return 'clicked ' + button.textContent.trim();
  })()`);
}

async function monitorOutcomes(packages) {
  const checks = [];
  const pages = [
    ["proposals", "https://www.upwork.com/nx/proposals/"],
    ["messages", "https://www.upwork.com/ab/messages/rooms/"],
    ["notifications", "https://www.upwork.com/ab/notifications/"],
  ];
  for (const [name, url] of pages) {
    await cdp.navigate(url, 4500);
    const state = await pageState();
    const blocker = classifyBlocker(state);
    checks.push(`${name}:${blocker || "ok"}`);
  }
  appendLine("data/outcomes.jsonl", {
    id: `outcome-monitor-${RUN_STAMP}`,
    proposal_package_id: submittedPackageIds[0] || "",
    event_type: "monitor",
    status: submittedPackageIds.length ? `submitted packages: ${submittedPackageIds.join(", ")}` : "no submitted packages",
    observed_at: now(),
    source_session: SOURCE_SESSION,
  });
  actions.push(`monitor checks: ${checks.join("; ")}`);
  return packages.length;
}

function writeSession({ opportunities, packages, observations }) {
  const submitted = submittedPackageIds.length ? submittedPackageIds.join(", ") : "none";
  const blockerText = blockers.length ? blockers.map((item) => `- ${item}`).join("\n") : "- none";
  const warningText = warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "- none";
  const obsRows = observations.map((obs) => `| ${obs.proposal_package_id} | ${obs.job_url} | ${obs.connects_cost ?? ""} | ${obs.required_fields.join("; ")} | ${obs.unknown_required_fields.join("; ")} | ${[...obs.warnings, ...obs.blockers].join("; ")} | ${obs.safe_to_submit} |`).join("\n");
  const text = `# Execution Session Log

## Identity

- Task file: tools/acquisition_os_live_test.mjs
- Session file: ${SESSION_FILE}
- Executor: Codex CDP-EXECUTOR
- Base commit: ${baseCommit()}
- Result commit: none
- Start time: ${runStartedAt}
- End time: ${now()}

## Runtime Status

- CDP status: Raw CDP at 127.0.0.1:9222
- Upwork login status: checked before collection
- Input proposal package IDs: ${observations.map((obs) => obs.proposal_package_id).join(", ") || "none"}

## Connects

- Connects observed: recorded per form observation when visible
- Connects spent: ${observations.filter((obs) => submittedPackageIds.includes(obs.proposal_package_id)).reduce((sum, obs) => sum + (obs.connects_cost || 0), 0)}

## Form Observations

| Proposal Package ID | Job URL | Connects Cost | Required Fields | Unknown Required Fields | Warnings | Safe To Submit |
|---|---|---:|---|---|---|---|
${obsRows}

## Actions Taken

${actions.map((item) => `- ${item}`).join("\n")}

## Submit Status

- Mode: ${MODE}
- Submit attempted: ${submittedPackageIds.length ? "yes" : "no"}
- Submit result: ${submitted}

## Blockers

${blockerText}

## Warnings

${warningText}

## Evidence Paths

- ${SESSION_FILE}
- data/jobs.jsonl
- data/proposal-packages.jsonl
- data/form-observations.jsonl
- data/runs.jsonl

## Risk Judgment

- Submitted only package-specific authorizations that passed gates.
- No Buy Connects, boost, client message, screenshot, cookie, credential, IP, or Cloudflare Ray ID was saved.

## Next Action For Manager

- Review blockers and package scores before the next delegated submit run.

## Files Changed

- data/jobs.jsonl
- data/proposal-packages.jsonl
- data/form-observations.jsonl
- data/outcomes.jsonl
- data/runs.jsonl
- ${SESSION_FILE}
`;
  writeText(SESSION_FILE, text);
}

function writeAuditPatchIfNeeded(observations) {
  if (submittedPackageIds.length) return;
  const reason = blockers.find((item) => /Cloudflare|login/i.test(item))
    || observations.flatMap((obs) => obs.blockers).find(Boolean)
    || "no high-quality opportunity passed submit gates";
  appendLine("data/policy-patches.jsonl", {
    id: `patch-${RUN_STAMP}`,
    source_session: SOURCE_SESSION,
    patch_type: "blocked-run-classification",
    finding: reason,
    recommendation: "Keep the submit gates unchanged; rerun collection only when CDP pages return real job content and a package has observed Connects cost.",
    created_at: now(),
  });
}

async function main() {
  if (!fs.existsSync(abs("AGENTS.md"))) throw new Error("Run from repository root");
  ensureDir("data");
  ensureDir("sessions");
  for (const rel of ["data/jobs.jsonl", "data/proposal-packages.jsonl", "data/connects-ledger.jsonl", "data/form-observations.jsonl", "data/outcomes.jsonl", "data/policy-patches.jsonl", "data/runs.jsonl"]) {
    if (!fs.existsSync(abs(rel))) writeText(rel, "");
  }

  await ensureCdp();
  cdp = await connectCdp();
  await checkLoginAndNotifications();

  actions.push("planned delegated submit run with available-balance cap and no Buy Connects");
  const collected = await collectOpportunities();
  if (!collected.length) blockers.push("no opportunities collected from live pages");
  const scored = collected.map(scoreOpportunity);
  writeJsonl("data/jobs.jsonl", scored);
  actions.push(`scored ${scored.length} opportunities`);

  const packageInputs = scored
    .filter((opp) => opp.recommended_action !== "skip")
    .sort((a, b) => (b.fit_score + b.client_quality_score + b.competition_score - b.risk_score) - (a.fit_score + a.client_quality_score + a.competition_score - a.risk_score))
    .slice(0, 5);
  const packages = packageInputs.map(buildPackage);
  writeJsonl("data/proposal-packages.jsonl", packages);
  actions.push(`built ${packages.length} proposal packages`);

  const executable = packages.filter((pkg) => pkg.mode === "submit_authorized");
  if (!executable.length) blockers.push("no package met submit_authorized threshold");
  const executionTargets = executable.length ? executable : packages.filter((pkg) => pkg.mode === "prefill_only").slice(0, 2);
  if (executionTargets.length && !executable.length) actions.push(`observing ${executionTargets.length} prefill_only packages to cover execute-stage gates`);
  const observations = [];
  for (const pkg of executionTargets) {
    const obs = await inspectAndMaybeSubmit(pkg);
    observations.push(obs);
    appendLine("data/form-observations.jsonl", obs);
  }

  await monitorOutcomes(packages);
  writeAuditPatchIfNeeded(observations);
  writeSession({ opportunities: scored, packages, observations });

  appendLine("data/runs.jsonl", {
    id: RUN_ID,
    task_file: "tools/acquisition_os_live_test.mjs",
    session_file: SESSION_FILE,
    mode: MODE,
    started_at: runStartedAt,
    ended_at: now(),
    input_ids: packages.map((pkg) => pkg.id),
    actions_taken: actions,
    files_changed: [
      "data/jobs.jsonl",
      "data/proposal-packages.jsonl",
      "data/form-observations.jsonl",
      "data/outcomes.jsonl",
      "data/policy-patches.jsonl",
      "data/runs.jsonl",
      SESSION_FILE,
    ],
    result: submittedPackageIds.length ? "submitted" : "blocked",
    blockers: blockers.length ? blockers : observations.flatMap((obs) => obs.blockers),
  });

  console.log(JSON.stringify({
    result: submittedPackageIds.length ? "submitted" : "blocked",
    opportunities: scored.length,
    packages: packages.length,
    executable: executable.length,
    submitted: submittedPackageIds,
    blockers,
    warnings,
    session: SESSION_FILE,
  }, null, 2));
}

main()
  .catch((error) => {
    blockers.push(error.message);
    try {
      writeSession({ opportunities: [], packages: [], observations: [] });
      appendLine("data/runs.jsonl", {
        id: RUN_ID,
        task_file: "tools/acquisition_os_live_test.mjs",
        session_file: SESSION_FILE,
        mode: MODE,
        started_at: runStartedAt,
        ended_at: now(),
        input_ids: [],
        actions_taken: actions,
        files_changed: ["data/runs.jsonl", SESSION_FILE],
        result: "error",
        blockers,
      });
    } catch {
      // no-op
    }
    console.error(error.stack || error.message);
    process.exit(1);
  })
  .finally(() => {
    if (cdp) cdp.close();
  });
