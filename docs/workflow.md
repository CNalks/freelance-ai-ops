# Workflow — Codex-Assisted Upwork Freelancing

## 三循环架构

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   获客循环       │   │   跟进循环       │   │   优化循环       │
│   (按需/有C时)   │   │   (每天1-2次)    │   │   (每周1次)      │
│                 │   │                 │   │                 │
│  Task 1 找工作   │   │  Task 3 监控竞价  │   │  Task 5 数据分析  │
│      ↓          │   │      ↓          │   │      ↓          │
│  Task 2 提交     │   │  Task 4 客户消息  │   │  Task 6 策略优化  │
│      ↓          │   │      ↓          │   │                 │
│  proposal-tracker│──→│  bid-report     │──→│  analytics      │
│  (写入新条目)    │   │  messages       │   │  (读取全部数据)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
     需要Connects          不需要Connects         不需要Connects
     失败不影响跟进         独立运行               独立运行
```

## Task 文件

| Task | 文件 | 所属循环 | 用途 | 频率 | 自动化程度 |
|------|------|---------|------|------|-----------|
| Task 1 | `task/task-1-find-jobs.md` | 获客 | 搜索 → 去重 → AI评审 → 写proposal | 按需 | 全自动 |
| Task 2 | `task/task-2-apply-jobs.md` | 获客 | 填表单 + 点击Submit提交 | 跟随Task 1 | 全自动（已授权Submit） |
| Task 3 | `task/task-3-monitor-bids.md` | 跟进 | 检查已投proposal竞争状态 | 每天 1-2 次 | 全自动 |
| Task 4 | `task/task-4-client-comms.md` | 跟进 | 检查消息 → 草拟回复 | 每天 1-2 次 | 半自动（你发消息） |
| Task 5 | `task/task-5-analytics.md` | 优化 | 数据采集 → 转化漏斗分析 | 每周 1 次 | 全自动 |
| Task 6 | `task/task-6-optimize.md` | 优化 | Profile/定价/模板优化建议 | 每月 / 按需 | 半自动（你确认修改） |

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
| `cdp-utils.md` | — | 所有 Task | CDP 工具函数参考 |
| `codex-automations.md` | — | — | Codex 自动化任务 prompt |

## 日常操作流程

### 每天（3-5 分钟人工时间）

1. **启动 CDP Chrome** — 确保 `127.0.0.1:9222` 运行且已登录 Upwork
2. **跑 Automation 2（跟进循环）** — 自动完成 Task 3 + Task 4
3. **Codex 完成后：**
   - 查看 `docs/bid-report.md` 了解竞价变化
   - 查看 `docs/messages.md`，审阅草拟的回复 → 在 Upwork 手动发送
   - 如果有面试邀请或 offer，在 Upwork 上处理

### 有 Connects 时（按需）

4. **跑 Automation 1（获客循环）** — Task 1 找工作 + Task 2 提交
5. 提交完毕后，跟进循环会自动追踪新提交的 proposal

### 每周日

6. **跑 Automation 3（优化循环）** — Task 5 数据分析 + 可选 Task 6 优化

### 按需

7. **跑 Automation 4（紧急消息检查）** — 只跑 Task 4 快速检查客户回复

## Codex 自动化配置

详见 `docs/codex-automations.md`，包含每个 automation 的完整 prompt 和调度建议。

## 工具栈

| 工具 | 用途 | 位置 |
|------|------|------|
| Raw CDP Cycle Script | 全部 4 个日常 Task 的 Node.js 实现 | `tools/upwork_raw_cdp_cycle.mjs` |
| CDP Utils | 共享 CDP 工具函数参考 | `docs/cdp-utils.md` |
| Proposal Templates | Proposal 起始模板 | `profile/proposal-templates/` |
| Client Templates | 客户回复模板 | `profile/client-templates/` |

## 安全规则

- Task 2 已授权自动提交 proposal（Submit/Send Proposal）
- Task 4 只草拟回复，不会自动发送——你需要手动发送
- Codex 永远不会点击 Buy Connects 或任何支付/购买按钮
- Codex 永远不会接受合同或 offer
- 如果 CDP 登录过期，Codex 会检测并停止
- 不提交 credentials、.env、screenshots 到 git（.gitignore 已配置）
- 三个循环互相独立，任一崩溃不影响其他循环
