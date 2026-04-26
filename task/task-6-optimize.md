# Task 6: Optimize — Profile 和策略优化

## Context

Repository: `freelance-ai-ops`
Chrome CDP must be running at `127.0.0.1:9222` with the dedicated profile。
CDP 工具函数参考: `docs/cdp-utils.md`

Input files:
- `docs/analytics.md` — 最新数据报告
- `docs/pricing.md` — 当前定价策略
- `docs/proposal-tracker.md` — 历史 proposal 记录
- `profile/upwork-profile.md` — 当前 profile 内容
- `profile/proposal-templates/` — 当前 proposal 模板

## Prerequisites

- 至少完成过一轮完整的 Task 1-5 循环
- `docs/analytics.md` 有数据可供分析

## CRITICAL SAFETY RULES

- **DO NOT** 直接修改 Upwork 上的 profile — 只生成建议和草稿
- **DO NOT** submit proposals, send messages, or click purchase buttons
- Use Raw CDP only (no Playwright, no Windows MCP)

## Objective

基于 analytics 数据，优化 profile 内容、定价策略、搜索关键词和 proposal 模板，提升转化率。

## Step 1: Read Current State

读取所有相关文件：
- `docs/analytics.md`
- `docs/pricing.md`
- `docs/proposal-tracker.md`
- `profile/upwork-profile.md`
- `profile/proposal-templates/*.md`

## Step 2: CDP — 查看当前 Profile 在 Upwork 上的实际展示

```python
await cdp.navigate("https://www.upwork.com/freelancers/~YOUR_PROFILE_ID")
await asyncio.sleep(3)

live_profile = await cdp.evaluate("""
(() => {
    const text = document.body.innerText;
    return JSON.stringify({
        title: (text.match(/^(.+?)\\n/m) || [])[1] || '',
        snippet: text.slice(0, 3000),
        skills: [...document.querySelectorAll('.up-skill-badge, [data-test="skill-badge"], .air3-token')]
            .map(s => s.textContent.trim()),
        portfolioCount: document.querySelectorAll('[data-test="portfolio-item"], .portfolio-item').length,
    });
})()
""")
```

## Step 3: Analyze What's Working

从 proposal-tracker 分析模式：

```python
# 哪些类型的 job 获得了回复？
# 哪个价格区间最有效？
# 哪些关键词搜索出的 job 质量最高？
# Cover letter 的哪些元素（问问题、给demo链接、提timeline）与回复率相关？
```

生成分析：
- **Top performing job categories** — 按回复率排序
- **Optimal price range** — 有回复的 proposals 的价格分布
- **Best search queries** — 哪些搜索词带来了高质量 job
- **Cover letter patterns** — 有回复 vs 无回复的 proposal 对比

## Step 4: Generate Optimization Suggestions

更新/创建 `docs/optimization.md`：

```markdown
# Optimization Plan — [date]

## Profile Updates
### Title
Current: "[current title]"
Suggested: "[new title]" — 理由: [data-driven reason]

### Overview/Bio
Current summary: [2-3 sentences]
Suggested changes: [specific edits with reasoning]

### Skills to Add/Remove
Add: [skills that appear in responded jobs but not in profile]
Remove: [skills that never appear in applied jobs]

## Pricing Adjustments
Current base: $X/hr
Data shows: responses cluster at $Y-$Z range
Suggestion: [adjust or keep, with reasoning]

## Search Query Optimization
Keep: [queries that produced responses]
Drop: [queries that never produced quality leads]
Add: [new queries based on responded job patterns]

## Proposal Template Updates
What's working: [elements correlated with responses]
What to change: [elements to add/remove]

## Portfolio Updates
Missing demos for: [job categories with interest but no matching demo]
Suggestion: [specific demo to build next]
```

## Step 5: Update Local Files

根据优化建议，更新本地文件（**不修改 Upwork**，用户手动同步）：

- 更新 `profile/upwork-profile.md` 加入建议的修改
- 更新 `docs/pricing.md` 如果需要调价
- 更新 `profile/proposal-templates/*.md` 如果模板需要优化
- 更新 `task/task-1-find-jobs.md` 里的搜索关键词（如果需要）

所有修改用 `<!-- OPTIMIZATION [date]: [reason] -->` 注释标记，方便追溯。

## Step 6: Git

```bash
git add docs/optimization.md docs/pricing.md profile/ task/task-1-find-jobs.md
git commit -m "optimization pass [date]"
git push origin main
```

## Output Summary

```
=== Optimization Summary [date] ===
Profile changes suggested: X
Pricing adjustment: [yes/no, summary]
Search queries updated: [added N, removed M]
Template updates: [summary]
Next step: User reviews docs/optimization.md and applies changes on Upwork
```

## Frequency

- **每周 1 次** — 如果投了 10+ proposals
- **每月 1 次** — 常规维护
- **即时** — 当 response rate 突然下降时
