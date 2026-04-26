# Workflow — Codex-Assisted Upwork Freelancing

## 全业务流程

```
获客阶段                          跟进阶段                       优化阶段
Task 1 → Task 2 → 👤Submit  →  Task 3 → Task 4 → 👤Send  →  Task 5 → Task 6
找工作    填表单    手动提交       监控竞价   客户沟通   手动发送     数据分析   策略优化
(每天)    (每天)                   (每天)    (每天2次)               (每周)    (每月)
```

## Task 文件

| Task | 文件 | 用途 | 频率 | 自动化程度 |
|------|------|------|------|-----------|
| Task 1 | `task/task-1-find-jobs.md` | 搜索 → 去重 → 打分 → 写 proposal | 每天 1 次 | 全自动 |
| Task 2 | `task/task-2-apply-jobs.md` | CDP 填表单，停在 Submit 前 | 跟随 Task 1 | 半自动（你点 Submit） |
| Task 3 | `task/task-3-monitor-bids.md` | 检查已投 proposal 竞争状态 | 每天 1 次 | 全自动 |
| Task 4 | `task/task-4-client-comms.md` | 检查消息 → 草拟回复 | 每天 1-2 次 | 半自动（你发消息） |
| Task 5 | `task/task-5-analytics.md` | 数据采集 → 转化漏斗分析 | 每周 1 次 | 全自动 |
| Task 6 | `task/task-6-optimize.md` | Profile/定价/模板优化建议 | 每月 / 按需 | 半自动（你确认修改） |

## 共享状态文件（docs/）

| 文件 | 写入者 | 读取者 | 用途 |
|------|--------|--------|------|
| `job-leads.md` | Task 1 | — | 当天搜索到的 job 列表 |
| `proposal-drafts.md` | Task 1 | Task 2 | 当天草拟的 cover letter |
| `proposal-tracker.md` | Task 1-4 | 所有 Task | 所有 proposal 的状态记录（核心状态表） |
| `messages.md` | Task 4 | — | 待发送的消息草稿 |
| `bid-report.md` | Task 3 | Task 6 | 竞价监控报告 |
| `analytics.md` | Task 5 | Task 6 | 周度数据分析报告 |
| `pricing.md` | Task 6 | Task 1-2 | 定价策略 |
| `progress.md` | 手动 | 所有 | 项目里程碑 |
| `cdp-utils.md` | — | 所有 Task | CDP 工具函数参考 |
| `codex-automations.md` | — | — | Codex 自动化任务 prompt |

## 日常操作流程

### 每天（5-10 分钟人工时间）

1. **启动 CDP Chrome** — 确保 `127.0.0.1:9222` 运行且已登录 Upwork
2. **跑 Codex Automation 1** — 自动完成 Task 1-4
3. **Codex 完成后：**
   - 打开浏览器 tab，检查 Task 2 pre-filled 的表单 → 点 Submit
   - 查看 `docs/messages.md`，审阅草拟的回复 → 在 Upwork 手动发送
   - 如果有面试邀请或 offer，在 Upwork 上处理

### 每周日

4. **跑 Codex Automation 2** — Task 5 数据分析 + 可选 Task 6 优化

### 按需

5. **跑 Codex Automation 3** — 快速检查客户消息

## Codex 自动化配置

详见 `docs/codex-automations.md`，包含每个 automation 的完整 prompt 和调度建议。

## 工具栈

| 工具 | 用途 | 位置 |
|------|------|------|
| Raw CDP Scraper | Job 搜索和表单填充 | `automation/upwork-cdp-scraper/` |
| CDP Utils | 共享 CDP 工具函数 | `docs/cdp-utils.md` |
| Proposal Templates | Proposal 起始模板 | `profile/proposal-templates/` |
| Client Templates | 客户回复模板 | `profile/client-templates/` |

## 安全规则

- 所有"发送"类操作由用户手动完成（Submit proposal, Send message, Accept contract）
- Codex 永远不会自动提交、发消息或购买
- 如果 CDP 登录过期，Codex 会检测并停止
- 不提交 credentials、.env、screenshots 到 git（.gitignore 已配置）
