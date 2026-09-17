import { spawn } from "node:child_process";
import { access, mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { inject } from "./injector.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const dictionaryPath = resolve(projectRoot, "generated/dictionary.generated.json");
const lockPath = resolve(projectRoot, "artifacts/launcher.lock.json");
const localConfigPath = resolve(projectRoot, "local.config.json");

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
  throw new Error("未找到官方 cline-app.exe。请设置 CLINE_OFFICIAL_EXE，或在项目根目录创建 local.config.json：{\"officialExe\":\"C:\\\\path\\\\to\\\\cline-app.exe\"}。");
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
    const childStopped = await stopChild(reason);
    if (ownsLock) await unlink(lockPath).catch(() => {});
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

// Node delivers SIGINT on Windows consoles. SIGTERM is supported when sent by
// Node or task-management tooling; neither handler targets pre-existing Cline.
process.once("SIGINT", () => handleSignal("SIGINT"));
process.once("SIGTERM", () => handleSignal("SIGTERM"));

async function main() {
  const officialExe = await configuredOfficialExe();
  await access(officialExe);
  await access(dictionaryPath);
  await acquireLock();
  ownsLock = true;
  const version = await fileVersion(officialExe);
  const port = await freePort();
  await writeFile(lockPath, `${JSON.stringify({ pid: process.pid, port, officialExe, version, startedAt: new Date().toISOString() }, null, 2)}\n`);
  child = spawn(officialExe, [], { cwd: dirname(officialExe), detached: false, stdio: "ignore", windowsHide: false, env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-address=127.0.0.1 --remote-debugging-port=${port}` } });
  childExit = new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
  console.log(`已启动官方 Cline ${version}（PID ${child.pid}），临时 CDP 仅监听 127.0.0.1:${port}。`);
  const evidence = await inject(port, dictionaryPath, version);
  console.log(JSON.stringify({ version, ...evidence }, null, 2));
  heartbeat = setInterval(() => inject(port, dictionaryPath, version).catch(() => {}), 2_000);
  await childExit;
}

try {
  await main();
} catch (error) {
  console.error(`启动失败：${error.message}`);
  process.exitCode = 1;
} finally {
  await cleanup("启动器退出");
}
