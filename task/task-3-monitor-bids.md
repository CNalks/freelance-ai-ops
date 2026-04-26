# Task 3: Monitor Bids — 检查已投 Proposal 竞价状态

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile.
CDP 工具函数参考: `docs/cdp-utils.md`

Input files:
- `docs/proposal-tracker.md` — 所有已投/待投 proposal 的记录

## Prerequisites

- Chrome CDP running and logged into Upwork
- `docs/proposal-tracker.md` 中有状态为 "Submitted" 或 "Pre-filled" 的条目

## CRITICAL SAFETY RULES

- **DO NOT** submit proposals, send messages, or click any purchase/submit buttons
- **DO NOT** withdraw proposals unless user explicitly instructed
- Use Raw CDP only (no Playwright, no Windows MCP)

## Objective

检查每个已提交 proposal 的最新竞争状态，更新 tracker，发现需要关注的情况（客户查看了、邀请面试、job 关闭等）。

## Step 1: Standard CDP Setup

参考 `docs/cdp-utils.md` 的 "Standard Task Header"：
1. ensure_chrome_cdp()
2. Connect to tab
3. Verify login
4. Check notifications — 如有未读消息，立即报告

## Step 2: Check My Proposals Page

导航到 Upwork 的 "My Proposals" 页面：

```python
await cdp.navigate("https://www.upwork.com/nx/proposals/")
await asyncio.sleep(3)
```

提取所有 proposal 的状态：

```python
proposals_data = await cdp.evaluate("""
(() => {
    const items = document.querySelectorAll('[data-test="proposal-tile"], .up-card-section, article');
    const results = [];
    for (const item of items) {
        const text = item.innerText;
        results.push({
            text: text.slice(0, 500),
            hasInterview: /interview/i.test(text),
            isViewed: /viewed/i.test(text),
            isActive: /active/i.test(text),
            isArchived: /archived|declined|withdrawn/i.test(text),
        });
    }
    return JSON.stringify(results);
})()
""")
```

## Step 3: Check Each Submitted Job Page

对 tracker 中每个 "Submitted" 状态的 proposal，访问其 job URL：

```python
for proposal in submitted_proposals:
    await cdp.navigate(proposal["url"])
    await asyncio.sleep(3)

    job_status = await cdp.evaluate("""
    (() => {
        const text = document.body.innerText;
        const snippet = text.slice(0, 3000);
        return JSON.stringify({
            isClosed: /this job is closed|no longer accepting/i.test(snippet),
            proposalCount: (snippet.match(/(\\d+)\\s+to\\s+(\\d+)\\s+proposals/i) || [])[0] || 'unknown',
            hires: (snippet.match(/(\\d+)\\s+hire/i) || [])[0] || 'unknown',
            isHiring: /interviewing|hired/i.test(snippet),
            clientActivity: (snippet.match(/last viewed[^.]*\\./i) || [])[0] || 'unknown',
            snippet: snippet.slice(0, 300),
        });
    })()
    """)
```

## Step 4: Competitive Analysis

对每个 active proposal 分析竞争态势：

判断标准：
- **热门（需关注）**: proposals 数从 "5-10" 涨到 "20-50"+ → 竞争加剧
- **有希望**: 客户 "last viewed" 是最近 24h 内 → 客户在活跃审阅
- **已失效**: job closed 或 已 hired → 标记为 Closed
- **低竞争**: proposals 仍然 < 15 → 机会还在

## Step 5: Update Tracker

更新 `docs/proposal-tracker.md` 中每行的 Status 和 Notes：

可能的状态更新：
- `Submitted` → `Submitted (X proposals, client active)` — 竞争数据更新
- `Submitted` → `Viewed` — 客户查看了我的 proposal
- `Submitted` → `Interviewing` — 收到面试邀请（高优先级！）
- `Submitted` → `Job Closed` — 职位已关闭
- `Submitted` → `Hired (other)` — 客户已雇人

## Step 6: Generate Bid Report

创建/更新 `docs/bid-report.md`：

```markdown
# Bid Monitoring Report — [date]

## Active Proposals: X
## Interviews: Y
## Closed/Lost: Z

### Needs Attention
| Job | Status | Change | Recommended Action |
|-----|--------|--------|-------------------|

### Still Active
| Job | Proposals When Applied | Proposals Now | Client Activity |
|-----|----------------------|---------------|-----------------|

### Closed/Archived
| Job | Outcome | Notes |
|-----|---------|-------|
```

## Step 7: Recommended Actions

根据监控结果生成建议：

- **有面试邀请** → 提醒用户立即处理，准备面试回复
- **客户活跃但未联系** → 建议用 Task 4 发 follow-up
- **竞争激烈 50+ proposals** → 标记为低优先级
- **Job closed 但没雇人** → 客户可能重新发布，留意类似新 job

## Step 8: Git

```bash
git add docs/proposal-tracker.md docs/bid-report.md
git commit -m "monitor bids [date]"
git push origin main
```

## Output Summary

```
=== Bid Monitor Summary [date] ===
Active proposals: X
Interviews/invitations: Y
Client viewed: Z
Job closed: W
High competition (50+): V
Recommended actions: [list]
Next step: Run Task 4 if there are messages to respond to
```
