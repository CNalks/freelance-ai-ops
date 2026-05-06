# Session Learnings

本目录沉淀 Upwork / `freelance-ai-ops` 项目的关键执行经验。这里不是原始日志归档，而是重构前的操作手册：只记录能影响下一次执行质量的约束、错误、修正方式和用户明确偏好。

## 核心结论

- 以 `C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops` 作为唯一主仓库；不要再创建 `freelance-ai-ops-push-*` 临时副本。
- Upwork 浏览器自动化在用户明确要求 Raw CDP 时，只用 `127.0.0.1:9222` 的 Raw CDP；不要切到 Playwright 或 Windows MCP。
- 不可逆动作必须按任务边界执行：未授权时不点 Submit / Send Proposal；任何时候都不点 Buy Connects、支付按钮、发送客户消息或接受 offer。
- `docs/proposal-tracker.md` 是 proposal 状态源；`docs/proposal-drafts.md` 是提交/预填内容源；状态更新必须回写 tracker。
- Upwork 页面和路由会漂移；遇到 404 或字段定位失败时，先检查当前 DOM / 当前可用路径，再判断任务失败。
- Git 问题要区分权限、远端连接和历史副本问题；不要用 HTTPS remote 或临时 push copy 绕过 SSH 规则。

## 文档索引

| 文件 | 主题 | 什么时候看 |
| --- | --- | --- |
| `raw-cdp-workflow.md` | Raw CDP 执行边界、Upwork 表单经验、任务顺序 | 跑 Task 1/2/3/4 或改 CDP 脚本前 |
| `automation-postmortems.md` | 自动化归档复盘、失败原因、用户纠正点 | 诊断 automation 或恢复失败 run 前 |
| `git-and-cleanup.md` | Git 推送、safe.directory、临时文件清理 | 提交、推送、重构前清理时 |

## Session 来源

| 来源 | 主题 | 用途 |
| --- | --- | --- |
| `C:\Users\a8744\.codex\memories\rollout_summaries\2026-04-25T16-26-53-5HTD-upwork_apply_jobs_pre_fill_proposals_tracker_update.md` | 2026-04-26 Raw CDP proposal 预填 | 提炼预填边界、字段定位、tracker 更新、编码错误 |
| `C:\Users\a8744\.codex\memories\rollout_summaries\2026-04-29T17-19-22-Li3A-upwork_archive_review_and_connects_refund_question.md` | 2026-04-30 归档自动化复盘与 Connects 判断 | 提炼 automation 失败原因、路径漂移、Connects/竞价判断 |
| `C:\Users\a8744\.codex\sessions\2026\04\26\rollout-2026-04-26T00-26-53-019dc577-2602-7890-aecf-dc29ff7ec41d.jsonl` | Raw session 原始记录 | 只在需要查原始证据时使用，不全文搬运 |
| `C:\Users\a8744\.codex\sessions\2026\04\30\rollout-2026-04-30T01-19-22-019dda40-a366-79c1-a788-d74b740c6ade.jsonl` | Raw session 原始记录 | 只在需要查原始证据时使用，不全文搬运 |
| `C:\Users\a8744\.codex\automations\automation-1-1\automation.toml` | 获客循环配置 | 确认 Submit 授权、SSH 规则、禁止动作 |
| `C:\Users\a8744\.codex\automations\automation-2\automation.toml` | 手动消息检查配置 | 确认只草拟消息、禁止发送/购买/接受 offer |
| 根目录 `2026-*.md` conversation exports | 早期项目会话导出 | 低优先级背景资料，已被 `.gitignore` 忽略，不纳入提交 |

## 当前重构前状态

- 主仓库保留业务状态文档、task 文件和 `tools/upwork_raw_cdp_cycle.mjs`。
- 可清理内容包括历史 push 副本、Chrome CDP 临时 profile、依赖目录、虚拟环境、截图和 Python 缓存。
- 清理前必须确认要保留的内容已经进入主仓库提交，尤其是 `tools/upwork_raw_cdp_cycle.mjs`。
