#!/usr/bin/env node

/**
 * Downloads the Node.js binary for the current (or specified) platform
 * and places it in client/src-tauri/resources/node (or node.exe on Windows).
 *
 * Usage:
 *   node scripts/download-node.mjs                    # auto-detect platform
 *   node scripts/download-node.mjs --target x86_64-apple-darwin  # cross-compile
 */

import { execSync } from "node:child_process";
import { createWriteStream, mkdirSync, chmodSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const RESOURCES_DIR = join(PROJECT_ROOT, "client", "src-tauri", "resources");
const NODE_VERSION = "22.15.0";

const PLATFORM_MAP = {
  "x86_64-unknown-linux-gnu": { nodePlatform: "linux", nodeArch: "x64" },
  "aarch64-apple-darwin": { nodePlatform: "darwin", nodeArch: "arm64" },
  "x86_64-apple-darwin": { nodePlatform: "darwin", nodeArch: "x64" },
  "x86_64-pc-windows-msvc": { nodePlatform: "win", nodeArch: "x64" },
};

function detectTarget() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "linux" && arch === "x64") return "x86_64-unknown-linux-gnu";
  if (platform === "darwin" && arch === "arm64") return "aarch64-apple-darwin";
  if (platform === "darwin" && arch === "x64") return "x86_64-apple-darwin";
  if (platform === "win32" && arch === "x64") return "x86_64-pc-windows-msvc";

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function getTarget() {
  const idx = process.argv.indexOf("--target");
  if (idx !== -1 && process.argv[idx + 1]) {
    const target = process.argv[idx + 1];
    if (!PLATFORM_MAP[target]) {
      throw new Error(`Unknown target: ${target}. Valid: ${Object.keys(PLATFORM_MAP).join(", ")}`);
    }
    return target;
  }
  return detectTarget();
}

async function downloadAndExtract(target) {
  const { nodePlatform, nodeArch } = PLATFORM_MAP[target];
  const isWindows = nodePlatform === "win";

  const archiveName = isWindows
    ? `node-v${NODE_VERSION}-${nodePlatform}-${nodeArch}.zip`
    : `node-v${NODE_VERSION}-${nodePlatform}-${nodeArch}.tar.gz`;

  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${archiveName}`;
  const outputName = "node";
  const outputPath = join(RESOURCES_DIR, outputName);

  if (existsSync(outputPath)) {
    console.log(`Already exists: ${outputName}`);
    return;
  }

  mkdirSync(RESOURCES_DIR, { recursive: true });

  console.log(`Downloading Node.js v${NODE_VERSION} for ${target}...`);
  console.log(`  URL: ${url}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  }

  const dirPrefix = `node-v${NODE_VERSION}-${nodePlatform}-${nodeArch}`;
  const tmpPath = join(RESOURCES_DIR, `_tmp_${outputName}`);

  if (isWindows) {
    // Download zip, extract node.exe using PowerShell
    const zipPath = join(RESOURCES_DIR, archiveName);
    const zipStream = createWriteStream(zipPath);
    await pipeline(Readable.fromWeb(resp.body), zipStream);

    // Use system unzip to extract just the node.exe
    const nodeExeEntry = `${dirPrefix}/node.exe`;
    if (process.platform === "win32") {
      execSync(
        `powershell -Command "Add-Type -A System.IO.Compression.FileSystem; $zip = [IO.Compression.ZipFile]::OpenRead('${zipPath}'); $entry = $zip.Entries | Where-Object { $_.FullName -eq '${nodeExeEntry}' }; [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, '${tmpPath}', $true); $zip.Dispose()"`,
        { stdio: "inherit" }
      );
    } else {
      // Cross-compiling for Windows on a Unix host (unlikely but handle it)
      execSync(`unzip -o -j "${zipPath}" "${nodeExeEntry}" -d "${RESOURCES_DIR}"`, { stdio: "inherit" });
      renameSync(join(RESOURCES_DIR, "node.exe"), tmpPath);
    }
    unlinkSync(zipPath);
  } else {
    // Download to temp file, then extract just the node binary
    const tgzPath = join(RESOURCES_DIR, archiveName);
    const tgzStream = createWriteStream(tgzPath);
    await pipeline(Readable.fromWeb(resp.body), tgzStream);

    // Extract just the node binary
    execSync(
      `tar -xzf "${tgzPath}" -C "${RESOURCES_DIR}" --strip-components=2 "${dirPrefix}/bin/node"`,
      { stdio: "inherit" }
    );

    // Move to final name
    renameSync(join(RESOURCES_DIR, "node"), tmpPath);
    unlinkSync(tgzPath);
  }

  // Atomic rename to final location
  renameSync(tmpPath, outputPath);

  if (!isWindows) {
    chmodSync(outputPath, 0o755);
  }

  console.log(`  Saved: ${outputName}`);
}

try {
  const target = getTarget();
  await downloadAndExtract(target);
  console.log("Done.");
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
