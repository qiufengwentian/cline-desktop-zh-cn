import { access, readFile, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const launcher = resolve(root, "src/launcher.mjs");
const compiledExe = resolve(root, "dist/Cline-Desktop-ZH-CN.exe");
const desktop = resolve(process.env.USERPROFILE ?? process.env.HOME ?? root, "Desktop");
const shortcut = resolve(desktop, "Cline 中文版.lnk");
const quoted = (value) => `'${value.replaceAll("'", "''")}'`;
async function configuredOfficialExe() {
  const configured = process.env.CLINE_OFFICIAL_EXE;
  if (configured) {
    const candidate = resolve(configured);
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  try {
    const config = JSON.parse(await readFile(resolve(root, "local.config.json"), "utf8"));
    if (typeof config.officialExe === "string" && config.officialExe.trim()) {
      const candidate = resolve(config.officialExe);
      try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const candidate of [process.env.LOCALAPPDATA && resolve(process.env.LOCALAPPDATA, "Programs", "Cline", "cline-app.exe"), process.env.ProgramFiles && resolve(process.env.ProgramFiles, "Cline", "cline-app.exe"), process.env["ProgramFiles(x86)"] && resolve(process.env["ProgramFiles(x86)"], "Cline", "cline-app.exe")].filter(Boolean)) { try { if ((await stat(candidate)).isFile()) return candidate; } catch {} }
  return "";
}
if (process.argv[2] === "install") {
  const exe = await configuredOfficialExe();
  await access(launcher); await access(compiledExe);
  const iconSource = exe ? `${exe},0` : `${compiledExe},0`;
  const script = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${quoted(shortcut)});$s.TargetPath=${quoted(compiledExe)};$s.Arguments='';$s.WorkingDirectory=${quoted(root)};$s.IconLocation=${quoted(iconSource)};$s.Description='通过本地运行时汉化启动官方 Cline Desktop';$s.Save()`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "创建快捷方式失败");
  if (exe) console.log(`快捷方式图标来源：${exe}`);
  else console.warn("警告：未找到官方 cline-app.exe，快捷方式暂使用补丁 EXE 图标；启动时仍会继续查找官方程序。");
  console.log(`已创建快捷方式：${shortcut}`);
} else if (process.argv[2] === "uninstall") {
  if (process.argv[3]) throw new Error("卸载只删除桌面快捷方式；请手动删除补丁项目目录。");
  try {
    await access(shortcut);
  } catch (error) {
    if (error.code === "ENOENT") { console.log(`快捷方式不存在：${shortcut}`); process.exit(0); }
    throw error;
  }
  const script = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${quoted(shortcut)});[pscustomobject]@{TargetPath=$s.TargetPath;Arguments=$s.Arguments;WorkingDirectory=$s.WorkingDirectory}|ConvertTo-Json -Compress`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "无法读取快捷方式");
  const details = JSON.parse(result.stdout);
  if (resolve(details.TargetPath) !== resolve(compiledExe) || details.Arguments !== "" || resolve(details.WorkingDirectory) !== root) throw new Error(`拒绝删除非本项目创建的快捷方式：${shortcut}`);
  await rm(shortcut); console.log(`已删除快捷方式：${shortcut}`);
} else throw new Error("用法：node tools/shortcut.mjs install | uninstall");
