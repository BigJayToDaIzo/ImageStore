import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { loadSettings } from '../../lib/settings';

export const prerender = false;

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const settings = await loadSettings();
    const sourceRoot = settings.sourceRoot;

    const imagePath = url.searchParams.get('path');
    if (!imagePath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent directory traversal
    if (imagePath.includes('..') || imagePath.startsWith('/')) {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const fullPath = join(sourceRoot, imagePath);
    const ext = extname(imagePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    const buffer = await readFile(fullPath);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Failed to serve source image:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
