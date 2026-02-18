import type { APIRoute } from 'astro';
import { getPendingManifests } from '../../../lib/manifest';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const manifests = await getPendingManifests();

    return new Response(JSON.stringify({ manifests }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET /api/manifest/pending error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load pending manifests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
