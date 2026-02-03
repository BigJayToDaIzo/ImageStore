import type { APIRoute } from 'astro';
import { loadSettings, saveSettings, resetSettings } from '../../lib/settings';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const settings = await loadSettings();
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const updates = await request.json();
    const settings = await saveSettings(updates);
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return new Response(JSON.stringify({
      error: 'Failed to save settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/settings - Factory reset
export const DELETE: APIRoute = async () => {
  try {
    const settings = await resetSettings();
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to reset settings:', error);
    return new Response(JSON.stringify({
      error: 'Failed to reset settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
