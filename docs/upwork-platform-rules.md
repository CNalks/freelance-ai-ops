# Upwork Platform Rules

Last verified: 2026-05-10.

This file is the operating rule summary for agents. It does not replace Upwork's Terms of Service or Help Center, and it should be refreshed when a policy-sensitive automation change is made.

## Sources

- Automation: https://support.upwork.com/hc/en-us/articles/43342677368467-Use-bots-and-other-automation-properly
- Connects: https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects
- Terms overview: https://support.upwork.com/hc/en-us/articles/35088001179283-Understand-Upwork-Terms-of-Service
- Pre-contract communication: https://support.upwork.com/hc/en-us/articles/360052511833-Get-to-know-each-other-before-a-contract
- Contact information: https://support.upwork.com/hc/en-us/articles/360051749534-How-to-keep-your-contact-information-safe-on-Upwork
- AI assistant use: https://support.upwork.com/hc/en-us/articles/22983791592595-How-to-use-Uma-Upwork-s-Mindful-AI-as-a-freelancer

## Automation Rules

Upwork treats scripts, browser extensions, bots, crawlers, and similar tools that send requests, collect data, or perform actions faster or more frequently than a human as automation.

Operational consequences:

- Raw CDP in this repo is a human-like browser operation channel. It may search, inspect jobs, inspect forms, fill authorized fields, submit authorized proposals, monitor outcomes, and reply to authorized messages.
- Raw CDP must stay bounded, low-volume, stateful, and auditable. It must use the logged-in browser like a human operator and write `sessions/*.md`.
- Bulk crawling, full-site scraping, high-frequency polling, rate-limit bypass, hidden API extraction, credential replay, and spam actions are forbidden.
- Do not export, replay, or mix browser session cookies, tokens, or API credentials in scripts.
- Do not call website pages as an API.
- Stop on Cloudflare, CAPTCHA, login, abnormal verification, or rate-limit signals.
- Do not spam proposals, invites, or messages.

## Connects Rules

Connects are Upwork tokens used for proposals and ad products such as boosted proposals and the Availability Badge. Proposal Connects cost can vary by job and can change while the job is posted.

Allowed earning paths to track:

- Onboarding tasks such as profile setup, identity verification, and available learning tasks.
- Monthly free Connects when the account is eligible.
- Talent badge rewards, including Rising Talent, Top Rated, and Top Rated Plus.
- Activity rewards when eligible, including proposal-spend rewards that Upwork may test for some freelancers.
- Interview rewards from established clients when awarded.
- First successful boost reward only if boosting is separately authorized.

Repo policy overrides:

- Buying Connects is forbidden.
- Boosting is forbidden unless a task explicitly authorizes a specific boosted proposal.
- Do not submit weak proposals just to chase Connects rewards.
- Record observed balance, observed cost, spend, returns, and earned rewards in `data/connects-ledger.jsonl`.

## Communication And Payment Rules

- Keep all pre-contract project discussions on Upwork.
- Do not share or request phone numbers, email addresses, home or work addresses, external chat usernames, or social handles before a contract starts unless a documented Upwork exception applies.
- Even when an exception allows sharing access details, job and payment discussion must remain on Upwork until the contract starts.
- Do not ask for or agree to off-platform payment.
- Report or escalate requests for off-platform communication, off-platform payment, suspicious links, or free test work.

## AI Use Rules

Agents may draft proposals, replies, scope notes, and work plans. For client delivery work, check whether the client prohibits generative AI use. When relevant, disclose AI-assisted work in plain language and keep deliverables accurate, original, and contract-compliant.
