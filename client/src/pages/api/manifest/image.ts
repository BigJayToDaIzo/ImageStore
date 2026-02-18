import type { APIRoute } from 'astro';
import { loadManifest, getActiveManifest, updateImageStatus } from '../../../lib/manifest';

export const prerender = false;

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { manifestId, filename, status, skipReason } = await request.json();

    if (!filename || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields: filename, status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['skipped', 'pending'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Status must be "skipped" or "pending"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const manifest = manifestId ? await loadManifest(manifestId) : await getActiveManifest();
    if (!manifest) {
      return new Response(JSON.stringify({ error: 'No active manifest' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updated = await updateImageStatus(manifest, filename, {
      status,
      skipReason: status === 'skipped' ? skipReason : undefined,
    });

    return new Response(JSON.stringify({ manifest: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('PATCH /api/manifest/image error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found in manifest') ? 404 : 500;

    return new Response(JSON.stringify({
      error: message.includes('not found') ? message : 'Failed to update image status',
      details: message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
