import type { APIRoute } from 'astro';
import {
  loadPatients,
  findPatientByCase,
  searchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  type PatientInput,
  type PatientUpdate
} from '../../lib/patients';

export const prerender = false;

// GET /api/patients - List all or search patients
// Query params: ?search=query
export const GET: APIRoute = async ({ url }) => {
  try {
    const searchQuery = url.searchParams.get('search') || '';
    const patients = await searchPatients(searchQuery);

    return new Response(JSON.stringify(patients), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GET /api/patients error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load patients',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/patients - Create new patient
// Body: { case_number, first_name, last_name, dob }
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as PatientInput;

    // Validate required fields
    const required = ['case_number', 'first_name', 'last_name', 'dob'] as const;
    for (const field of required) {
      if (!body[field]) {
        return new Response(JSON.stringify({
          error: `Missing required field: ${field}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const patient = await createPatient(body);

    return new Response(JSON.stringify(patient), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST /api/patients error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('already exists') ? 409 : 500;

    return new Response(JSON.stringify({
      error: message.includes('already exists') ? message : 'Failed to create patient',
      details: message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/patients - Update patient
// Body: { case_number, first_name?, last_name?, dob? }
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { case_number: string } & PatientUpdate;

    if (!body.case_number) {
      return new Response(JSON.stringify({
        error: 'Missing required field: case_number'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { case_number, ...updates } = body;
    const patient = await updatePatient(case_number, updates);

    return new Response(JSON.stringify(patient), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('PUT /api/patients error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;

    return new Response(JSON.stringify({
      error: message.includes('not found') ? message : 'Failed to update patient',
      details: message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/patients - Delete patient
// Query param: ?case_number=X
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const caseNumber = url.searchParams.get('case_number');

    if (!caseNumber) {
      return new Response(JSON.stringify({
        error: 'Missing required query param: case_number'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await deletePatient(caseNumber);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('DELETE /api/patients error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;

    return new Response(JSON.stringify({
      error: message.includes('not found') ? message : 'Failed to delete patient',
      details: message
    }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
