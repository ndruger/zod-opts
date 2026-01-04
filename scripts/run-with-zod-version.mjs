#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const separatorIndex = args.indexOf("--");
const versionRange = args[0];
if (!versionRange || separatorIndex < 1) {
  console.error(
    "Usage: node scripts/run-with-zod-version.mjs <version-range> -- <command> [args...]"
  );
  process.exit(1);
}
const command = args[separatorIndex + 1];
const commandArgs = args.slice(separatorIndex + 2);
if (!command) {
  console.error("Missing command to execute after --");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const lockPath = path.join(projectRoot, "package-lock.json");
const lockExists = fs.existsSync(lockPath);
const lockBackup = lockExists ? fs.readFileSync(lockPath, "utf8") : undefined;
const zodPackagePath = path.join(
  projectRoot,
  "node_modules",
  "zod",
  "package.json"
);
if (!fs.existsSync(zodPackagePath)) {
  console.error(
    "Cannot find node_modules/zod. Please run npm install before this script."
  );
  process.exit(1);
}
const originalVersion = JSON.parse(
  fs.readFileSync(zodPackagePath, "utf8")
).version;

function runOrThrow(cmd, cmdArgs, label) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function installZod(range) {
  runOrThrow(
    npmCommand,
    ["install", "--no-save", `zod@${range}`],
    `npm install zod@${range}`
  );
}

let exitCode = 0;
try {
  installZod(versionRange);
  const testResult = spawnSync(command, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (testResult.error) {
    throw testResult.error;
  }
  exitCode = typeof testResult.status === "number" ? testResult.status : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = exitCode || 1;
} finally {
  try {
    installZod(originalVersion);
  } catch (restoreError) {
    console.error(
      restoreError instanceof Error
        ? `Failed to restore zod@${originalVersion}: ${restoreError.message}`
        : restoreError
    );
    exitCode = exitCode || 1;
  }
  if (lockExists && typeof lockBackup === "string") {
    fs.writeFileSync(lockPath, lockBackup);
  } else if (!lockExists && fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

process.exit(exitCode);
