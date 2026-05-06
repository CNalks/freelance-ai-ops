# Automation Postmortems

## automation-1-1：获客循环

配置定位：`C:\Users\a8744\.codex\automations\automation-1-1\automation.toml`

设计意图：

- 在 `freelance-ai-ops` 主仓库内顺序完成 Task 1 和 Task 2。
- Task 2 明确授权点击 Submit / Send Proposal。
- 每次最多处理 10 个 proposal，优先处理 tracker 中 `Pre-filled` 状态。
- 只能使用 Raw CDP；禁止 Playwright、Windows MCP、Buy Connects、客户消息、offer/合同接受。
- Git 只能在主仓库提交并推送到 SSH remote `git@github.com:CNalks/freelance-ai-ops.git`。

复盘结论：

- Task 1 能找到和筛选 job，并写入 leads/drafts/tracker。
- Task 2 没有稳定完成提交：已见结果包括 `Needs Connects`、`Submit failed`、`Fill failed`。
- 至少一个失败路径和 Connects 不足、固定价确认弹窗、Submit 后未验证 success 有关。
- 失败后不能只看 “点击过按钮”，必须回查页面状态并更新 tracker。

下次执行前检查：

- `docs/proposal-tracker.md` 是否有 `Pre-filled` 或 `Ready to submit`。
- `docs/proposal-drafts.md` 是否覆盖这些 tracker 行。
- Upwork 当前 Connects 是否足够；不足时允许筛选和预填，但不能购买 Connects。
- Submit 前必须确认 cover letter、rate/bid、duration、screening questions 全部完成。
- Submit 后必须确认成功页或明确 success 文案。

## automation-2：手动消息检查

配置定位：`C:\Users\a8744\.codex\automations\automation-2\automation.toml`

设计意图：

- 只执行 `task/task-4-client-comms.md`。
- 检查消息和通知，写草稿回复。
- 不发送任何消息，不接受 offer，不点 Buy Connects 或支付按钮。
- 仍然使用 Raw CDP 和主仓库 Git 规则。

复盘结论：

- 已见 run 没有产品层失败：未发现 unread message thread、client conversation 或需要发送的草稿。
- 通知页面能看到 job alerts，但只应作为 Task 1 的可选输入，不要自动联系客户。
- 旧路由 `/nx/messages/`、`/nx/notifications/` 可能返回 404；工作路径是 `/ab/messages/rooms/` 和 `/ab/notifications/`。

下次执行前检查：

- 如果页面 404，先判断是否路由漂移，不要直接判定登录失效。
- `docs/messages.md` 只写 summary、notification notes 和草稿；不要写已发送。
- 即使看到面试/offer 相关文案，也只能提醒用户人工处理。

## 共性 Git 故障

- 两个自动化都遇到过 `.git/index.lock` 创建失败。
- 复盘结论是 `.git` ACL/权限问题，不是普通 stale lock。
- 不要用删除 lock 文件作为默认修复；先确认权限和工作副本来源。
- 不要创建临时 push copy 或把 remote 改成 HTTPS 来绕过问题。

## Connects 和竞价判断

- `Submitted proposals (7)`、`Active proposals (0)` 这类计数只能说明列表状态，不能证明被 boosted bid outbid。
- `Hired (1)` 是更强的失败信号，应标为 likely lost / `Hired (other)`。
- 撤回普通 proposal 通常不能拿回已消耗的 submission Connects。
- Boost 相关 refund 是另一套规则；必须看到实际 boost/auction 证据再判断。
