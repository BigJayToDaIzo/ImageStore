import type { APIRoute } from 'astro';
import { readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

export const prerender = false;

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    let requestedPath = url.searchParams.get('path') || homedir();

    // Expand ~ to home directory
    if (requestedPath.startsWith('~')) {
      requestedPath = join(homedir(), requestedPath.slice(1));
    }

    // Get info about the requested path
    let targetPath = requestedPath;
    let isFile = false;

    try {
      const pathStat = await stat(requestedPath);
      isFile = pathStat.isFile();
      if (isFile) {
        // If it's a file, list the parent directory
        targetPath = dirname(requestedPath);
      }
    } catch {
      // Path doesn't exist, try parent directory
      targetPath = dirname(requestedPath);
    }

    const entries = await readdir(targetPath, { withFileTypes: true });

    const files: FileEntry[] = entries
      .filter(entry => !entry.name.startsWith('.')) // Hide dotfiles
      .map(entry => ({
        name: entry.name,
        path: join(targetPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }))
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    return new Response(JSON.stringify({
      currentPath: targetPath,
      parentPath: dirname(targetPath),
      selectedFile: isFile ? requestedPath : null,
      entries: files,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Browse files error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to browse directory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
