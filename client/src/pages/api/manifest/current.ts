import type { APIRoute } from 'astro';
import { getActiveManifest } from '../../../lib/manifest';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const manifest = await getActiveManifest();

    return new Response(JSON.stringify({ manifest: manifest ?? null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET /api/manifest/current error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load active manifest',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
