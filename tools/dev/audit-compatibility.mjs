import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { waitForTarget, evaluate } from "../src/injector.mjs";

const port = Number(process.argv[2]);
const here = dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(await readFile(resolve(here, "../generated/dictionary.generated.json"), "utf8"));
const { target } = await waitForTarget(port, 5_000);
const result = await evaluate(target.webSocketDebuggerUrl, `(() => {
  const dictionary = ${JSON.stringify(payload.dictionary)};
  const lines = [...new Set((document.body.innerText || "").split(/\\n+/).map(x => x.trim()).filter(Boolean))];
  const matches = lines.filter(x => dictionary[x]);
  return { visibleUniqueLines: lines.length, directMatches: matches.length, directMatchRate: lines.length ? Number((matches.length / lines.length).toFixed(4)) : 0, matches, unmatched: lines.filter(x => !dictionary[x]).slice(0, 100) };
})()`);
console.log(JSON.stringify(result, null, 2));
