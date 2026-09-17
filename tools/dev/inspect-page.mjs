import { waitForTarget, evaluate } from "../src/injector.mjs";

const port = Number(process.argv[2]);
if (!Number.isInteger(port)) throw new Error("Usage: node tools/inspect-page.mjs <cdp-port>");
const { target } = await waitForTarget(port, 5_000);
const expression = `(() => ({
  title: document.title,
  language: document.documentElement.lang,
  visibleText: (document.body.innerText || "").split(/\\n+/).map(x => x.trim()).filter(Boolean).slice(0, 80),
  attributes: [...document.querySelectorAll('[placeholder],[title],[aria-label]')].map(e => ({tag:e.tagName, placeholder:e.getAttribute('placeholder'), title:e.getAttribute('title'), ariaLabel:e.getAttribute('aria-label')})).slice(0, 80)
}))()`;
console.log(JSON.stringify(await evaluate(target.webSocketDebuggerUrl, expression), null, 2));
