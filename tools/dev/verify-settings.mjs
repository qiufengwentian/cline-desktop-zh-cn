import { waitForTarget, evaluate } from "../src/injector.mjs";

const port = Number(process.argv[2]);
if (!Number.isInteger(port)) throw new Error("Usage: node tools/verify-settings.mjs <cdp-port>");
const { target } = await waitForTarget(port, 5_000);
const clickByLabel = (label) => `(() => { const e = [...document.querySelectorAll('[aria-label],button')].find(x => x.getAttribute('aria-label') === ${JSON.stringify(label)} || x.textContent?.trim() === ${JSON.stringify(label)}); if (!e) return false; e.click(); return true; })()`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
console.log(JSON.stringify({ settingsClicked: await evaluate(target.webSocketDebuggerUrl, clickByLabel("设置")) }));
await delay(400);
console.log(JSON.stringify({ generalClicked: await evaluate(target.webSocketDebuggerUrl, clickByLabel("常规")) }));
await delay(400);
console.log(JSON.stringify(await evaluate(target.webSocketDebuggerUrl, `(() => ({
  text: (document.body.innerText || '').split(/\\n+/).map(x => x.trim()).filter(Boolean).filter(x => /设置|常规|语言|Language/.test(x)).slice(0, 30),
  labels: [...document.querySelectorAll('[placeholder],[title],[aria-label]')].map(e => [e.getAttribute('placeholder'), e.getAttribute('title'), e.getAttribute('aria-label')]).flat().filter(x => x && /设置|常规|语言|Language/.test(x)).slice(0, 30)
}))()`), null, 2));
