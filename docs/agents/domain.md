# Domain Docs（中文）

engineering skills 在探索代码库时，应按以下方式消费本仓库的领域文档。

要求：所有领域文档（`CONTEXT.md`、ADR）一律使用中文撰写与更新。

## 探索前先读

- 根目录的 **`CONTEXT.md`**，或
- 若根目录存在 **`CONTEXT-MAP.md`**：它指向每个上下文各自的 `CONTEXT.md`，请阅读与主题相关的每一份。
- **`docs/adr/`**：阅读与即将工作的领域相关的 ADR。多上下文仓库还需检查 `src/<context>/docs/adr/` 中的上下文内决策。

若上述文件不存在，**静默继续**。不要提示缺失，也不要预先建议创建。`/domain-modeling` skill（经由 `/grill-with-docs` 与 `/improve-codebase-architecture` 进入）会在术语或决策真正落定时惰性创建它们（中文撰写）。

## 文件结构

单上下文仓库（大多数仓库，本仓库采用此布局）：

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多上下文仓库（根目录存在 `CONTEXT-MAP.md` 时）：

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 全局决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← 上下文内决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用 glossary 的词汇

当输出中需要命名领域概念（issue 标题、重构提案、假设、测试名）时，请使用 `CONTEXT.md` 中定义的术语。不要漂移到 glossary 明确避免的同义词。

若需要的概念在 glossary 中尚无定义，视为信号：要么是你引入了项目不用的语言（重新考虑），要么是真实缺口（记下来交给 `/domain-modeling`，中文记录）。

## 显式标记 ADR 冲突

若你的输出与已有 ADR 矛盾，请显式指出，而不是静默覆盖：

> _与 ADR-0007（event-sourced orders）冲突，但值得重开讨论，因为……_（中文说明原因）
