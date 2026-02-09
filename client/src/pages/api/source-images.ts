import type { APIRoute } from 'astro';
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { loadSettings } from '../../lib/settings';

export const prerender = false;

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const customPath = url.searchParams.get('path');
    const settings = await loadSettings();
    const sourceRoot = customPath || settings.sourceRoot;

    if (!sourceRoot) {
      return new Response(JSON.stringify({ images: [], sourceRoot: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read directory contents
    let entries;
    try {
      entries = await readdir(sourceRoot, { withFileTypes: true });
    } catch {
      // Directory doesn't exist or isn't accessible
      return new Response(JSON.stringify({ images: [], sourceRoot, error: 'Source folder not accessible' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filter for image files
    const images = [];
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          const filePath = join(sourceRoot, entry.name);
          const fileStat = await stat(filePath);
          images.push({
            name: entry.name,
            path: entry.name, // Relative path for the API
            size: fileStat.size,
            modified: fileStat.mtime.toISOString()
          });
        }
      }
    }

    // Sort by name
    images.sort((a, b) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ images, sourceRoot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to list source images:', error);
    return new Response(JSON.stringify({
      error: 'Failed to list source images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
