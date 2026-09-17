/**
 * Developer-only generator. It reads the two typed catalogs from a local
 * Cline source checkout and produces the committed runtime DOM dictionary.
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const sourceRoot = process.env.CLINE_SOURCE_ROOT ? resolve(process.env.CLINE_SOURCE_ROOT) : resolve(here, "../../cline-src");
const localeRoot = resolve(sourceRoot, "apps/examples/desktop-app/webview/i18n/locales");
const { enUS } = await import(pathToFileURL(resolve(localeRoot, "en-US.ts")).href);
const { zhCN } = await import(pathToFileURL(resolve(localeRoot, "zh-CN.ts")).href);

const dictionary: Record<string, string> = {};
const skipped: Array<{ key: string; english: string; chinese: string; reason: string }> = [];
for (const [key, english] of Object.entries(enUS)) {
  const chinese = zhCN[key as keyof typeof zhCN];
  if (typeof english !== "string" || typeof chinese !== "string") {
    skipped.push({ key, english: String(english), chinese: String(chinese), reason: "non-string" });
  } else if (/{{.+?}}/.test(english) || /{{.+?}}/.test(chinese)) {
    skipped.push({ key, english, chinese, reason: "interpolation" });
  } else if (dictionary[english] && dictionary[english] !== chinese) {
    skipped.push({ key, english, chinese, reason: "ambiguous-English-source" });
  } else {
    dictionary[english] = chinese;
  }
}

const result = {
  source: {
    sourceRepo: "Cline/Cline",
    sourceVersion: "desktop-v0.0.28",
    sourceCommit: "a7a792af83d6db1317f11475064866e92a4c72e8",
    enUS: "apps/examples/desktop-app/webview/i18n/locales/en-US.ts",
    zhCN: "apps/examples/desktop-app/webview/i18n/locales/zh-CN.ts",
    catalogKeys: Object.keys(enUS).length,
  },
  dictionary,
  skipped,
};
await Bun.write(resolve(here, "../generated/dictionary.generated.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Generated ${Object.keys(dictionary).length} static entries; skipped ${skipped.length}.`);
