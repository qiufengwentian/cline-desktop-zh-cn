import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { waitForTarget, evaluate } from "../../src/injector.mjs";

const port = Number(process.argv[2]);
const here = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(await readFile(resolve(here, "../../generated/dictionary.generated.json"), "utf8"));
const { target } = await waitForTarget(port, 5_000);
const result = await evaluate(target.webSocketDebuggerUrl, `(async () => {
  const entries = ${JSON.stringify(Object.entries(payload.dictionary))};
  const urls = performance.getEntriesByType('resource').map(x => x.name).filter(x => /\\.js(?:\\?|$)/.test(x));
  const source = (await Promise.all(urls.map(async url => { try { return await (await fetch(url)).text(); } catch { return ''; } }))).join('\\n');
  const matches = entries.filter(([english]) => source.includes(english));
  return { loadedJsResources: urls.length, staticDictionaryEntries: entries.length, sourceLiteralMatches: matches.length, sourceLiteralRate: Number((matches.length / entries.length).toFixed(4)), matchedEnglish: matches.slice(0, 80).map(x => x[0]), absentSample: entries.filter(([english]) => !source.includes(english)).slice(0, 80).map(x => x[0]) };
})()`);
console.log(JSON.stringify(result, null, 2));
