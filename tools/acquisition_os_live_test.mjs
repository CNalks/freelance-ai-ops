import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
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
const NO_SUBMIT = process.argv.includes("--no-submit") || process.env.NO_SUBMIT === "1";
const GIT_CLOSEOUT = process.argv.includes("--git-closeout") || process.env.GIT_CLOSEOUT === "1";
const MODE = NO_SUBMIT ? "delegated_submit_no_submit_smoke" : "delegated_submit_run";
const EXECUTION_CHANNEL = "raw_cdp_humanlike";
const POLICY_VERSION = "2026-05-10-autonomous-ops";
const ACTIVE_PLAN = loadActiveAutonomyPlan();
const AUTONOMY_LEVEL = NO_SUBMIT ? "L1" : ACTIVE_PLAN.autonomy_level;
const INSPECT_LIMIT = ACTIVE_PLAN.volume_limits.proposal_forms;
const MAX_SUBMISSIONS = ACTIVE_PLAN.volume_limits.proposal_submits;

const SEARCH_URLS = [
  ["best-matches", "https://www.upwork.com/nx/find-work/best-matches"],
  ["fastapi-python-backend", "https://www.upwork.com/nx/search/jobs/?q=FastAPI%20Python%20backend&sort=recency"],
  ["openai-api-integration", "https://www.upwork.com/nx/search/jobs/?q=OpenAI%20API%20integration&sort=recency"],
  ["ai-chatbot-development", "https://www.upwork.com/nx/search/jobs/?q=AI%20chatbot%20development&sort=recency"],
];

const actions = [];
const blockers = [];
const warnings = [];
const submitAttemptedPackageIds = [];
const submittedPackageIds = [];
let candidateCardsCollected = 0;
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

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed${output ? `: ${output}` : ""}`);
  }
  return String(result.stdout || "").trim();
}

function loadActiveAutonomyPlan() {
  const plans = readJsonl("data/autonomy-plans.jsonl");
  const activePlans = plans.filter((plan) => plan.status === "active");
  if (!activePlans.length) throw new Error("No active autonomy plan found in data/autonomy-plans.jsonl");

  const plan = activePlans.at(-1);
  if (plan.execution_channel !== EXECUTION_CHANNEL) {
    throw new Error(`Active autonomy plan requires ${plan.execution_channel}, not ${EXECUTION_CHANNEL}`);
  }
  if (Date.parse(plan.expires_at) <= Date.now()) {
    throw new Error(`Active autonomy plan expired at ${plan.expires_at}`);
  }

  return plan;
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

function budgetSnapshot(connectsBalanceObserved = null) {
  return {
    operating_mandate_id: ACTIVE_PLAN.id,
    daily_connects_cap: ACTIVE_PLAN.daily_connects_cap,
    weekly_connects_cap: ACTIVE_PLAN.weekly_connects_cap,
    reserve_floor: ACTIVE_PLAN.reserve_floor,
    connects_balance_observed: connectsBalanceObserved,
  };
}

function runOutputFiles() {
  return [
    "data/jobs.jsonl",
    "data/proposal-packages.jsonl",
    "data/connects-ledger.jsonl",
    "data/form-observations.jsonl",
    "data/outcomes.jsonl",
    "data/policy-patches.jsonl",
    "data/platform-actions.jsonl",
    "data/bid-tracker.jsonl",
    "data/runs.jsonl",
    SESSION_FILE,
  ];
}

function jobTokenFromUrl(url) {
  return (String(url).match(/~(0?\d{12,})/) || [])[1] || jobIdFromUrl(url);
}

function applyUrl(jobUrl) {
  const id = jobTokenFromUrl(jobUrl);
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

function parseMaxMoney(text) {
  const raw = String(text || "").replace(/,/g, "");
  const matches = [...raw.matchAll(/\$\s*(\d+(?:\.\d+)?)([kKmM])?/g)];
  if (!matches.length) return null;
  return Math.max(...matches.map((match) => {
    let amount = Number(match[1]);
    if (match[2]?.toLowerCase() === "k") amount *= 1000;
    if (match[2]?.toLowerCase() === "m") amount *= 1000000;
    return amount;
  }));
}

function parseConnects(text) {
  const matches = [...String(text || "").matchAll(/(\d{1,3})\s+Connects/gi)].map((m) => Number(m[1]));
  return matches.find((n) => n > 0 && n < 100) ?? null;
}

function parseConnectsBalance(text) {
  const remaining = String(text || "").match(/you\W*ll have\s+(\d{1,5})\s+Connects\s+remaining/i);
  if (remaining) {
    const cost = parseConnects(text) || 0;
    return Number(remaining[1]) + cost;
  }
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

function connectsSpendWindow() {
  const rows = fs.existsSync(abs("data/connects-ledger.jsonl")) ? readJsonl("data/connects-ledger.jsonl") : [];
  const runDateMs = Date.parse(`${RUN_DATE}T00:00:00Z`);
  const weekStartMs = runDateMs - (6 * 24 * 60 * 60 * 1000);
  let daily = 0;
  let weekly = 0;

  for (const row of rows) {
    if (row.event_type !== "spend" || row.connects_delta >= 0) continue;
    const spend = Math.abs(row.connects_delta);
    if (row.date === RUN_DATE) daily += spend;
    const rowDateMs = Date.parse(`${row.date}T00:00:00Z`);
    if (Number.isFinite(rowDateMs) && rowDateMs >= weekStartMs && rowDateMs <= runDateMs) {
      weekly += spend;
    }
  }

  return { daily, weekly };
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
  if (await isCdpReachable()) {
    actions.push("reused Chrome CDP at 127.0.0.1:9222");
    return;
  }

  actions.push("Chrome CDP not reachable at 127.0.0.1:9222; launching Chrome with remote debugging");
  const chrome = findChromeExecutable();
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
    if (await isCdpReachable()) {
      actions.push("started Chrome CDP at 127.0.0.1:9222");
      return;
    }
  }
  throw new Error("Chrome CDP did not start");
}

async function isCdpReachable() {
  try {
    const version = await fetch(`${CDP_HTTP}/json/version`, {
      signal: AbortSignal.timeout(2500),
    });
    return version.ok;
  } catch {
    return false;
  }
}

function findChromeExecutable() {
  const candidates = [
    path.join(process.env.PROGRAMFILES || "C:/Program Files", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] || "C:/Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  ];
  const where = spawnSync("where.exe", ["chrome"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (where.status === 0) {
    candidates.push(...String(where.stdout || "").split(/\r?\n/).filter(Boolean));
  }
  return [...new Set(candidates)].find((file) => file && fs.existsSync(file));
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

function fixedFirstMilestoneBid(opp) {
  if (opp.budget_type !== "fixed") return null;
  const budget = parseMaxMoney(`${opp.budget || ""} ${opp.description_excerpt || ""}`);
  if (budget === null || budget < 50) return null;
  const amount = budget < 500 ? Math.floor(budget) : budget < 1000 ? 300 : 500;
  return `$${amount} fixed first scope`;
}

function allowSmallFirstReviewRisk(opp, submitScore) {
  const budget = opp?.budget_type === "fixed" ? parseMaxMoney(`${opp.budget || ""} ${opp.description_excerpt || ""}`) : null;
  return budget !== null
    && budget >= 50
    && budget < 100
    && submitScore >= 28
    && opp.fit_score >= 8
    && opp.client_quality_score >= 8
    && opp.competition_score >= 6
    && opp.scope_clarity_score >= 7;
}

function isHourlyPackage(pkg) {
  return /\$[0-9.,]+\s*\/hr/i.test(pkg.rate_or_bid);
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
  for (const [source, url] of SEARCH_URLS.slice(0, ACTIVE_PLAN.volume_limits.search_sources)) {
    let state = null;
    let blocker = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await cdp.navigate(url, 6500);
      state = await pageState();
      blocker = classifyBlocker(state);
      if (!blocker || !/login|session/i.test(blocker) || attempt === 1) break;
      actions.push(`${source}: login/session blocker observed; warming up best-matches once`);
      await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches", 6500);
      const warmup = await pageState();
      const warmupBlocker = classifyBlocker(warmup);
      if (warmupBlocker) {
        actions.push(`${source}: warm-up blocked by ${warmupBlocker}`);
        break;
      }
    }
    if (blocker) {
      blockers.push(`${source}: ${blocker}`);
      actions.push(`stopped source ${source}: ${blocker}`);
      continue;
    }
    const cards = await extractJobCards(source);
    candidateCardsCollected += cards.length;
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
  risk = Math.min(10, risk);
  const submitScore = fit + client + competition + clarity - risk;

  const expected = fit >= 8 && client >= 6 && competition >= 6 && clarity >= 6 && risk <= 4 ? "high" : fit >= 6 && risk <= 6 ? "medium" : "low";
  let action = "draft_only";
  let reason = "Does not meet submit threshold.";
  if (offPlatform || freeTest || veryLowBudget) {
    action = "skip";
    reason = offPlatform ? "Off-platform communication risk." : freeTest ? "Free-test risk." : "Budget is below the minimum practical threshold.";
  } else if (fit >= 6 && risk <= 6) {
    action = "prefill_only";
    reason = expected === "high"
      ? "High-potential candidate; inspect apply form before submit authorization."
      : "Fit is acceptable; inspect apply form before any submit decision.";
  }

  return {
    ...opp,
    fit_score: fit,
    client_quality_score: client,
    competition_score: competition,
    scope_clarity_score: clarity,
    risk_score: risk,
    submit_score: submitScore,
    freshness_score: /hour|minute|today/i.test(opp.posted_at_text || "") ? 8 : /yesterday/i.test(opp.posted_at_text || "") ? 5 : 2,
    review_potential_score: client >= 6 && competition >= 6 ? 7 : 4,
    first_contract_probability: Math.max(0, Math.min(10, Math.round((fit + client + competition + clarity - risk) / 4))),
    portfolio_value_score: fit >= 8 ? 7 : 4,
    client_risk_markers: [
      ...(offPlatform ? ["off_platform_contact"] : []),
      ...(freeTest ? ["free_test_work"] : []),
      ...(budgetAmount !== null && budgetAmount < 500 ? ["low_fixed_budget"] : []),
    ],
    submit_candidate_reason: action === "prefill_only" ? reason : "",
    expected_value_band: expected,
    recommended_action: action,
    decision_reason: reason,
  };
}

function buildPackage(opp) {
  const hourly = opp.budget_type === "hourly";
  const fixedBid = fixedFirstMilestoneBid(opp);
  const mode = opp.recommended_action === "skip" ? "draft_only" : "prefill_only";
  const maxConnects = opp.connects_cost ?? 0;
  const fixedBudget = opp.budget_type === "fixed" ? parseMaxMoney(`${opp.budget || ""} ${opp.description_excerpt || ""}`) : null;
  const pricingRationale = hourly
    ? "Uses the current profile base rate for serious Python, FastAPI, AI, and API work."
    : fixedBid
      ? "Delegated fixed-price first paid scope amount; the cover letter states this is not a full-project bid."
      : fixedBudget !== null && fixedBudget < 50
        ? "Fixed-price budget is below the automatic submit floor; keep prefill_only."
        : "Fixed-price budget is unknown or unclear; keep prefill_only until the form provides enough pricing fields.";
  return {
    id: `pkg-${jobIdFromUrl(opp.job_url)}`,
    opportunity_id: opp.id,
    job_id: jobIdFromUrl(opp.job_url),
    job_url: opp.job_url,
    mode,
    max_authorized_connects: maxConnects,
    cover_letter: coverLetter(opp),
    rate_or_bid: hourly ? "$35/hr" : fixedBid || "fixed-price budget below auto-submit floor",
    pricing_rationale: pricingRationale,
    showcase_pack_id: inferCategory(`${opp.title} ${opp.description_excerpt}`),
    screening_answers: [],
    risk_notes: `Scores: fit ${opp.fit_score}, client ${opp.client_quality_score}, competition ${opp.competition_score}, clarity ${opp.scope_clarity_score}, risk ${opp.risk_score}, submit ${opp.submit_score}. ${opp.decision_reason}`,
    stop_conditions: [
      "unknown required fields",
      "Buy Connects wall",
      "payment or purchase button",
      "boost requirement",
      "off-platform contact request",
      "free test work",
      "connects cost above authorized package max",
    ],
    autonomy_level: AUTONOMY_LEVEL,
    execution_channel: EXECUTION_CHANNEL,
    operating_mandate_id: ACTIVE_PLAN.id,
    authorization_reason: mode === "prefill_only" ? "Selected for bounded Raw CDP form inspection." : "Draft only.",
    reserve_floor_after_spend: null,
    authorization_expires_at: `${RUN_DATE}T23:59:59Z`,
    platform_channel_required: EXECUTION_CHANNEL,
    product_offer_id: inferCategory(`${opp.title} ${opp.description_excerpt}`),
    asset_readiness: "ready",
    message_followup_policy: "Draft replies into message packages; send only with message_send_authorized.",
    created_at: now(),
  };
}

function coverLetter(opp) {
  const pack = inferCategory(`${opp.title} ${opp.description_excerpt}`);
  const fixedBid = fixedFirstMilestoneBid(opp);
  const angle = pack === "rag-chatbot"
    ? "I can separate ingestion, retrieval, and API behavior so the chatbot is testable from the first paid scope."
    : pack === "crm-ai-automation"
      ? "I can build one controlled workflow first, keeping human review where it matters."
      : "I can ship a focused Python/FastAPI implementation with typed inputs, clear endpoints, and practical test coverage.";
  return [
    "Hi,",
    "",
    `This looks close to the kind of ${opp.skills.includes("FastAPI") ? "FastAPI/Python" : "AI automation"} work I focus on. ${angle}`,
    "",
    "For a first paid scope, I would keep the work narrow: confirm the inputs, build the core workflow/API path, add basic validation, and leave you with something reviewable instead of a broad unfinished build.",
    "",
    ...(fixedBid ? [
      `My fixed-price bid is for this small first paid scope only (${fixedBid}), not the full project scope.`,
      "",
    ] : []),
    "A few details I would confirm before starting: the exact first workflow, any existing API/database constraints, and what output would count as accepted for the first delivery.",
    "",
    "Best,",
  ].join("\n");
}

async function inspectAndMaybeSubmit(pkg, { attemptSubmit = false } = {}) {
  const observation = {
    id: `form-${pkg.id}-${RUN_STAMP}`,
    proposal_package_id: pkg.id,
    job_url: pkg.job_url,
    form_type: "unknown",
    connects_cost: null,
    connects_balance_observed: null,
    required_fields: [],
    optional_fields: [],
    unknown_required_fields: [],
    warnings: [],
    submit_button_seen: false,
    boost_selected: false,
    purchase_ui_seen: false,
    qualification_warnings: [],
    validation_errors: [],
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
  observation.connects_balance_observed = balance;
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
        checked: !!el.checked,
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

  if (observation.connects_cost === null) observation.blockers.push("Connects cost missing");
  if (balance === null) observation.blockers.push("Connects balance missing");
  if (observation.connects_cost !== null && pkg.max_authorized_connects > 0 && observation.connects_cost > pkg.max_authorized_connects) observation.blockers.push("Connects cost exceeds authorization");
  if (balance !== null && observation.connects_cost !== null && observation.connects_cost > balance) observation.blockers.push("Connects cost exceeds observed balance");
  if (/buy connects|purchase connects/i.test(text)) observation.blockers.push("Buy Connects wall");
  observation.purchase_ui_seen = (before.buttons || []).some((button) => button.visible && /buy|purchase/i.test(button.text));
  if (observation.purchase_ui_seen) observation.blockers.push("payment or purchase button");
  observation.boost_selected = visibleControls.some((control) => control.checked && /boost|bid/i.test(`${control.label} ${control.name} ${control.id}`));
  if (observation.boost_selected) observation.blockers.push("boost requirement");
  if (/boost your proposal|boosted proposal|bid for boosted/i.test(text)) observation.warnings.push("Boost UI observed; boost not used");
  const boostFieldsCleared = await clearBoostInputs();
  if (boostFieldsCleared) observation.filled_fields.push("boost_connects_cleared");
  if (/payment|purchase/i.test(text) && /button/i.test(text)) observation.warnings.push("Payment or purchase wording observed");
  if (/qualification|does not meet/i.test(text)) observation.qualification_warnings.push("qualification wording observed");
  if (/outside upwork|off-platform|telegram|whatsapp|skype/i.test(text)) observation.blockers.push("off-platform communication risk");
  if (/free test|unpaid test|trial task for free/i.test(text)) observation.blockers.push("free test work risk");
  if (pkg.rate_or_bid.includes("fixed-price budget below")) observation.blockers.push("fixed-price budget below auto-submit floor");

  const coverFilled = await fillFirstTextarea(pkg.cover_letter);
  if (coverFilled) observation.filled_fields.push("cover_letter");

  const hourlyPackage = isHourlyPackage(pkg);
  const hourlyFilled = hourlyPackage ? await fillHourlyRate(pkg.rate_or_bid) : false;
  if (hourlyFilled) observation.filled_fields.push("hourly_rate");
  const fixedByProjectSelected = !hourlyPackage && !pkg.rate_or_bid.includes("fixed-price budget below")
    ? await selectFixedByProject()
    : false;
  if (fixedByProjectSelected) observation.filled_fields.push("fixed_by_project");

  const fixedFilled = !hourlyPackage && !pkg.rate_or_bid.includes("fixed-price budget below")
    ? await fillFixedBid(pkg.rate_or_bid)
    : false;
  if (fixedFilled) observation.filled_fields.push("fixed_first_milestone_bid");
  const fixedDescriptionFilled = !hourlyPackage && fixedFilled
    ? await fillFixedMilestoneDescription()
    : false;
  if (fixedDescriptionFilled) observation.filled_fields.push("fixed_milestone_description");
  const fixedDueDateFilled = !hourlyPackage && fixedFilled
    ? await fillFixedMilestoneDueDate()
    : false;
  if (fixedDueDateFilled) observation.filled_fields.push("fixed_milestone_due_date");

  const requiredTextareasAfterCover = textareas.slice(1).filter((control) => control.required);
  for (const control of requiredTextareasAfterCover) {
    observation.unknown_required_fields.push(control.label || control.name || control.id || `textarea-${control.index}`);
  }

  const unfilledRequired = visibleControls.filter((control) => {
    if (!control.required) return false;
    if (control.tag === "TEXTAREA" && control.index === textareas[0]?.index && coverFilled) return false;
    if ((control.id === "step-rate" || control.name === "step-rate") && hourlyFilled) return false;
    if (!hourlyPackage && fixedFilled && control.tag === "INPUT" && /amount|bid|price|budget|milestone|fixed/i.test(`${control.label} ${control.name} ${control.id}`)) return false;
    return !control.value;
  });
  for (const control of unfilledRequired) {
    const label = control.label || control.name || control.id || `${control.tag}-${control.index}`;
    if (!observation.unknown_required_fields.includes(label)) observation.unknown_required_fields.push(label);
  }

  if (observation.unknown_required_fields.length) observation.blockers.push("unknown required fields");

  const submitInfo = await getSubmitInfo();
  observation.submit_button_seen = submitInfo.hasSubmitButton;
  if (!submitInfo.hasSubmitButton) observation.blockers.push("submit button not found");
  if (submitInfo.submitDisabled) {
    observation.blockers.push("submit button disabled");
    observation.validation_errors.push("submit button disabled");
  }
  if (attemptSubmit && pkg.mode !== "submit_authorized") observation.blockers.push(`mode is ${pkg.mode}`);
  observation.safe_to_submit = observation.blockers.length === 0 && submitInfo.hasSubmitButton && !submitInfo.submitDisabled;

  if (attemptSubmit && observation.safe_to_submit) {
    const clickResult = await clickSubmit();
    submitAttemptedPackageIds.push(pkg.id);
    actions.push(`${pkg.id}: clicked submit button`);
    await sleep(5000);
    const after = await pageState();
    let finalState = after;
    if (!submitVerifiedText(after.text) && /yes,? i understand|confirm|are you sure|submit proposal/i.test(after.text)) {
      const confirmationResult = await clickSubmitConfirmation();
      if (confirmationResult) {
        actions.push(`${pkg.id}: ${confirmationResult}`);
        await sleep(5000);
        finalState = await pageState();
      }
    }
    if (submitVerifiedText(finalState.text)) {
      submittedPackageIds.push(pkg.id);
      actions.push(`${pkg.id}: submit verified`);
      appendLine("data/connects-ledger.jsonl", {
        id: `connects-${pkg.id}-${RUN_STAMP}`,
        date: RUN_DATE,
        event_type: "spend",
        budget_scope: "active_autonomy_plan",
        reserve_floor: ACTIVE_PLAN.reserve_floor,
        weekly_cap: ACTIVE_PLAN.weekly_connects_cap,
        daily_cap: ACTIVE_PLAN.daily_connects_cap,
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
    } else if (/yes,? i understand|confirm|are you sure|submit proposal/i.test(finalState.text)) {
      observation.blockers.push("post-click confirmation did not resolve");
      observation.safe_to_submit = false;
      observation.validation_errors.push(`post-submit text: ${sanitizeText(finalState.text, 1200)}`);
      observation.validation_errors.push(`post-submit controls: ${await visibleControlSummary()}`);
      observation.validation_errors.push(`post-submit ui: ${await visibleUiSummary()}`);
      warnings.push(`${pkg.id}: ${clickResult}; confirmation or non-terminal state observed`);
    } else {
      observation.blockers.push("submit click did not verify success");
      observation.safe_to_submit = false;
      observation.validation_errors.push(`post-submit text: ${sanitizeText(finalState.text, 1200)}`);
      observation.validation_errors.push(`post-submit controls: ${await visibleControlSummary()}`);
      observation.validation_errors.push(`post-submit ui: ${await visibleUiSummary()}`);
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

async function clearBoostInputs() {
  const result = await cdp.evaluate(`(() => {
    let changed = false;
    const controls = Array.from(document.querySelectorAll('input')).filter((item) => {
      const rect = item.getBoundingClientRect();
      const label = [item.id, item.name, item.getAttribute('aria-label'), item.placeholder].filter(Boolean).join(' ');
      const type = (item.getAttribute('type') || '').toLowerCase();
      return rect.width > 0
        && rect.height > 0
        && !item.disabled
        && ['number', 'text'].includes(type)
        && /connect|boost/i.test(label)
        && !/charged|earned|amount|fee|service|receive/i.test(label);
    });
    for (const el of controls) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '0');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      changed = true;
    }
    return changed;
  })()`);
  return !!result;
}

async function visibleControlSummary() {
  const raw = await cdp.evaluate(`JSON.stringify(Array.from(document.querySelectorAll('textarea, input, select')).map((el, index) => {
    const rect = el.getBoundingClientRect();
    const label = [el.id, el.name, el.getAttribute('aria-label'), el.placeholder].filter(Boolean).join(' ');
    return {
      index,
      tag: el.tagName,
      type: el.getAttribute('type') || '',
      label: label.slice(0, 80),
      value: (el.value || '').slice(0, 120),
      valid: typeof el.checkValidity === 'function' ? el.checkValidity() : true,
      validation: (el.validationMessage || '').slice(0, 120),
      checked: !!el.checked,
      visible: rect.width > 0 && rect.height > 0
    };
  }).filter((item) => item.visible).slice(0, 18))`);
  return sanitizeText(raw || "[]", 1200);
}

async function visibleUiSummary() {
  const raw = await cdp.evaluate(`JSON.stringify([
    ...Array.from(document.querySelectorAll('button')).map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        kind: 'button',
        index,
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 100),
        disabled: !!el.disabled,
        visible: rect.width > 0 && rect.height > 0
      };
    }),
    ...Array.from(document.querySelectorAll('[role="radio"], [role="checkbox"], [role="switch"]')).map((el, index) => {
      const rect = el.getBoundingClientRect();
      return {
        kind: el.getAttribute('role') || 'role',
        index,
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 100),
        checked: el.getAttribute('aria-checked') || '',
        visible: rect.width > 0 && rect.height > 0
      };
    })
  ].filter((item) => item.visible).slice(0, 28))`);
  return sanitizeText(raw || "[]", 1600);
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

async function selectFixedByProject() {
  const result = await cdp.evaluate(`(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((item) => /\\bby project\\b/i.test(item.textContent || ''));
    if (label) {
      label.scrollIntoView({ block: 'center', inline: 'center' });
      label.click();
      return true;
    }
    const controls = Array.from(document.querySelectorAll('input')).filter((item) => {
      const rect = item.getBoundingClientRect();
      const labelText = [item.id, item.name, item.value, item.getAttribute('aria-label')].join(' ');
      const type = (item.getAttribute('type') || '').toLowerCase();
      return rect.width > 0
        && rect.height > 0
        && !item.disabled
        && type === 'radio'
        && /project/i.test(labelText);
    });
    const control = controls[0];
    if (!control) return false;
    control.scrollIntoView({ block: 'center', inline: 'center' });
    control.click();
    return true;
  })()`);
  if (result) await sleep(500);
  return !!result;
}

async function fillFixedBid(rateText) {
  const amount = Number((String(rateText).match(/(\d+(?:\.\d+)?)/) || [])[1] || 0);
  if (!amount) return false;
  const result = await cdp.evaluate(`(() => {
    const candidates = Array.from(document.querySelectorAll('input')).filter((item) => {
      const rect = item.getBoundingClientRect();
      const label = [item.id, item.name, item.getAttribute('aria-label'), item.placeholder].join(' ');
      const type = (item.getAttribute('type') || '').toLowerCase();
      return rect.width > 0
        && rect.height > 0
        && !item.disabled
        && !['hidden', 'radio', 'checkbox', 'button', 'submit'].includes(type)
        && (/amount|bid|price|budget|fixed/i.test(label) || /\\$\\s*0(?:\\.00)?/.test(label))
        && !/fee|service|receive|connect/i.test(label);
    });
    const el = candidates[0];
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(String(amount))});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  })()`);
  return !!result;
}

async function fillFixedMilestoneDescription() {
  const value = "First milestone: confirm scope, implement the core workflow/API path, add basic validation, and provide handoff notes.";
  const result = await cdp.evaluate(`(() => {
    const value = ${JSON.stringify(value)};
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled;
    };
    const controls = Array.from(document.querySelectorAll('textarea, input')).filter((item) => {
      const label = [item.id, item.name, item.getAttribute('aria-label'), item.placeholder].join(' ');
      const type = (item.getAttribute('type') || '').toLowerCase();
      return visible(item)
        && !['hidden', 'radio', 'checkbox', 'button', 'submit'].includes(type)
        && /description|milestone/i.test(label)
        && !/cover|letter|connect|amount|price|budget|fee|service|receive/i.test(label);
    });
    const el = controls[0];
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  })()`);
  return !!result;
}

function fixedMilestoneDueDate() {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return {
    iso: `${yyyy}-${mm}-${dd}`,
    us: `${mm}/${dd}/${yyyy}`,
    day: String(date.getDate()),
  };
}

async function fillFixedMilestoneDueDate() {
  const target = fixedMilestoneDueDate();
  const direct = await cdp.evaluate(`(() => {
    const values = [${JSON.stringify(target.iso)}, ${JSON.stringify(target.us)}];
    const candidates = Array.from(document.querySelectorAll('input')).filter((item) => {
      const rect = item.getBoundingClientRect();
      const label = [item.id, item.name, item.getAttribute('aria-label'), item.placeholder].join(' ');
      const type = (item.getAttribute('type') || '').toLowerCase();
      return rect.width > 0
        && rect.height > 0
        && !item.disabled
        && !['hidden', 'radio', 'checkbox', 'button', 'submit'].includes(type)
        && /date|due|deadline/i.test(label);
    });
    for (const el of candidates) {
      const proto = window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      for (const value of values) {
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        if ((el.value || '').trim()) return true;
      }
    }
    return false;
  })()`);
  if (direct) return true;

  const opened = await cdp.evaluate(`(() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => {
      const text = (item.textContent || '').trim();
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /choose date|select date|due date/i.test(text) && !item.disabled;
    });
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;
  })()`);
  if (!opened) return false;
  await sleep(800);
  const selected = await cdp.evaluate(`(() => {
    const targetDay = ${JSON.stringify(target.day)};
    const buttons = Array.from(document.querySelectorAll('button')).filter((item) => {
      const text = (item.textContent || '').trim();
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && text === targetDay && !item.disabled;
    });
    const button = buttons[0];
    if (!button) return false;
    button.click();
    return true;
  })()`);
  return !!selected;
}

async function getSubmitInfo() {
  const raw = await cdp.evaluate(`JSON.stringify((() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter((button) => {
      const text = (button.textContent || '').trim();
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /send proposal|submit proposal|send for \\d+\\s+connects|submit/i.test(text) && !/buy|purchase|boost/i.test(text);
    });
    const button = buttons[0];
    return { hasSubmitButton: !!button, submitDisabled: button ? button.disabled : true, text: button ? button.textContent.trim() : '' };
  })())`);
  return JSON.parse(raw || "{}");
}

async function clickSubmit() {
  const raw = await cdp.evaluate(`JSON.stringify((() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => {
      const text = (item.textContent || '').trim();
      const rect = item.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && /send proposal|submit proposal|send for \\d+\\s+connects|submit/i.test(text) && !/buy|purchase|boost/i.test(text) && !item.disabled;
    });
    if (!button) return null;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    return {
      text: button.textContent.trim(),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  })())`);
  const button = JSON.parse(raw || "null");
  if (!button) return "submit button not found";
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: button.x, y: button.y });
  await sleep(100);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: button.x, y: button.y, button: "left", clickCount: 1 });
  await sleep(120);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: button.x, y: button.y, button: "left", clickCount: 1 });
  return `clicked ${button.text}`;
}

function submitVerifiedText(text) {
  return /proposal sent|proposal submitted|submitted a proposal|successfully submitted|your proposal was submitted|withdraw proposal|view proposal/i.test(String(text || ""));
}

async function clickSubmitConfirmation() {
  const raw = await cdp.evaluate(`JSON.stringify((() => {
    const body = document.body && document.body.innerText || '';
    if (!/yes,? i understand|confirm|are you sure|submit proposal/i.test(body)) return null;
    const button = Array.from(document.querySelectorAll('button')).find((item) => {
      const text = (item.textContent || '').trim();
      const rect = item.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && /yes,? i understand|confirm|submit proposal|send proposal/i.test(text)
        && !/buy|purchase|boost/i.test(text)
        && !item.disabled;
    });
    if (!button) return null;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = button.getBoundingClientRect();
    return {
      text: button.textContent.trim(),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  })())`);
  const button = JSON.parse(raw || "null");
  if (!button) return "";
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: button.x, y: button.y });
  await sleep(100);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: button.x, y: button.y, button: "left", clickCount: 1 });
  await sleep(120);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: button.x, y: button.y, button: "left", clickCount: 1 });
  return `clicked confirmation ${button.text}`;
}

function authorizeAfterInspection(packages, observations, opportunitiesById) {
  const observationsByPackage = new Map(observations.map((obs) => [obs.proposal_package_id, obs]));
  const priorSpend = connectsSpendWindow();
  let plannedSpend = 0;
  let authorizedCount = 0;

  for (const pkg of packages) {
    if (pkg.mode !== "prefill_only") continue;
    const observation = observationsByPackage.get(pkg.id);
    if (!observation) continue;
    const opportunity = opportunitiesById.get(pkg.opportunity_id);
    const gateBlockers = [...new Set(observation.blockers)];
    const submitScore = opportunity?.submit_score ?? null;

    if (!opportunity) gateBlockers.push("opportunity record missing");
    if (opportunity && opportunity.fit_score < 8) gateBlockers.push("fit below submit threshold");
    if (opportunity && opportunity.scope_clarity_score < 7) gateBlockers.push("scope clarity below submit threshold");
    if (opportunity && opportunity.client_quality_score < 5) gateBlockers.push("client quality below submit threshold");
    if (opportunity && opportunity.competition_score < 5) gateBlockers.push("competition below submit threshold");
    if (opportunity && opportunity.risk_score > 4 && !allowSmallFirstReviewRisk(opportunity, submitScore)) gateBlockers.push("risk score above submit threshold");
    if (submitScore !== null && submitScore < 28) gateBlockers.push("submit score below threshold");
    if (gateBlockers.length === 0 && authorizedCount >= MAX_SUBMISSIONS) {
      gateBlockers.push("submission limit reached");
    }
    if (gateBlockers.length === 0 && priorSpend.daily + plannedSpend + observation.connects_cost > ACTIVE_PLAN.daily_connects_cap) {
      gateBlockers.push("daily Connects cap would be exceeded");
    }
    if (gateBlockers.length === 0 && priorSpend.weekly + plannedSpend + observation.connects_cost > ACTIVE_PLAN.weekly_connects_cap) {
      gateBlockers.push("weekly Connects cap would be exceeded");
    }
    if (gateBlockers.length === 0 && plannedSpend + observation.connects_cost > observation.connects_balance_observed) {
      gateBlockers.push("planned Connects spend exceeds observed balance");
    }
    if (gateBlockers.length === 0 && ACTIVE_PLAN.reserve_floor > 0 && plannedSpend + observation.connects_cost > observation.connects_balance_observed - ACTIVE_PLAN.reserve_floor) {
      gateBlockers.push("planned Connects spend would breach reserve floor");
    }

    if (gateBlockers.length === 0) {
      if (NO_SUBMIT) {
        observation.safe_to_submit = false;
        observation.blockers.push("no-submit smoke did not promote submit authorization");
        actions.push(`${pkg.id}: no-submit smoke would promote after form inspect`);
        continue;
      }
      pkg.mode = "submit_authorized";
      pkg.max_authorized_connects = observation.connects_cost;
      plannedSpend += observation.connects_cost;
      authorizedCount += 1;
      pkg.reserve_floor_after_spend = observation.connects_balance_observed - plannedSpend;
      pkg.submission_gate_snapshot = {
        connects_cost_observed: observation.connects_cost,
        connects_balance_observed: observation.connects_balance_observed,
        unknown_required_fields: observation.unknown_required_fields,
        boost_selected: observation.boost_selected,
        purchase_ui_seen: observation.purchase_ui_seen,
        safe_to_submit: observation.safe_to_submit,
      };
      pkg.risk_notes = `${pkg.risk_notes} Inspect gates passed; this concrete package ID was upgraded under the user-authorized delegated submit run.`;
      actions.push(`${pkg.id}: promoted to submit_authorized after form inspect`);
    } else {
      pkg.risk_notes = `${pkg.risk_notes} Inspect blockers: ${gateBlockers.join("; ")}`;
      for (const blocker of gateBlockers) {
        if (!observation.blockers.includes(blocker)) observation.blockers.push(blocker);
      }
      observation.safe_to_submit = false;
    }
  }

  actions.push(`authorized ${authorizedCount} packages after inspect; planned Connects spend ${plannedSpend}`);
  return { authorizedCount, plannedSpend };
}

function latestObservationByPackage(observations) {
  const map = new Map();
  for (const observation of observations) map.set(observation.proposal_package_id, observation);
  return map;
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}

function connectsSpent(observations) {
  const latest = latestObservationByPackage(observations);
  return submittedPackageIds.reduce((sum, packageId) => {
    const observation = latest.get(packageId);
    return sum + (observation?.connects_cost || 0);
  }, 0);
}

function observedConnectsBalance(observations) {
  const balances = observations
    .map((observation) => observation.connects_balance_observed)
    .filter((balance) => Number.isInteger(balance));
  return balances.length ? balances.at(-1) : null;
}

function packageState(pkg, observation) {
  if (submittedPackageIds.includes(pkg.id)) return "submitted";
  const text = (observation?.blockers || []).join("; ");
  if (/submit click did not verify|post-click confirmation did not resolve/i.test(text)) return "error";
  if (pkg.mode === "submit_authorized") return "submit_authorized";
  if (/manual review|unknown required fields|confirmation required|qualification/i.test(text)) return "manual_review_required";
  return "tracked_not_submitted";
}

function classifyRunResult({ packages, observations }) {
  if (submittedPackageIds.length) return "submitted";
  const allBlockers = uniqueStrings([...blockers, ...observations.flatMap((obs) => obs.blockers)]);
  const text = allBlockers.join("; ");
  if (/Cloudflare|login page|session expired|job closed|no longer accepting|submit button|submit click did not verify|payment or purchase|boost requirement|off-platform|free test/i.test(text)) {
    return "platform_blocked";
  }
  if (/Connects cost exceeds observed balance|planned Connects spend|daily Connects cap|weekly Connects cap|reserve floor|Buy Connects wall/i.test(text)) {
    return "connects_insufficient";
  }
  if (/manual review|unknown required fields|post-click confirmation required|qualification/i.test(text)) {
    return "manual_review_required";
  }
  if (packages.length) return "no_submission_quality_gate";
  return "platform_blocked";
}

function nextActionForResult(result) {
  if (result === "submitted") return "Monitor submitted proposals and client messages.";
  if (result === "no_submission_quality_gate") return "Collect more recent opportunities under the active L3 plan; current candidates did not meet submit score gates.";
  if (result === "connects_insufficient") return "Spend available Connects only when the form cost is visible; do not buy Connects.";
  if (result === "manual_review_required") return "Resolve only concrete form blockers such as unknown required fields or qualification warnings.";
  if (result === "platform_blocked") return "Resolve the live platform blocker, then rerun the bounded Raw CDP cycle.";
  return "Debug the runtime error before rerunning.";
}

function trackedBids({ packages, observations, opportunitiesById }) {
  const latest = latestObservationByPackage(observations);
  return packages.map((pkg) => {
    const observation = latest.get(pkg.id);
    const opportunity = opportunitiesById.get(pkg.opportunity_id);
    return {
      package_id: pkg.id,
      job_id: pkg.job_id,
      job_title: opportunity?.title || "Untitled job",
      job_url: pkg.job_url,
      state: packageState(pkg, observation),
      connects_cost: observation?.connects_cost ?? null,
      safe_to_submit: observation?.safe_to_submit ?? false,
      reason: uniqueStrings(observation?.blockers || []).join("; ") || pkg.authorization_reason,
    };
  });
}

function buildSummaryMetrics({ opportunities, packages, observations, result }) {
  const balance = observedConnectsBalance(observations);
  const spent = connectsSpent(observations);
  const tracked = trackedBids({
    packages,
    observations,
    opportunitiesById: new Map(opportunities.map((opp) => [opp.id, opp])),
  });
  return {
    found_jobs_count: opportunities.length,
    candidate_cards_collected: candidateCardsCollected,
    proposal_packages_count: packages.length,
    submit_authorized_count: packages.filter((pkg) => pkg.mode === "submit_authorized").length,
    submitted_count: submittedPackageIds.length,
    tracked_bids: tracked,
    connects_balance_observed: balance,
    connects_spent: spent,
    connects_remaining_after_spend: balance === null ? null : balance - spent,
    blocker_summary: uniqueStrings([...blockers, ...observations.flatMap((obs) => obs.blockers)]),
    next_action: nextActionForResult(result),
  };
}

function writeBidTracker({ packages, observations, opportunitiesById }) {
  const latest = latestObservationByPackage(observations);
  const rows = packages.map((pkg) => {
    const observation = latest.get(pkg.id);
    const opportunity = opportunitiesById.get(pkg.opportunity_id);
    const state = packageState(pkg, observation);
    return {
      id: `bid-${pkg.job_id}`,
      run_id: RUN_ID,
      job_id: pkg.job_id,
      job_title: opportunity?.title || "Untitled job",
      job_url: pkg.job_url,
      package_id: pkg.id,
      state,
      connects_cost: observation?.connects_cost ?? null,
      connects_spent: submittedPackageIds.includes(pkg.id) ? observation?.connects_cost ?? 0 : 0,
      reason: uniqueStrings(observation?.blockers || []).join("; ") || pkg.authorization_reason,
      source_session: SOURCE_SESSION,
      updated_at: now(),
    };
  });
  if (rows.length) upsertJsonl("data/bid-tracker.jsonl", rows);
}

function writeObservedBalance(summaryMetrics) {
  if (!Number.isInteger(summaryMetrics.connects_balance_observed)) return;
  appendLine("data/connects-ledger.jsonl", {
    id: `connects-observe-balance-${RUN_STAMP}`,
    date: RUN_DATE,
    event_type: "observe_balance",
    budget_scope: "active_autonomy_plan",
    reserve_floor: ACTIVE_PLAN.reserve_floor,
    weekly_cap: ACTIVE_PLAN.weekly_connects_cap,
    daily_cap: ACTIVE_PLAN.daily_connects_cap,
    opportunity_id: null,
    proposal_package_id: null,
    connects_delta: 0,
    connects_balance_observed: summaryMetrics.connects_balance_observed,
    reason: "Observed during bounded Raw CDP proposal form inspection.",
    source_session: SOURCE_SESSION,
    created_at: now(),
  });
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

function writePlatformAction(packages, result) {
  appendLine("data/platform-actions.jsonl", {
    id: `platform-action-${RUN_STAMP}`,
    action_type: submittedPackageIds.length ? "submit_proposal" : "inspect_form",
    execution_channel: EXECUTION_CHANNEL,
    autonomy_level: AUTONOMY_LEVEL,
    authorized_ids: packages.filter((pkg) => pkg.mode === "submit_authorized").map((pkg) => pkg.id),
    forbidden_actions: [
      "buy_connects",
      "boost_proposal",
      "send_unauthorized_message",
      "accept_contract",
      "decline_contract",
      "off_platform_contact",
    ],
    volume_limit: MAX_SUBMISSIONS,
    source_policy: "docs/autonomous-ops-policy.md",
    source_session: SOURCE_SESSION,
    result,
    blockers: blockers.length ? blockers : ["no submitted packages"],
    expires_at: `${RUN_DATE}T23:59:59Z`,
    created_at: now(),
  });
}

function writeSession({ opportunities, packages, observations, summaryMetrics = null, result = "error" }) {
  const submitted = submittedPackageIds.length ? submittedPackageIds.join(", ") : "none";
  const blockerText = blockers.length ? blockers.map((item) => `- ${item}`).join("\n") : "- none";
  const warningText = warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "- none";
  const obsRows = observations.map((obs) => `| ${obs.proposal_package_id} | ${obs.job_url} | ${obs.connects_cost ?? ""} | ${obs.connects_balance_observed ?? ""} | ${obs.required_fields.join("; ")} | ${obs.unknown_required_fields.join("; ")} | ${[...obs.warnings, ...obs.blockers].join("; ")} | ${obs.safe_to_submit} |`).join("\n");
  const metrics = summaryMetrics || buildSummaryMetrics({ opportunities, packages, observations, result });
  const trackedRows = metrics.tracked_bids.length
    ? metrics.tracked_bids.map((bid) => `| ${bid.package_id} | ${bid.job_title} | ${bid.state} | ${bid.connects_cost ?? ""} | ${bid.reason} |`).join("\n")
    : "| none | none | none |  | none |";
  const text = `# Execution Session Log

## Identity

- Task file: tools/acquisition_os_live_test.mjs
- Session file: ${SESSION_FILE}
- Executor: Codex CDP-EXECUTOR
- Autonomy level: ${AUTONOMY_LEVEL}
- Execution channel: ${EXECUTION_CHANNEL}
- Base commit: ${baseCommit()}
- Result commit: none
- Start time: ${runStartedAt}
- End time: ${now()}

## Outcome Metrics

- Result: ${result}
- Found jobs: ${metrics.found_jobs_count}
- Candidate cards collected: ${metrics.candidate_cards_collected}
- Proposal packages: ${metrics.proposal_packages_count}
- Submit authorized: ${metrics.submit_authorized_count}
- Submitted: ${metrics.submitted_count}
- Connects observed: ${metrics.connects_balance_observed ?? "unknown"}
- Connects spent: ${metrics.connects_spent}
- Connects remaining after spend: ${metrics.connects_remaining_after_spend ?? "unknown"}
- Next action: ${metrics.next_action}

| Package ID | Job Title | State | Connects Cost | Reason |
|---|---|---|---:|---|
${trackedRows}

## Runtime Status

- CDP status: Raw CDP at 127.0.0.1:9222
- Upwork login status: checked before collection
- Input proposal package IDs: ${packages.map((pkg) => pkg.id).join(", ") || "none"}
- Input message package IDs: none
- Platform action IDs: platform-action-${RUN_STAMP}

## Connects

- Connects observed: recorded per form observation when visible
- Connects spent: ${metrics.connects_spent}
- Daily cap: ${budgetSnapshot(metrics.connects_balance_observed).daily_connects_cap}
- Weekly cap: ${budgetSnapshot(metrics.connects_balance_observed).weekly_connects_cap}
- Reserve floor: ${budgetSnapshot(metrics.connects_balance_observed).reserve_floor}

## Form Observations

| Proposal Package ID | Job URL | Connects Cost | Observed Balance | Required Fields | Unknown Required Fields | Warnings | Safe To Submit |
|---|---|---:|---:|---|---|---|---|
${obsRows}

## Message Observations

| Message Package ID | Thread URL | Mode | Authorized | Sent | Blockers |
|---|---|---|---|---|---|
| none | none | none | false | false | none |

## Actions Taken

${actions.map((item) => `- ${item}`).join("\n")}

## Submit Status

- Mode: ${MODE}
- Submit attempted: ${submitAttemptedPackageIds.length ? `yes (${submitAttemptedPackageIds.join(", ")})` : "no"}
- Submit result: ${submitted}

## Message Status

- Message send attempted: no
- Message send result: none

## Blockers

${blockerText}

## Warnings

${warningText}

## Evidence Paths

- ${SESSION_FILE}
- data/jobs.jsonl
- data/proposal-packages.jsonl
- data/connects-ledger.jsonl
- data/form-observations.jsonl
- data/runs.jsonl
- data/platform-actions.jsonl
- data/bid-tracker.jsonl

## Risk Judgment

- Proposal actions stayed package-scoped. No-submit smoke runs do not promote submit authorization.
- No Buy Connects, boost, client message, screenshot, cookie, credential, IP, or Cloudflare Ray ID was saved.

## Next Action For Manager

- Review blockers and package scores before the next delegated submit run.

## Files Changed

- data/jobs.jsonl
- data/proposal-packages.jsonl
- data/form-observations.jsonl
- data/outcomes.jsonl
- data/runs.jsonl
- data/platform-actions.jsonl
- data/bid-tracker.jsonl
- ${SESSION_FILE}
`;
  writeText(SESSION_FILE, text);
}

function writeAuditPatchIfNeeded(observations, result) {
  if (submittedPackageIds.length) return;
  const reason = blockers.find((item) => /Cloudflare|login/i.test(item))
    || observations.flatMap((obs) => obs.blockers).find(Boolean)
    || "no opportunity passed submit gates";
  const recommendation = result === "no_submission_quality_gate"
    ? "Collect more candidates and use the current submit-score gates instead of treating the run as a platform safety block."
    : "Keep the submit gates unchanged and rerun only after the blocker is resolved.";
  appendLine("data/policy-patches.jsonl", {
    id: `patch-${RUN_STAMP}`,
    source_session: SOURCE_SESSION,
    patch_type: "blocked-run-classification",
    finding: reason,
    recommendation,
    created_at: now(),
  });
}

function gitCloseout(filesChanged, result) {
  if (!GIT_CLOSEOUT) return;
  runCommand("node", ["tools/validate_data_schemas.mjs"]);
  runCommand("git", ["add", "--", ...filesChanged]);
  const staged = runCommand("git", ["diff", "--cached", "--name-only"]);
  if (!staged) {
    actions.push("git closeout found no staged run outputs");
    return;
  }
  runCommand("git", ["commit", "-m", `upwork acquisition cycle ${RUN_DATE} ${result}`]);
  runCommand("git", ["push"]);
  actions.push("git closeout committed and pushed run outputs");
}

async function main() {
  if (!fs.existsSync(abs("AGENTS.md"))) throw new Error("Run from repository root");
  ensureDir("data");
  ensureDir("sessions");
  for (const rel of ["data/jobs.jsonl", "data/proposal-packages.jsonl", "data/connects-ledger.jsonl", "data/form-observations.jsonl", "data/outcomes.jsonl", "data/policy-patches.jsonl", "data/platform-actions.jsonl", "data/bid-tracker.jsonl", "data/runs.jsonl"]) {
    if (!fs.existsSync(abs(rel))) writeText(rel, "");
  }

  await ensureCdp();
  cdp = await connectCdp();
  await checkLoginAndNotifications();

  actions.push(NO_SUBMIT
    ? "planned no-submit live smoke with available-balance cap and no Buy Connects"
    : "planned delegated submit run with available-balance cap and no Buy Connects");
  const collected = await collectOpportunities();
  if (!collected.length) blockers.push("no opportunities collected from live pages");
  const scored = collected.map(scoreOpportunity);
  writeJsonl("data/jobs.jsonl", scored);
  actions.push(`scored ${scored.length} opportunities`);

  const packageInputs = scored
    .filter((opp) => opp.recommended_action !== "skip")
    .sort((a, b) => (b.fit_score + b.client_quality_score + b.competition_score - b.risk_score) - (a.fit_score + a.client_quality_score + a.competition_score - a.risk_score))
    .slice(0, INSPECT_LIMIT);
  const packages = packageInputs.map(buildPackage);
  actions.push(`built ${packages.length} proposal packages`);

  const observations = [];
  for (const pkg of packages) {
    const obs = await inspectAndMaybeSubmit(pkg, { attemptSubmit: false });
    observations.push(obs);
  }

  authorizeAfterInspection(packages, observations, new Map(scored.map((opp) => [opp.id, opp])));
  writeJsonl("data/proposal-packages.jsonl", packages);

  const executable = packages.filter((pkg) => pkg.mode === "submit_authorized").slice(0, MAX_SUBMISSIONS);
  if (!executable.length) blockers.push("no package met submit score and hard gates");
  if (NO_SUBMIT && executable.length) {
    actions.push(`no-submit smoke skipped ${executable.length} executable submit step(s)`);
    blockers.push("no-submit smoke did not attempt final submit");
  }
  for (const pkg of executable) {
    if (NO_SUBMIT) continue;
    const obs = await inspectAndMaybeSubmit(pkg, { attemptSubmit: true });
    observations.push(obs);
  }
  writeJsonl("data/form-observations.jsonl", observations);

  await monitorOutcomes(packages);
  const result = classifyRunResult({ packages, observations });
  const opportunitiesById = new Map(scored.map((opp) => [opp.id, opp]));
  writeBidTracker({ packages, observations, opportunitiesById });
  const summaryMetrics = buildSummaryMetrics({ opportunities: scored, packages, observations, result });
  writeObservedBalance(summaryMetrics);
  writeAuditPatchIfNeeded(observations, result);
  writePlatformAction(packages, result);
  writeSession({ opportunities: scored, packages, observations, summaryMetrics, result });

  appendLine("data/runs.jsonl", {
    id: RUN_ID,
    task_file: "tools/acquisition_os_live_test.mjs",
    session_file: SESSION_FILE,
    mode: MODE,
    autonomy_level: AUTONOMY_LEVEL,
    execution_channel: EXECUTION_CHANNEL,
    policy_version: POLICY_VERSION,
    budget_snapshot: budgetSnapshot(summaryMetrics.connects_balance_observed),
    authorized_action_ids: [`platform-action-${RUN_STAMP}`],
    started_at: runStartedAt,
    ended_at: now(),
    input_ids: packages.map((pkg) => pkg.id),
    actions_taken: actions,
    files_changed: runOutputFiles(),
    result,
    submit_attempted: submitAttemptedPackageIds,
    blockers: blockers.length ? blockers : observations.flatMap((obs) => obs.blockers),
    summary_metrics: summaryMetrics,
  });
  gitCloseout(runOutputFiles(), result);

  console.log(JSON.stringify({
    result,
    opportunities: summaryMetrics.found_jobs_count,
    packages: summaryMetrics.proposal_packages_count,
    executable: executable.length,
    submitted: submittedPackageIds,
    summary_metrics: summaryMetrics,
    no_submit: NO_SUBMIT,
    blockers,
    warnings,
    session: SESSION_FILE,
  }, null, 2));
}

main()
  .catch((error) => {
    blockers.push(error.message);
    try {
      const summaryMetrics = buildSummaryMetrics({ opportunities: [], packages: [], observations: [], result: "error" });
      writeSession({ opportunities: [], packages: [], observations: [], summaryMetrics, result: "error" });
      appendLine("data/runs.jsonl", {
        id: RUN_ID,
        task_file: "tools/acquisition_os_live_test.mjs",
        session_file: SESSION_FILE,
        mode: MODE,
        autonomy_level: AUTONOMY_LEVEL,
        execution_channel: EXECUTION_CHANNEL,
        policy_version: POLICY_VERSION,
        budget_snapshot: budgetSnapshot(summaryMetrics.connects_balance_observed),
        authorized_action_ids: [],
        started_at: runStartedAt,
        ended_at: now(),
        input_ids: [],
        actions_taken: actions,
        files_changed: ["data/runs.jsonl", SESSION_FILE],
        result: "error",
        blockers,
        summary_metrics: summaryMetrics,
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
