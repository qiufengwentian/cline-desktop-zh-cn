import { access, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { waitForTarget } from "../src/injector.mjs";
import { getResources } from "../src/resources.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dictionary = resolve(root, "generated/dictionary.generated.json");
const localConfig = resolve(root, "local.config.json");
async function configuredOfficialExe() {
  if (process.env.CLINE_OFFICIAL_EXE) return resolve(process.env.CLINE_OFFICIAL_EXE);
  try {
    const config = JSON.parse(await readFile(localConfig, "utf8"));
    if (typeof config.officialExe === "string" && config.officialExe.trim()) return resolve(config.officialExe);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const candidate of [
    process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, "Programs", "Cline", "cline-app.exe"),
    process.env.ProgramFiles && resolve(process.env.ProgramFiles, "Cline", "cline-app.exe"),
    process.env["ProgramFiles(x86)"] && resolve(process.env["ProgramFiles(x86)"], "Cline", "cline-app.exe"),
  ].filter(Boolean)) { try { if ((await stat(candidate)).isFile()) return candidate; } catch {} }
  return "";
}
const fail = []; const pass = (message) => console.log(`✓ ${message}`); const problem = (message) => { console.log(`✗ ${message}`); fail.push(message); };
async function exists(path, description) { try { await access(path); pass(description); return true; } catch { problem(`${description}：未找到 ${path}`); return false; } }
async function version(path) { const command = `(Get-Item -LiteralPath '${path.replaceAll("'", "''")}').VersionInfo.FileVersion`; const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { encoding: "utf8", windowsHide: true }); return result.status === 0 ? result.stdout.trim() : ""; }
console.log("Cline 中文版安装自检");
const nodeMajor = Number(process.versions.node.split(".")[0]); nodeMajor >= 22 ? pass(`Node ${process.versions.node}`) : problem(`Node 需要 22+，当前为 ${process.versions.node}`);
const bun = spawnSync("bun", ["--version"], { encoding: "utf8", windowsHide: true }); bun.status === 0 ? pass(`Bun ${bun.stdout.trim()}`) : problem("未找到 Bun；需要用 Bun 重新生成基础字典");
const exe = await configuredOfficialExe(); const hasExe = exe ? await exists(exe, "官方 cline-app.exe") : (problem("未找到官方 cline-app.exe；请设置 CLINE_OFFICIAL_EXE 或 local.config.json"), false); const hasDictionary = await exists(dictionary, "基础字典");
let detectedVersion = "";
if (hasExe) { detectedVersion = await version(exe); detectedVersion ? pass(`检测到 Cline 版本 ${detectedVersion}`) : problem("无法读取 Cline FileVersion"); }
if (hasDictionary) { try { const payload = JSON.parse(await readFile(dictionary, "utf8")); pass(`基础字典有效（${Object.keys(payload.dictionary).length} 条静态映射）`); } catch { problem("基础字典不是有效 JSON；请执行 bun run generate-dictionary"); } }
if (detectedVersion) {
  try {
    const resources = getResources(detectedVersion);
    resources.mode === "正式支持" ? pass(`${detectedVersion} 精确规则`) : pass(`${detectedVersion} 可进入${resources.mode}`);
  } catch (error) { problem(`版本兼容规则：${error.message}`); }
}
const livePort = process.argv.indexOf("--live") >= 0 ? Number(process.argv[process.argv.indexOf("--live") + 1]) : undefined;
if (Number.isInteger(livePort)) { try { const { target } = await waitForTarget(livePort, 5_000); pass(`CDP 可用：${target.type}/${target.title}/${target.url}`); } catch (error) { problem(`CDP 不可用：${error.message}`); } } else { const server = createServer(); await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); }); server.close(); pass("可绑定临时 loopback 端口；实际 CDP 会在由启动器启动后验证"); }
if (fail.length) { console.log(`自检失败：${fail.length} 项。`); process.exitCode = 1; } else console.log("自检通过：可运行 npm run launch。\n安全提示：启动期间会为该官方子进程开放短暂的 127.0.0.1 CDP WebSocket；请只从可信本机运行本项目。");
