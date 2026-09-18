import dictionaryPayload from "../generated/dictionary.generated.json" with { type: "json" };
import rules030 from "../rules/0.0.30.json" with { type: "json" };
import rules032 from "../rules/0.0.32.json" with { type: "json" };
import manifest from "../rules/manifest.json" with { type: "json" };

const rules = new Map([
  [rules030.version, rules030],
  [rules032.version, rules032],
]);

function parseVersion(value) { return String(value).split(".").map((part) => Number.parseInt(part, 10) || 0); }
function compareVersions(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0);
  }
  return 0;
}
function isNearbyVersion(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  return a[0] === b[0] && a[1] === b[1] && Math.abs((a[2] ?? 0) - (b[2] ?? 0)) <= (manifest.fallback?.maxVersionDistance ?? 2);
}

export function getResources(version) {
  const versionRules = rules.get(version);
  if (versionRules) return { dictionary: dictionaryPayload, rules: versionRules, mode: "正式支持", ruleVersion: version, warning: "" };
  const candidates = [...rules.entries()]
    .filter(([knownVersion]) => compareVersions(knownVersion, version) <= 0)
    .sort(([left], [right]) => compareVersions(left, right));
  const [ruleVersion, fallbackRules] = candidates.at(-1) ?? [...rules.entries()].sort(([left], [right]) => compareVersions(left, right))[0];
  if (!fallbackRules) throw new Error("没有可用的兼容规则资源");
  if (!isNearbyVersion(version, ruleVersion)) throw new Error(`版本 ${version} 与最近规则 ${ruleVersion} 差异过大，无法安全进入兼容模式`);
  return {
    dictionary: dictionaryPayload,
    rules: fallbackRules,
    mode: "兼容模式（未正式验证）",
    ruleVersion,
    warning: `未找到 ${version} 的精确规则，已尝试使用 ${ruleVersion} 规则；将先进行页面能力探测。`,
  };
}

export function supportedVersions() {
  return [...rules.keys()];
}
