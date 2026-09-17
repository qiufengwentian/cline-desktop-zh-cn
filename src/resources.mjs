import dictionaryPayload from "../generated/dictionary.generated.json" with { type: "json" };
import rules030 from "../rules/0.0.30.json" with { type: "json" };

const rules = new Map([[rules030.version, rules030]]);

export function getResources(version) {
  const versionRules = rules.get(version);
  if (!versionRules) {
    throw new Error(`当前 Cline 版本为 ${version}，本补丁暂不支持。请等待适配该版本后再运行。`);
  }
  return { dictionary: dictionaryPayload, rules: versionRules };
}

export function supportedVersions() {
  return [...rules.keys()];
}
