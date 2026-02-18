import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSettings } from '../../lib/settings';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const customRoot = formData.get('sourceRoot') as string | null;
    const settings = await loadSettings();
    const sourceRoot = customRoot || settings.sourceRoot;

    if (!sourceRoot) {
      return new Response(JSON.stringify({ error: 'No source root configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await mkdir(sourceRoot, { recursive: true });

    const files = formData.getAll('images') as File[];
    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let count = 0;
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const dest = join(sourceRoot, file.name);
      await writeFile(dest, buffer);
      count++;
    }

    return new Response(JSON.stringify({ count, sourceRoot }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to save practice session images:', error);
    return new Response(JSON.stringify({
      error: 'Failed to save practice session images',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
