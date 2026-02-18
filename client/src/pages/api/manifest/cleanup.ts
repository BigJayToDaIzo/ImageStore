import type { APIRoute } from 'astro';
import { loadManifest, getActiveManifest, deleteManifestFile } from '../../../lib/manifest';
import { batchCleanup } from '../../../lib/sort-image';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    let manifestId: string | undefined;
    try {
      const body = await request.json();
      manifestId = body.manifestId;
    } catch {
      // No body or invalid JSON — fall back to getActiveManifest
    }

    const manifest = manifestId ? await loadManifest(manifestId) : await getActiveManifest();
    if (!manifest) {
      return new Response(JSON.stringify({ error: 'No active manifest' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (manifest.status === 'completed' || manifest.status === 'abandoned') {
      return new Response(JSON.stringify({ error: 'Manifest is already completed or abandoned' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await batchCleanup(manifest);
    await deleteManifestFile(manifest.id);

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
