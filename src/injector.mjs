const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJson(url) { const response = await fetch(url); if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`); return response.json(); }
function chooseTarget(targets) { const pages = targets.filter((target) => target.type === "page" && target.webSocketDebuggerUrl && target.url !== "about:blank"); return pages.find((target) => /cline|tauri|localhost/i.test(`${target.title} ${target.url}`)) ?? pages[0]; }
export function evaluate(webSocketDebuggerUrl, expression) { return new Promise((resolve, reject) => { const socket = new WebSocket(webSocketDebuggerUrl); const finish = (value, error) => { clearTimeout(timer); socket.close(); error ? reject(error) : resolve(value); }; const timer = setTimeout(() => finish(undefined, new Error("CDP Runtime.evaluate 超时")), 10_000); socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }))); socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.id === 1) finish(message.result?.result?.value, message.error || message.result?.exceptionDetails ? new Error(JSON.stringify(message.error ?? message.result.exceptionDetails)) : undefined); }); socket.addEventListener("error", () => finish(undefined, new Error("CDP WebSocket 连接失败"))); }); }
export async function waitForTarget(port, timeoutMs = 30_000) { const deadline = Date.now() + timeoutMs; let lastError; while (Date.now() < deadline) { try { const targets = await getJson(`http://127.0.0.1:${port}/json/list`); const target = chooseTarget(targets); if (target) return { target, targets }; } catch (error) { lastError = error; } await sleep(250); } throw new Error(`端口 ${port} 上未发现 WebView2 CDP 页面：${lastError?.message ?? "未知错误"}`); }
const capabilityProbe = `(() => { const body = document.body; const text = body?.innerText?.trim() ?? ""; const interactive = document.querySelectorAll("button,input,textarea,[role=button]").length; const attributes = document.querySelectorAll("[placeholder],[title],[aria-label]").length; return { ready: Boolean(body && (text || interactive || attributes)), body: Boolean(body), interactive, attributes, title: document.title, url: location.href }; })()`;
const observerProbe = `(() => ({ observer: Boolean(window.__clineZhObserver), document: Boolean(document.documentElement), body: Boolean(document.body) }))()`;
async function waitForCapability(target, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs; let lastCapability;
  while (Date.now() < deadline) {
    try {
      lastCapability = await evaluate(target.webSocketDebuggerUrl, capabilityProbe);
      if (lastCapability?.ready) return lastCapability;
    } catch (error) { lastCapability = { error: error.message }; }
    await sleep(250);
  }
  throw new Error(`兼容探测失败：页面基础 DOM 未在 ${timeoutMs / 1000} 秒内就绪（${JSON.stringify(lastCapability)}）`);
}
export async function inject(port, resources) {
  const { dictionary: payload, rules } = resources; const { target, targets } = await waitForTarget(port);
  if (target.type !== "page" || !target.webSocketDebuggerUrl) throw new Error(`CDP target 类型不受支持：${target.type}`);
  const capability = await waitForCapability(target);
  const expression = `(() => { const dictionary=Object.assign({},${JSON.stringify(payload.dictionary)},${JSON.stringify(rules.static ?? {})});const attributes=["placeholder","title","aria-label"];const patterns=${JSON.stringify(rules.patterns ?? [])}.map(({source,flags,replace})=>[new RegExp(source,flags),replace]);let changed=0;const translate=value=>{const trimmed=value.trim();if(dictionary[trimmed])return dictionary[trimmed];for(const [pattern,replace] of patterns)if(pattern.test(value))return value.replace(pattern,replace);return value};const visit=root=>{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let node;(node=walker.nextNode());){const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/i.test(parent.tagName))continue;const next=translate(node.nodeValue);if(next!==node.nodeValue){node.nodeValue=next;changed++}}const elements=root.querySelectorAll?root.querySelectorAll('[placeholder],[title],[aria-label]'):[];for(const element of elements)for(const attribute of attributes){const before=element.getAttribute(attribute);if(before==null)continue;const next=translate(before);if(next!==before){element.setAttribute(attribute,next);changed++}}};visit(document.body);if(!window.__clineZhObserver){let scheduled=false;const flush=()=>{scheduled=false;visit(document.body)};window.__clineZhObserver=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(flush)}});window.__clineZhObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes})}document.documentElement.lang="zh-CN";const samples=[...document.querySelectorAll("body *")].filter(element=>element.children.length===0&&/[\\u4e00-\\u9fff]/.test(element.textContent||"")).map(element=>(element.textContent||"").trim()).filter(Boolean).slice(0,12);return {changed,dictionaryEntries:Object.keys(dictionary).length,overrideStaticEntries:Object.keys(${JSON.stringify(rules.static ?? {})}).length,patternRules:patterns.length,title:document.title,observer:Boolean(window.__clineZhObserver),samples}})()`;
  const result = await evaluate(target.webSocketDebuggerUrl, expression); if (!result?.observer) throw new Error("基础注入失败：MutationObserver 未建立");
  const observer = await evaluate(target.webSocketDebuggerUrl, observerProbe); if (!observer?.observer) throw new Error("兼容探测失败：MutationObserver 心跳检查未通过");
  return { target: { id: target.id, title: target.title, url: target.url, type: target.type }, allTargets: targets.map(({ id, type, title, url }) => ({ id, type, title, url })), capability, result, observer };
}

export async function checkObserver(port) {
  const { target } = await waitForTarget(port, 2_000);
  return evaluate(target.webSocketDebuggerUrl, observerProbe);
}
