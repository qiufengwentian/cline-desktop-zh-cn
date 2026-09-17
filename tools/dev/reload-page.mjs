import { waitForTarget, evaluate } from "../src/injector.mjs";
const port = Number(process.argv[2]);
const { target } = await waitForTarget(port, 5_000);
await evaluate(target.webSocketDebuggerUrl, "location.reload(); 'reload requested'");
console.log("Reload requested; run audit before reinjecting.");
