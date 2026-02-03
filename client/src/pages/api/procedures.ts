import type { APIRoute } from 'astro';
import {
  loadProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  importProcedures
} from '../../lib/procedures';

export const prerender = false;

// GET /api/procedures - List all procedures
export const GET: APIRoute = async () => {
  try {
    const procedures = await loadProcedures();
    return new Response(JSON.stringify(procedures), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to load procedures:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load procedures',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/procedures - Create or import procedures
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Bulk import
    if (Array.isArray(body)) {
      const result = await importProcedures(body);
      const procedures = await loadProcedures();
      return new Response(JSON.stringify({ ...result, procedures }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Single create
    const { id, name, favorite } = body;
    if (!id || !name) {
      return new Response(JSON.stringify({ error: 'id and name are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const procedure = await createProcedure(id, name, favorite ?? false);
    return new Response(JSON.stringify(procedure), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to create procedure:', error);
    return new Response(JSON.stringify({
      error: 'Failed to create procedure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/procedures - Update a procedure
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, name, favorite } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates: Partial<{ name: string; favorite: boolean }> = {};
    if (name !== undefined) updates.name = name;
    if (favorite !== undefined) updates.favorite = favorite;

    const procedure = await updateProcedure(id, updates);
    return new Response(JSON.stringify(procedure), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to update procedure:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update procedure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/procedures - Delete a procedure
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deleteProcedure(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to delete procedure:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete procedure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
