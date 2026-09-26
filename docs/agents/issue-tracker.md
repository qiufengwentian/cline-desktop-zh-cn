# Issue tracker：GitHub

本仓库的 issue 与 spec 统一存放在 GitHub Issues 中。所有操作一律使用 `gh` CLI。

要求：标题、正文、评论等所有写入 issue 的内容一律使用中文。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，按需用 `jq` 过滤评论，并同时获取 labels。
- **列出 issues**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label` 与 `--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`（中文）。
- **打标签 / 去标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`。
- **关闭**：`gh issue close <number> --comment "..."`（中文说明关闭原因）。

仓库地址从 `git remote -v` 推断；在 clone 内运行 `gh` 会自动识别（当前 origin 为 `qiufengwentian/cline-desktop-zh-cn`，上游声明为 `ExSchwi/cline-desktop-zh-cn`）。

## Pull requests 是否作为需求入口

**PRs as a request surface：no。**（若本仓库把外部 PR 视作功能请求，再改为 `yes`；`/triage` 会读取该标记。）

设为 `yes` 时，PR 走与 issue 相同的标签与状态机，使用 `gh pr` 对等命令：

- **读 PR**：`gh pr view <number> --comments`，diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，仅保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的（去掉 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 与 PR 共用一个编号空间，裸 `#42` 可能是任意一种：先 `gh pr view 42`，失败再 `gh issue view 42`。

## 当 skill 说“发布到 issue tracker”

创建 GitHub issue（中文标题与正文）。

## 当 skill 说“获取相关 ticket”

执行 `gh issue view <number> --comments`。

## Wayfinding 操作

供 `/wayfinder` 使用。**map** 为单个 issue，**child** tickets 为子 issues。

- **Map**：单个打 `wayfinder:map` 标签的 issue，存放 Notes / Decisions-so-far / Fog 正文。`gh issue create --label wayfinder:map`（正文中文）。
- **Child ticket**：以 GitHub sub-issue 链接到 map（走 sub-issues endpoint 的 `gh api`）。若未启用 sub-issues，则在 map 正文维护任务列表，并在 child 正文顶部写 `Part of #<map>`。标签：`wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。认领后 assign 给执行开发者。
- **Blocking**：GitHub **原生 issue dependencies** 为标准 UI 可见表达。用 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边，其中 `<blocker-db-id>` 为 blocker 的数字 **database id**（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，_不是_ `#number` 也不是 `node_id`）。GitHub 上报 `issue_dependencies_summary.blocked_by`（仅统计未关闭的 blocker，即实时门禁）。若 dependencies 不可用，退化为 child 正文顶部一行 `Blocked by: #<n>, #<n>`。当所有 blocker 关闭时 ticket 即为 unblocked。
- **Frontier 查询**：列出 map 的 open children（`gh issue list --state open`，限定到 map 的 sub-issues / 任务列表），去掉存在 open blocker（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中有未关闭 issue）或已有 assignee 的；按 map 顺序取第一个。
- **认领**：`gh issue edit <n> --add-assignee @me`，为本 session 的首次写入。
- **解决**：`gh issue comment <n> --body "<answer>"`（中文），然后 `gh issue close <n>`，再把上下文指针（gist + 链接）追加到 map 的 Decisions-so-far。
