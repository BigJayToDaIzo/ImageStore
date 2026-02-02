import type { APIRoute } from 'astro';
import { mkdir, writeFile, access, constants } from 'node:fs/promises';
import { join, extname } from 'node:path';

// Base destination directory - configure this to your LAN share path
const DESTINATION_ROOT = process.env.IMAGESORT_DEST || '/tmp/imagesort-output';

export const prerender = false;

interface SortImageRequest {
  caseNumber: string;
  consentStatus: 'no_consent' | 'consent';
  consentType?: 'hipaa' | 'social_media';
  procedureType: string;
  surgeryDate: string;
  imageType: string;
  angle: string;
  originalFilename: string;
}

function buildDestinationPath(data: SortImageRequest): { dir: string; filename: string } {
  const { caseNumber, consentStatus, consentType, procedureType, surgeryDate, imageType, angle, originalFilename } = data;

  // Get file extension from original, default to .jpg
  const ext = extname(originalFilename).toLowerCase() || '.jpg';

  let basePath: string;
  if (consentStatus === 'consent' && consentType) {
    basePath = join(DESTINATION_ROOT, 'consent', consentType, procedureType, surgeryDate, caseNumber);
  } else {
    basePath = join(DESTINATION_ROOT, 'no_consent', procedureType, surgeryDate, caseNumber);
  }

  const filename = `${caseNumber}_${imageType}_${angle}${ext}`;
  return { dir: basePath, filename };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    // Extract metadata
    const metadata: SortImageRequest = {
      caseNumber: formData.get('caseNumber') as string,
      consentStatus: formData.get('consentStatus') as 'no_consent' | 'consent',
      consentType: formData.get('consentType') as 'hipaa' | 'social_media' | undefined,
      procedureType: formData.get('procedureType') as string,
      surgeryDate: formData.get('surgeryDate') as string,
      imageType: formData.get('imageType') as string,
      angle: formData.get('angle') as string,
      originalFilename: formData.get('originalFilename') as string,
    };

    // Validate required fields
    const required = ['caseNumber', 'consentStatus', 'procedureType', 'surgeryDate', 'imageType', 'angle'];
    for (const field of required) {
      if (!metadata[field as keyof SortImageRequest]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Consent type required when consent is given
    if (metadata.consentStatus === 'consent' && !metadata.consentType) {
      return new Response(JSON.stringify({ error: 'Consent type required when consent is given' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the file
    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build destination path
    const { dir, filename } = buildDestinationPath(metadata);
    const destPath = join(dir, filename);

    // Create directory structure
    await mkdir(dir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(destPath, buffer);

    // Verify write succeeded
    await access(destPath, constants.F_OK);

    return new Response(JSON.stringify({
      success: true,
      destination: destPath,
      filename
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sort image error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to sort image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
