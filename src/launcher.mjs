import { spawn } from "node:child_process";
import { access, appendFile, mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";
import { inject } from "./injector.mjs";
import { getResources } from "./resources.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const standalone = basename(process.execPath).toLowerCase() === "cline-desktop-zh-cn.exe";
const runtimeRoot = standalone ? dirname(process.execPath) : projectRoot;
const lockPath = resolve(runtimeRoot, "artifacts/launcher.lock.json");
const debugLogPath = resolve(runtimeRoot, "artifacts/launcher.debug.log");
const localConfigPath = resolve(runtimeRoot, "local.config.json");
const debugEnabled = process.argv.includes("--debug") || process.env.CLINE_ZH_DEBUG === "1";
const versionOverride = process.argv.find((argument) => argument.startsWith("--version-override="))?.slice("--version-override=".length);
let phase = "初始化";

async function debug(event, details = {}) {
  if (!debugEnabled) return;
  await mkdir(dirname(debugLogPath), { recursive: true });
  await appendFile(debugLogPath, `${JSON.stringify({ at: new Date().toISOString(), event, phase, pid: process.pid, ...details })}\n`);
}

async function configuredOfficialExe() {
  if (process.env.CLINE_OFFICIAL_EXE) return resolve(process.env.CLINE_OFFICIAL_EXE);
  try {
    const config = JSON.parse(await readFile(localConfigPath, "utf8"));
    if (typeof config.officialExe === "string" && config.officialExe.trim()) return resolve(config.officialExe);
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`无法读取 local.config.json：${error.message}`);
  }
  const candidates = [
    process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, "Programs", "Cline", "cline-app.exe"),
    process.env.ProgramFiles && resolve(process.env.ProgramFiles, "Cline", "cline-app.exe"),
    process.env["ProgramFiles(x86)"] && resolve(process.env["ProgramFiles(x86)"], "Cline", "cline-app.exe"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  throw new Error(`未找到官方 Cline（cline-app.exe）。请安装官方 Cline，或在 ${localConfigPath} 中填写：{"officialExe":"C:\\\\path\\\\to\\\\cline-app.exe"}。`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function fileVersion(path) {
  const escaped = path.replaceAll("'", "''");
  const ps = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Item -LiteralPath '${escaped}').VersionInfo.FileVersion`], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  let output = "";
  for await (const chunk of ps.stdout) output += chunk;
  const exitCode = await new Promise((resolve) => ps.once("exit", resolve));
  if (exitCode !== 0 || !output.trim()) throw new Error("无法读取 cline-app.exe 的 FileVersion");
  return output.trim();
}

async function acquireLock() {
  await mkdir(dirname(lockPath), { recursive: true });
  try { const handle = await open(lockPath, "wx"); await handle.close(); return; } catch (error) { if (error.code !== "EEXIST") throw error; }
  try {
    const previous = JSON.parse(await readFile(lockPath, "utf8"));
    process.kill(previous.pid, 0);
    throw new Error(`已有 Cline 中文版启动器在运行（PID ${previous.pid}，CDP ${previous.port ?? "未知"}）。请关闭它或退出官方 Cline 后重试。`);
  } catch (error) {
    if (error.message?.startsWith("已有 Cline")) throw error;
    await unlink(lockPath).catch(() => {});
    return acquireLock();
  }
}

let heartbeat;
let ownsLock = false;
let child;
let childExit;
let stopping;
let detectedVersion = "未检测到";

function waitForChildExit(timeoutMs = 5_000) {
  if (!childExit) return Promise.resolve(true);
  return Promise.race([
    childExit.then(() => true, () => true),
    new Promise((resolve) => { const timer = setTimeout(() => resolve(false), timeoutMs); timer.unref(); }),
  ]);
}

async function stopChild(reason) {
  if (!child || child.exitCode !== null) return true;
  console.error(`正在终止本次启动的官方 Cline 子进程（${reason}，PID ${child.pid}）。`);
  try { child.kill(); } catch (error) { console.error(`无法终止本次官方 Cline 子进程：${error.message}`); return false; }
  const exited = await waitForChildExit();
  if (!exited) console.error(`官方 Cline 子进程在 5 秒内未退出（PID ${child.pid}）。`);
  return exited;
}

async function cleanup(reason) {
  if (stopping) return stopping;
  stopping = (async () => {
    if (heartbeat) clearInterval(heartbeat);
    await debug("cleanup", { reason, childPid: child?.pid ?? null, childExitCode: child?.exitCode ?? null });
    const childStopped = await stopChild(reason);
    if (ownsLock) await unlink(lockPath).catch(() => {});
    await debug("cleanup-complete", { childStopped, lockRemoved: ownsLock });
    return childStopped;
  })();
  return stopping;
}

function handleSignal(signal) {
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  cleanup(signal).then(() => process.exit()).catch((error) => {
    console.error(`中断清理失败：${error.message}`);
    process.exit();
  });
}

async function showFatalError(message) {
  if (!standalone || process.platform !== "win32") return;
  const escaped = message.replaceAll("'", "''");
  const script = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('${escaped}', 'Cline 中文版启动失败', 'OK', 'Error') | Out-Null`;
  await new Promise((resolve) => {
    const dialog = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "ignore", windowsHide: false });
    dialog.once("close", resolve);
    dialog.once("error", resolve);
  });
}

// Node delivers SIGINT on Windows consoles. SIGTERM is supported when sent by
// Node or task-management tooling; neither handler targets pre-existing Cline.
process.once("SIGINT", () => handleSignal("SIGINT"));
process.once("SIGTERM", () => handleSignal("SIGTERM"));

async function main() {
  phase = "查找官方 Cline";
  const officialExe = await configuredOfficialExe();
  await access(officialExe);
  await debug("official-exe", { officialExe });
  phase = "获取版本";
  await acquireLock();
  ownsLock = true;
  const detectedFileVersion = await fileVersion(officialExe);
  const version = versionOverride || detectedFileVersion;
  detectedVersion = version;
  await debug("version", { detectedFileVersion, version, versionOverride: versionOverride ?? null });
  phase = "选择规则";
  const resources = getResources(version);
  if (resources.warning) { console.warn(resources.warning); await debug("compatibility-warning", { warning: resources.warning, mode: resources.mode, ruleVersion: resources.ruleVersion }); }
  phase = "建立临时 CDP";
  const port = await freePort();
  await writeFile(lockPath, `${JSON.stringify({ pid: process.pid, port, officialExe, version, detectedFileVersion, mode: resources.mode, ruleVersion: resources.ruleVersion, startedAt: new Date().toISOString() }, null, 2)}\n`);
  phase = "启动官方 Cline";
  child = spawn(officialExe, [], { cwd: dirname(officialExe), detached: false, stdio: "ignore", windowsHide: false, env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}` } });
  childExit = new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
  child.once("exit", (code, signal) => { debug("official-exit", { childPid: child.pid, code, signal }).catch(() => {}); });
  console.log(`已启动官方 Cline ${version}（PID ${child.pid}），临时 CDP 仅监听 127.0.0.1:${port}。`);
  phase = "等待页面并执行兼容探测";
  const evidence = await inject(port, resources);
  console.log(JSON.stringify({ version, mode: resources.mode, ruleVersion: resources.ruleVersion, ...evidence }, null, 2));
  await debug("injected", { version, mode: resources.mode, ruleVersion: resources.ruleVersion, target: evidence.target, capability: evidence.capability, result: evidence.result });
  heartbeat = setInterval(() => inject(port, resources).then((result) => debug("heartbeat", { observer: result.observer, changed: result.result?.changed })).catch((error) => debug("heartbeat-failed", { message: error.message })), 2_000);
  await childExit;
}

try {
  await main();
} catch (error) {
  await debug("fatal", { message: error.message, detectedVersion });
  const message = `启动失败\n\n检测到的 Cline 版本：${detectedVersion}\n失败阶段：${phase}\n原因：${error.message}\n\n请查看 README、docs/COMPATIBILITY.md，或提交 Issue：https://github.com/ExSchwi/cline-desktop-zh-cn/issues`;
  console.error(message);
  await showFatalError(message);
  process.exitCode = 1;
} finally {
  await cleanup("启动器退出");
}
