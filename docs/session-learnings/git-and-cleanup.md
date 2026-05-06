# Git And Cleanup Learnings

## 主仓库规则

- 唯一主仓库：`C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops`。
- 根目录 `C:\Users\a8744\Desktop\for-codex\Upwork` 不是 Git 仓库。
- 不再创建 `freelance-ai-ops-push-*` 副本作为推送 workaround。
- `origin` 应保持 SSH：`git@github.com:CNalks/freelance-ai-ops.git`。
- 如果 SSH 22 端口失败，可以一次性使用 SSH 443 命令尝试，但不要把 remote 改成 HTTPS。

## 提交前检查

1. `git status --short --branch`
2. `git diff --stat`
3. `git diff --check`
4. `git status --ignored --short`
5. 敏感信息搜索，排除 `.git/`、`node_modules/`、`.venv/` 和已忽略 session exports。

要提交的内容：

- 业务状态文档：`docs/*.md`。
- task 规范：`task/task-*.md`。
- 需要保留的工具脚本：`tools/upwork_raw_cdp_cycle.mjs`。
- 结构化经验文档：`docs/session-learnings/*.md`。

不要提交的内容：

- `.env`、credentials、cookie、Chrome profile。
- `node_modules/`、`.venv/`、`__pycache__/`。
- Playwright screenshots、test-results、playwright-report。
- 根目录 `2026-*.md` conversation exports。

## 已见 Git 问题

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| 当前目录 `git status` 报不是 Git 仓库 | Git 仓库在 `freelance-ai-ops` 子目录 | 进入主仓库或使用 `git -C freelance-ai-ops ...` |
| `safe.directory` / dubious ownership | 历史 push 副本属于不同 Windows 用户/SID | 只读检查可用一次性 `-c safe.directory=...`；不要把副本当主仓库 |
| `.git/index.lock` permission denied | `.git` ACL 权限问题 | 先确认权限边界；不要误判为 stale lock |
| SSH 22 端口连接关闭 | 网络/端口限制 | 先报告真实错误；必要时用一次性 SSH 443 命令，不改 remote |
| 历史 push 副本和主仓库无 merge-base | 副本不是可靠主线 | 只提取明确需要的文件/经验，不直接推送副本 |

## 清理规则

清理前必须确认目标绝对路径在 `C:\Users\a8744\Desktop\for-codex\Upwork` 内，且不是主仓库根目录。

可删除：

- `C:\Users\a8744\Desktop\for-codex\Upwork\freelance-ai-ops-push-*`
- `C:\Users\a8744\Desktop\for-codex\Upwork\automation\chrome-cdp-temp`
- `freelance-ai-ops\automation\upwork-browser\node_modules`
- `freelance-ai-ops\automation\upwork-browser\screenshots`
- `freelance-ai-ops\portfolio\demo-fastapi-llm\.venv`
- `freelance-ai-ops\portfolio\demo-rag-chatbot\.venv`
- repo 内所有 `__pycache__`

保留：

- `C:\Users\a8744\Desktop\for-codex\Upwork\start-upwork-cdp.ps1`
- `C:\Users\a8744\Desktop\for-codex\Upwork\automation\upwork-cdp-scraper`
- `freelance-ai-ops\tools\upwork_raw_cdp_cycle.mjs`
- 主仓库内已提交的 docs/task/profile/portfolio/project 源文件。
