import { mkdir, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "dist");
const output = resolve(outputDir, "Cline-Desktop-ZH-CN.exe");

await mkdir(outputDir, { recursive: true });
await rm(output, { force: true });

const child = spawn("bun", ["build", "--compile", "--windows-hide-console", "src/launcher.mjs", "--outfile", output], { cwd: root, stdio: "inherit", windowsHide: false });
const exitCode = await new Promise((resolveExit) => child.once("exit", (code) => resolveExit(code ?? 1)));
if (exitCode !== 0) process.exit(exitCode);

const bytes = (await stat(output)).size;
console.log(`已生成 Windows 用户版：${output}`);
console.log(`文件大小：${(bytes / 1024 / 1024).toFixed(2)} MiB`);
console.log("资源已编译进 EXE；可选旁置 local.config.json 指定 officialExe。");
