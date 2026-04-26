# Task 4: Client Communication — 检查消息并草拟回复

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile。
CDP 工具函数参考: `docs/cdp-utils.md`

Input files:
- `docs/proposal-tracker.md` — 已投 proposal 记录
- `profile/client-templates/` — 回复模板（initial-response, scope-clarification, milestone-update）
- `docs/pricing.md` — 定价策略

Output files:
- `docs/messages.md` — 待发送的消息草稿

## Prerequisites

- Chrome CDP running and logged into Upwork
- 已有 Submitted 状态的 proposal 或活跃的合同

## CRITICAL SAFETY RULES

- **DO NOT send any messages** — 只草拟，用户手动发送
- **DO NOT accept or decline contracts**
- **DO NOT click any purchase/submit buttons**
- Use Raw CDP only (no Playwright, no Windows MCP)

## Objective

检查 Upwork 收件箱的所有新消息和通知，读取内容，根据上下文草拟回复，保存到 `docs/messages.md` 供用户审阅后手动发送。

## Step 1: Standard CDP Setup

参考 `docs/cdp-utils.md` 的 "Standard Task Header"：
1. ensure_chrome_cdp()
2. Connect to tab
3. Verify login

## Step 2: Check Messages Page

```python
await cdp.navigate("https://www.upwork.com/nx/messages/")
await asyncio.sleep(5)
```

提取消息列表：

```python
messages = await cdp.evaluate("""
(() => {
    const threads = document.querySelectorAll('[data-test="message-thread"], .thread-list-item, [class*="thread"]');
    const results = [];
    for (const t of threads) {
        const text = t.innerText;
        const isUnread = t.classList.contains('unread')
            || t.querySelector('.unread, .badge, [data-test="unread"]') !== null
            || /unread/i.test(t.className);
        results.push({
            text: text.slice(0, 300),
            isUnread,
        });
    }
    return JSON.stringify(results.slice(0, 20));
})()
""")
```

## Step 3: Read Each Unread Thread

对每个未读消息线程，点击进入并读取完整内容：

```python
for i, thread in enumerate(unread_threads):
    # Click into thread
    await cdp.evaluate(f"""
    (() => {{
        const threads = document.querySelectorAll('[data-test="message-thread"], .thread-list-item, [class*="thread"]');
        const unread = [...threads].filter(t =>
            t.classList.contains('unread')
            || t.querySelector('.unread, .badge') !== null
        );
        if (unread[{i}]) unread[{i}].click();
        return 'clicked';
    }})()
    """)
    await asyncio.sleep(3)

    # Extract thread content
    thread_content = await cdp.evaluate("""
    (() => {
        const msgs = document.querySelectorAll('[data-test="message"], .msg-body, [class*="message-body"]');
        const content = [];
        for (const m of msgs) {
            content.push(m.innerText.slice(0, 1000));
        }
        // Also get job context if available
        const jobLink = document.querySelector('a[href*="/jobs/"]');
        const jobTitle = jobLink ? jobLink.textContent.trim() : 'unknown';
        return JSON.stringify({
            jobTitle,
            messageCount: content.length,
            messages: content.slice(-10), // last 10 messages
        });
    })()
    """)
```

## Step 4: Check Notifications

```python
await cdp.navigate("https://www.upwork.com/nx/notifications/")
await asyncio.sleep(3)

notifications = await cdp.evaluate("""
(() => {
    const items = document.querySelectorAll('[data-test="notification-item"], .notification, [class*="notif"]');
    const results = [];
    for (const n of items) {
        results.push({
            text: n.innerText.slice(0, 300),
            isNew: n.classList.contains('unread') || n.querySelector('.unread, .badge') !== null,
        });
    }
    return JSON.stringify(results.slice(0, 15));
})()
""")
```

识别关键通知类型：
- **Interview invitation** → 高优先级
- **Offer/contract** → 高优先级
- **Client message** → 中优先级
- **Job recommendation** → 低优先级，忽略

## Step 5: Draft Replies

根据消息类型和上下文，参考 `profile/client-templates/` 草拟回复。

写入 `docs/messages.md`：

```markdown
# Pending Messages — [date]

## Message 1: [Client Name / Job Title]
**Thread URL:** [url]
**Type:** [Interview invite / Client question / Scope discussion / Contract offer]
**Client said:** [summary of their message, under 50 words]

### Draft Reply:
[reply text — under 150 words, professional but conversational]

### Notes:
[any context: pricing considerations, scope concerns, questions to ask]

**Action needed:** User review and send manually on Upwork

---
```

回复草拟规则：
- 参考 `profile/client-templates/initial-response.md` 用于首次回复
- 参考 `profile/client-templates/scope-clarification.md` 用于需求确认
- 参考 `profile/client-templates/milestone-update.md` 用于项目进展
- 回复不超过 150 words
- 提问时最多 2 个问题，不要让客户觉得负担重
- 如果涉及定价，参考 `docs/pricing.md`
- 如果客户发了 offer，**不要替用户做决定**，只列出条款和建议

## Step 6: Classify Priority

每条消息标注优先级：

- **P0 — 立即处理**: Interview invite, Contract offer, Client asking for availability
- **P1 — 当天处理**: Scope questions, Follow-up on proposal, Technical questions
- **P2 — 可延后**: General inquiries, Job recommendations

## Step 7: Git

```bash
git add docs/messages.md docs/proposal-tracker.md
git commit -m "check messages [date]"
git push origin main
```

## Output Summary

```
=== Client Comms Summary [date] ===
Unread message threads: X
Notifications: Y
Draft replies written: Z

Priority breakdown:
  P0 (urgent): A
  P1 (today): B
  P2 (later): C

Next step: User reviews docs/messages.md and sends replies on Upwork
```

## Constraints

- NEVER send messages — only draft them
- NEVER accept/decline contracts or offers
- NEVER click Submit/Send buttons
- Use Raw CDP only
- Keep replies under 150 words
- If thread content is ambiguous, note it and let user decide
