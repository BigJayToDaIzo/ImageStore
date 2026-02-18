import type { APIRoute } from 'astro';
import { loadManifest, abandonManifest } from '../../../lib/manifest';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { manifestId } = await request.json();

    if (!manifestId) {
      return new Response(JSON.stringify({ error: 'Missing required field: manifestId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const manifest = await loadManifest(manifestId);
    if (!manifest) {
      return new Response(JSON.stringify({ error: 'Manifest not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await abandonManifest(manifest);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/manifest/abandon error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to abandon manifest',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
