import type { APIRoute } from 'astro';
import {
  loadSurgeons,
  createSurgeon,
  updateSurgeon,
  deleteSurgeon,
  importSurgeons
} from '../../lib/surgeons';

export const prerender = false;

// GET /api/surgeons - List all surgeons
export const GET: APIRoute = async () => {
  try {
    const surgeons = await loadSurgeons();
    return new Response(JSON.stringify(surgeons), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to load surgeons:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load surgeons',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/surgeons - Create or import surgeons
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Bulk import
    if (Array.isArray(body)) {
      const result = await importSurgeons(body);
      const surgeons = await loadSurgeons();
      return new Response(JSON.stringify({ ...result, surgeons }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Single create
    const { id, name } = body;
    if (!id || !name) {
      return new Response(JSON.stringify({ error: 'id and name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const surgeon = await createSurgeon(id, name);
    return new Response(JSON.stringify(surgeon), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to create surgeon:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create surgeon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/surgeons - Update a surgeon
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates: Partial<{ name: string }> = {};
    if (name !== undefined) updates.name = name;

    const surgeon = await updateSurgeon(id, updates);
    return new Response(JSON.stringify(surgeon), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to update surgeon:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update surgeon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/surgeons - Delete a surgeon
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deleteSurgeon(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to delete surgeon:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete surgeon',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
