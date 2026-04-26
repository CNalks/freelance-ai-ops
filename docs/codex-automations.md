# Codex Automations — 定时/手动触发任务

给 Codex Desktop 创建自动化任务时，复制下面的 prompt。

## Automation 1: 日常获客循环（每天 1 次）

**调度**: 每天 10:00 或你方便的时间
**前提**: Chrome CDP 在 127.0.0.1:9222 已运行并登录 Upwork

**Prompt:**
```
在 C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops 仓库中按顺序执行：

1. 完成 task/task-1-find-jobs.md（搜索、筛选、写 proposal）
2. 完成 task/task-2-apply-jobs.md（CDP 填表单，不要点 Submit）
3. 完成 task/task-3-monitor-bids.md（检查已投 proposal 状态）
4. 完成 task/task-4-client-comms.md（检查消息，草拟回复）

CDP 工具函数参考 docs/cdp-utils.md。
Chrome CDP 已在 127.0.0.1:9222 运行且已登录 Upwork。
所有 git push 到 origin main。

重要约束：
- 不要点击 Submit/Send/Buy 等不可逆按钮
- 不要发送消息给客户
- 不要购买 Connects
- 只用 Raw CDP（禁止 Playwright、禁止 Windows MCP）
```

## Automation 2: 周度数据分析（每周 1 次）

**调度**: 每周日 20:00
**前提**: Chrome CDP 运行中

**Prompt:**
```
在 C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops 仓库中执行：

1. 完成 task/task-5-analytics.md（采集数据、分析转化漏斗）
2. 如果 response rate < 15% 或 profile views 下降，接着执行 task/task-6-optimize.md

CDP 工具函数参考 docs/cdp-utils.md。
Chrome CDP 已在 127.0.0.1:9222 运行且已登录 Upwork。
```

## Automation 3: 紧急消息检查（按需手动）

**调度**: 手动触发，当你想快速检查有没有客户回复时
**前提**: Chrome CDP 运行中

**Prompt:**
```
在 C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops 仓库中执行：
只完成 task/task-4-client-comms.md（检查消息，草拟回复）。

CDP 在 127.0.0.1:9222，已登录。不要发送任何消息。
```

## 使用说明

1. 在 Codex Desktop 中创建 Automation
2. 复制上面的 prompt
3. 设置调度时间
4. 确保在调度时间前启动 CDP Chrome 并登录 Upwork

### 注意事项

- 如果 CDP Chrome 没有运行，Codex 会报错并停止（不会崩溃）
- 如果 Upwork 登录过期，Codex 会检测到并提醒你重新登录
- 所有"发送"类操作都留给你手动完成
- Codex 会自动 git push，你可以在 GitHub 上查看每次的变更
