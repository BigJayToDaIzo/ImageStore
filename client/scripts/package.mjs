#!/usr/bin/env bun

/**
 * Package ImageStore for distribution using Bun
 * Creates standalone executables for each platform
 */

import { mkdir, rm, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'bun';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'release');
const VERSION = '0.0.1';

// Bun compile targets
const TARGETS = {
  mac: 'bun-darwin-arm64',      // Apple Silicon (most common now)
  'mac-intel': 'bun-darwin-x64', // Intel Mac
  windows: 'bun-windows-x64',
  linux: 'bun-linux-x64',
};

async function createBundle(platform) {
  const target = TARGETS[platform];
  if (!target) {
    console.error(`Unknown platform: ${platform}`);
    console.log(`Available: ${Object.keys(TARGETS).join(', ')}`);
    return null;
  }

  const ext = platform === 'windows' ? '.exe' : '';
  const outputName = `ImageStore${ext}`;
  const bundleDir = join(DIST, `ImageStore-${VERSION}-${platform}`);
  const outputPath = join(bundleDir, outputName);

  console.log(`\nCreating ${platform} bundle (${target})...`);

  // Create bundle directory
  await mkdir(bundleDir, { recursive: true });

  // Copy dist folder (Astro build output)
  await cp(join(ROOT, 'dist'), join(bundleDir, 'dist'), { recursive: true });

  // Compile launcher to standalone executable
  console.log(`  Compiling standalone executable...`);
  try {
    await $`bun build ${join(ROOT, 'launcher.mjs')} --compile --target=${target} --outfile=${outputPath}`.cwd(ROOT);
  } catch (err) {
    console.error(`  Failed to compile for ${platform}:`, err.message);
    console.log(`  Note: Cross-compilation requires running on the target platform or using --target`);
    return null;
  }

  console.log(`  Created: ${outputPath}`);
  return bundleDir;
}

async function createArchive(bundleDir, platform) {
  if (!bundleDir) return;

  const baseName = bundleDir.split('/').pop();
  const parentDir = dirname(bundleDir);

  console.log(`  Creating archive...`);

  try {
    if (platform === 'windows') {
      await $`zip -r ${baseName}.zip ${baseName}`.cwd(parentDir).quiet();
      console.log(`  Archive: ${baseName}.zip`);
    } else {
      await $`tar -czf ${baseName}.tar.gz ${baseName}`.cwd(parentDir).quiet();
      console.log(`  Archive: ${baseName}.tar.gz`);
    }
  } catch (err) {
    console.log(`  Archive creation skipped (zip/tar not available)`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Default to current platform if none specified
  let platforms = args.length > 0 ? args : [detectPlatform()];

  console.log(`
╔═══════════════════════════════════════╗
║   ImageStore Packager v${VERSION}          ║
╚═══════════════════════════════════════╝`);

  // Clean and create release directory
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // Handle 'all' target
  if (platforms.includes('all')) {
    platforms = Object.keys(TARGETS);
  }

  for (const platform of platforms) {
    const bundleDir = await createBundle(platform);
    if (bundleDir) {
      await createArchive(bundleDir, platform);
    }
  }

  console.log(`
Done! Release files are in: release/

To distribute:
  1. Copy the appropriate bundle folder to the target machine
  2. User double-clicks ImageStore (or ImageStore.exe on Windows)
  3. Browser opens automatically to the app

No Node.js or Bun installation required on target machine!
`);
}

function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac' : 'mac-intel';
  } else if (platform === 'win32') {
    return 'windows';
  } else {
    return 'linux';
  }
}

main().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
