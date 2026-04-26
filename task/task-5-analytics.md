# Task 5: Analytics — 数据采集与转化分析

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile。
CDP 工具函数参考: `docs/cdp-utils.md`

Input files:
- `docs/proposal-tracker.md` — 所有 proposal 记录
- `docs/pricing.md` — 定价策略

Output files:
- `docs/analytics.md` — 周度/月度数据汇总

## Prerequisites

- Chrome CDP running and logged into Upwork
- 至少有一些 proposal 记录可供分析

## CRITICAL SAFETY RULES

- **只读操作** — 不修改任何 Upwork 设置
- Use Raw CDP only (no Playwright, no Windows MCP)

## Objective

采集 Upwork 账户数据（profile views, proposal stats, earnings），结合 proposal-tracker 计算转化漏斗，生成可执行的优化建议。

## Step 1: Standard CDP Setup

参考 `docs/cdp-utils.md` 的 "Standard Task Header"。

## Step 2: Collect Profile Stats

```python
await cdp.navigate("https://www.upwork.com/nx/find-work/best-matches")
await asyncio.sleep(3)

profile_stats = await cdp.evaluate("""
(() => {
    const text = document.body.innerText;
    return JSON.stringify({
        pageSnippet: text.slice(0, 1000),
        availableConnects: (text.match(/(\\d+)\\s*Available Connect/i) || [])[1] || 'unknown',
    });
})()
""")
```

导航到 Profile Stats 页面：

```python
await cdp.navigate("https://www.upwork.com/freelancers/settings/profile")
await asyncio.sleep(3)

profile_data = await cdp.evaluate("""
(() => {
    const text = document.body.innerText;
    return JSON.stringify({
        snippet: text.slice(0, 2000),
        profileViews: (text.match(/profile\\s*views?[:\\s]*(\\d+)/i) || [])[1] || 'unknown',
        searchAppearances: (text.match(/search\\s*appear[^:]*[:\\s]*(\\d+)/i) || [])[1] || 'unknown',
    });
})()
""")
```

## Step 3: Collect My Proposals Stats

```python
await cdp.navigate("https://www.upwork.com/nx/proposals/")
await asyncio.sleep(3)

proposals_stats = await cdp.evaluate("""
(() => {
    const text = document.body.innerText;
    const tabs = document.querySelectorAll('[role="tab"], .nav-tab, button[data-test]');
    const tabTexts = [...tabs].map(t => t.textContent.trim());
    return JSON.stringify({
        tabTexts,
        activeCount: (text.match(/Active\\s*\\((\\d+)\\)/i) || [])[1] || '0',
        submittedCount: (text.match(/Submitted\\s*\\((\\d+)\\)/i) || [])[1] || '0',
        archivedCount: (text.match(/Archived\\s*\\((\\d+)\\)/i) || [])[1] || '0',
        snippet: text.slice(0, 1000),
    });
})()
""")
```

## Step 4: Analyze Proposal Tracker

读取 `docs/proposal-tracker.md`，计算转化漏斗：

```
Total proposals drafted: X
├── Submitted: Y
│   ├── Viewed by client: A
│   ├── Interview/response: B
│   ├── Contract offered: C
│   ├── Hired: D
│   ├── Job closed (lost): E
│   └── Still pending: F
├── Pre-filled (not submitted): G
├── Skipped/Blocked: H
└── Ready to submit: I
```

计算关键指标：
- **Submit rate**: Submitted / Total drafted
- **View rate**: Viewed / Submitted
- **Response rate**: (Interview + Response) / Submitted
- **Win rate**: Hired / Submitted
- **Connects efficiency**: Connects spent per response
- **Average bid**: mean of all submitted rates

## Step 5: Trend Analysis

与上一期 analytics 数据对比（如果存在 `docs/analytics.md`）：

- Profile views 趋势
- Proposal 竞争度变化（平均 proposal count per job）
- 响应率变化
- Connects 消耗速度

## Step 6: Generate Recommendations

根据数据生成可执行建议：

```markdown
### Recommendations

1. **[如果 response rate < 10%]**: 考虑降低投标价格或优化 cover letter 质量
2. **[如果 profile views 低]**: 更新 profile 标题和技能标签
3. **[如果 connects 消耗快但回复少]**: 收紧筛选标准，只投 < 10 proposals 的 job
4. **[如果某类 job 回复率高]**: 加大该方向搜索关键词权重
5. **[如果 win rate > 20%]**: 可以考虑提高报价
```

## Step 7: Write Analytics Report

更新 `docs/analytics.md`：

```markdown
# Analytics Report

## Latest: [date]

### Account Metrics
| Metric | Value | Change |
|--------|-------|--------|
| Profile views (week) | X | +/-Y |
| Search appearances | X | +/-Y |
| Available Connects | X | -Y used |

### Proposal Funnel
| Stage | Count | Rate |
|-------|-------|------|
| Drafted | X | — |
| Submitted | Y | Y/X |
| Viewed | A | A/Y |
| Response/Interview | B | B/Y |
| Hired | C | C/Y |

### By Job Category
| Category | Proposals | Responses | Best Rate |
|----------|-----------|-----------|-----------|
| AI/LLM | X | Y | $Z/hr |
| FastAPI | X | Y | $Z/hr |
| MVP | X | Y | $Z/hr |

### Recommendations
[auto-generated recommendations]

---

## History
| Week | Proposals | Responses | Hires | Connects Used |
|------|-----------|-----------|-------|---------------|
| [date range] | X | Y | Z | W |
```

## Step 8: Git

```bash
git add docs/analytics.md docs/proposal-tracker.md
git commit -m "analytics report [date]"
git push origin main
```

## Output Summary

```
=== Analytics Summary [date] ===
Profile views: X
Active proposals: Y
Response rate: Z%
Connects remaining: W
Top recommendation: [one-liner]
```
