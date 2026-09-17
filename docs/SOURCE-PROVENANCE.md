# 翻译来源与生成

`generated/dictionary.generated.json` 是运行时必需文件，来自 [Cline/Cline](https://github.com/cline/cline) Desktop 的 typed `en-US` 与 `zh-CN` catalog。当前生成基线为 Desktop `0.0.28`，commit `a7a792af83d6db1317f11475064866e92a4c72e8`。

字典只包含无插值且英文源字符串不歧义的静态英中对；插值和歧义项会被记录为跳过，并按需通过版本规则人工处理。

上游 Cline 源码以 Apache-2.0 提供。本仓库的 [LICENSE](../LICENSE) 与 [NOTICE](../NOTICE) 说明适用于所含派生字典的许可和来源。生成器仅供维护者更新字典：将 Cline checkout 放在相邻 `../cline-src`，或设置 `CLINE_SOURCE_ROOT`，然后运行 `bun run generate-dictionary`。
