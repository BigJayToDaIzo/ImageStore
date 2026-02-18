import type { APIRoute } from 'astro';
import { createManifest, getActiveManifest } from '../../../lib/manifest';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { sourcePath } = await request.json();

    if (!sourcePath) {
      return new Response(JSON.stringify({ error: 'Missing required field: sourcePath' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if a manifest already exists for this specific source path
    const existing = await getActiveManifest(undefined, sourcePath);
    if (existing) {
      return new Response(JSON.stringify({ manifest: existing }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const manifest = await createManifest(sourcePath);

    return new Response(JSON.stringify({ manifest }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/manifest/create error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create manifest',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
