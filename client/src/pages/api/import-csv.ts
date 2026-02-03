import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const prerender = false;

interface ImportResult {
  imported: number;
  skipped: number;
  items: Array<{ id: string; name: string }>;
}

function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    // Simple CSV parsing - handles basic quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    let { path, type, existingIds } = body as {
      path: string;
      type: 'surgeons' | 'procedures';
      existingIds: string[];
    };

    if (!path) {
      return new Response(JSON.stringify({ error: 'Path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!type || !['surgeons', 'procedures'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Type must be "surgeons" or "procedures"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Expand ~ to home directory
    if (path.startsWith('~')) {
      path = join(homedir(), path.slice(1));
    }

    let content = await readFile(path, 'utf-8');
    // Strip BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'CSV file is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check header row - normalize: lowercase, trim, remove any remaining non-printable chars
    const headers = rows[0].map(h => h.toLowerCase().trim().replace(/[^\x20-\x7E]/g, ''));
    const idIndex = headers.indexOf('id');
    const nameIndex = type === 'surgeons'
      ? headers.indexOf('lastname')
      : headers.indexOf('name');

    if (idIndex === -1) {
      return new Response(JSON.stringify({ error: 'CSV must have an "id" column' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const expectedNameCol = type === 'surgeons' ? 'lastname' : 'name';
    if (nameIndex === -1) {
      return new Response(JSON.stringify({ error: `CSV must have a "${expectedNameCol}" column` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse data rows (skip header)
    const existingSet = new Set(existingIds || []);
    const items: Array<{ id: string; name: string }> = [];
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = row[idIndex];
      const name = row[nameIndex];

      if (!id || !name) {
        skipped++;
        continue;
      }

      // Skip if ID already exists (merge behavior)
      if (existingSet.has(id)) {
        skipped++;
        continue;
      }

      items.push({ id, name });
      existingSet.add(id);
    }

    const result: ImportResult = {
      imported: items.length,
      skipped,
      items,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import CSV error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to import CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
