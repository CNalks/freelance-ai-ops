# Raw CDP Workflow Learnings

## 执行边界

- 用户说 Chrome CDP 已在 `127.0.0.1:9222` 登录时，直接做任务，不要重新设计登录流程。
- 任务要求 Raw CDP only 时，只通过 Chrome DevTools Protocol 操作页面；不要使用 Playwright、Windows MCP 或其他浏览器控制栈。
- 未授权的 proposal run 只能预填表单并停下；已授权的 Task 2 可以点 Submit / Send Proposal，但仍然不能点 Buy Connects、支付按钮、发送客户消息或接受 offer。
- Task 1 只负责搜索、筛选、写 draft、更新 tracker；Task 2 才处理 proposal 表单；Task 3/4 不做提交、撤回、购买或发消息动作。

## 运行前读取顺序

1. `task/task-*.md`：确认本次任务的动作边界。
2. `docs/proposal-tracker.md`：确认哪些 job 可处理、哪些状态应跳过。
3. `docs/proposal-drafts.md`：读取 cover letter、rate、strategy notes。
4. `docs/job-leads.md`、`docs/pricing.md`：补充 job 背景和定价。
5. `docs/cdp-utils.md` 或 `tools/upwork_raw_cdp_cycle.mjs`：确认当前 CDP helper 的行为。

如果当前 `docs/proposal-drafts.md` 不覆盖 tracker 中的可处理行，先查 Git 历史里的旧 draft，例如 `git show <commit>:docs/proposal-drafts.md`，不要凭空生成不匹配的 proposal。

## Upwork 表单经验

- Proposal 页面可能需要先点 `Apply now` 或 `Submit a proposal` 才出现表单。
- Cover letter 通常可以通过可见 textarea 填写；填完要验证 textarea 非空，而不是只相信 click/evaluate 成功。
- Hourly rate 在已见 UI 中使用 `#step-rate`，并带有 `#fee-rate`、`#receive-step-rate` 自动联动；通用 locator 找不到时先查这三个字段。
- Fixed-price 表单可能出现额外确认，例如 `Yes, I understand`；Submit 之后如果未验证 success，不要标记为 Submitted。
- `This job is no longer available`、`job closed`、`no longer accepting` 应直接标为 closed/skip，不要重试或伪造成功。
- `Buy Connects`、`Purchase Connects`、`insufficient connects` 是硬边界；记录为 `Needs Connects`，不要购买。

## 状态更新规则

- `docs/proposal-tracker.md` 是唯一状态源；每个 job 的最终状态和简短证据都要写回这一张表。
- 可用状态应表达真实结果：`Submitted`、`Pre-filled`、`Needs Connects`、`Job closed`、`Submit failed`、`Fill failed`、`No apply button`。
- 不要把 “点击了 Submit” 等同于提交成功；必须看到 success 文案、跳转结果或明确页面状态。
- Task 3 的 proposal count 只能说明竞争状态，不能证明 boosted bid 被 outbid。

## 已遇到错误和修正

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| `rg --files` 或 `rg` 被拒绝执行 | 当前 Windows 工作区权限限制 | 改用 `Get-ChildItem`、`Select-String` 做文件发现和搜索 |
| Python CDP 脚本打印标题时报 `UnicodeEncodeError` | PowerShell 默认 GBK/输出编码不支持页面文本 | 设置 `PYTHONIOENCODING=utf-8` 后重跑 |
| 通用 hourly rate locator 找不到字段 | Upwork 使用具体 ID | 优先检查 `#step-rate`、`#fee-rate`、`#receive-step-rate` |
| Submit 后没有成功页 | 可能缺 Connects、固定价确认、必填字段或 preferred qualification 警告 | 重新读取页面文本和必填项；不能确认 success 就写 `Submit failed` |
| `/nx/messages/` 或 `/nx/notifications/` 404 | Upwork 路由漂移 | 改查 `/ab/messages/rooms/`、`/ab/notifications/` |

## 用户偏好

- 用户要的是实际证据，不是推断；回答 proposal 状态时要引用 tracker、页面文本或 archive 证据。
- 用户问 Connects 是否退回时，必须区分普通 proposal 和 boosted proposal。
- 用户问自动化问题时，按 run 分开诊断，不要合并成一个笼统结论。
