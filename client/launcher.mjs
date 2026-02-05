#!/usr/bin/env bun

/**
 * ImageStore Launcher
 * Starts the Astro server and opens the browser
 */

import { $ } from 'bun';

const PORT = process.env.PORT || 4321;
const HOST = process.env.HOST || 'localhost';
const URL = `http://${HOST}:${PORT}`;

// Open URL in default browser (cross-platform)
async function openBrowser(url) {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      await $`open ${url}`.quiet();
    } else if (platform === 'win32') {
      await $`cmd /c start "" "${url}"`.quiet();
    } else {
      // Linux - try xdg-open first
      await $`xdg-open ${url}`.quiet();
    }
  } catch {
    console.log(`\n  Open this URL in your browser: ${url}\n`);
  }
}

// Wait for server to respond
async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(url, { method: 'HEAD' });
      return true;
    } catch {
      await Bun.sleep(300);
    }
  }
  return false;
}

async function main() {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║         ImageStore v0.0.1             ║
  ║   HIPAA-Compliant Image Management    ║
  ╚═══════════════════════════════════════╝
  `);

  console.log('  Starting server...');

  try {
    // Import and start the Astro server (auto-starts in standalone mode)
    await import('./dist/server/entry.mjs');

    // Wait for server to be ready
    const ready = await waitForServer(URL);

    if (ready) {
      console.log(`  Server running at ${URL}`);
      console.log('  Opening browser...\n');
      await openBrowser(URL);
      console.log('  Press Ctrl+C to stop the server.\n');
    } else {
      console.error('  Server failed to start.');
      process.exit(1);
    }

  } catch (err) {
    console.error('  Failed to start:', err.message);
    process.exit(1);
  }
}

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('\n  Shutting down ImageStore...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n  Shutting down ImageStore...');
  process.exit(0);
});

main();
