import type { APIRoute } from 'astro';
import { getActiveManifest } from '../../../lib/manifest';
import { batchCleanup } from '../../../lib/sort-image';

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const manifest = await getActiveManifest();
    if (!manifest) {
      return new Response(JSON.stringify({ error: 'No active manifest' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (manifest.status !== 'confirming') {
      return new Response(JSON.stringify({ error: 'Manifest must be in "confirming" status to clean up' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await batchCleanup(manifest);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/manifest/cleanup error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to run batch cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
