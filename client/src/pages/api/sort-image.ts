import type { APIRoute } from 'astro';
import { mkdir, writeFile, readFile, access, unlink, copyFile, constants } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { findPatientByCase, createPatient } from '../../lib/patients';
import { loadSettings } from '../../lib/settings';

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

function buildDestinationPath(data: SortImageRequest, destinationRoot: string): { dir: string; filename: string } {
  const { caseNumber, consentStatus, consentType, procedureType, surgeryDate, imageType, angle, originalFilename } = data;

  // Get file extension from original, default to .jpg
  const ext = extname(originalFilename).toLowerCase() || '.jpg';

  let basePath: string;
  if (consentStatus === 'consent' && consentType) {
    basePath = join(destinationRoot, 'consent', consentType, procedureType, surgeryDate, caseNumber);
  } else {
    basePath = join(destinationRoot, 'no_consent', procedureType, surgeryDate, caseNumber);
  }

  const filename = `${caseNumber}_${imageType}_${angle}${ext}`;
  return { dir: basePath, filename };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const settings = await loadSettings();
    const destinationRoot = process.env.IMAGESTORE_DEST || settings.destinationRoot;
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

    // Validate fields that become filesystem paths contain no unsafe characters
    const UNSAFE_PATH = /[\/\\:*?"<>|]|\.\./;
    const pathFields = { caseNumber: metadata.caseNumber, procedureType: metadata.procedureType };
    for (const [field, value] of Object.entries(pathFields)) {
      if (UNSAFE_PATH.test(value)) {
        return new Response(JSON.stringify({ error: `Invalid characters in ${field}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate enum fields
    if (!['no_consent', 'consent'].includes(metadata.consentStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid consent status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (metadata.consentType && !['hipaa', 'social_media'].includes(metadata.consentType)) {
      return new Response(JSON.stringify({ error: 'Invalid consent type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['pre_op', '1day_post_op', '3mo_post_op', '6mo_post_op', '9plus_mo_post_op'].includes(metadata.imageType)) {
      return new Response(JSON.stringify({ error: 'Invalid image type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['front', 'back', 'left', 'right'].includes(metadata.angle)) {
      return new Response(JSON.stringify({ error: 'Invalid angle' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate surgery date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.surgeryDate) || isNaN(Date.parse(metadata.surgeryDate))) {
      return new Response(JSON.stringify({ error: 'Invalid surgery date (expected YYYY-MM-DD)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Consent type required when consent is given
    if (metadata.consentStatus === 'consent' && !metadata.consentType) {
      return new Response(JSON.stringify({ error: 'Consent type required when consent is given' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the file - either uploaded from folder picker or referenced by path on disk
    const file = formData.get('file') as File | null;
    const relativeSourcePath = formData.get('relativeSourcePath') as string | null;

    if (!file && !relativeSourcePath) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build destination path
    const { dir, filename } = buildDestinationPath(metadata, destinationRoot);
    const destPath = join(dir, filename);

    // Create directory structure
    await mkdir(dir, { recursive: true });

    // Resolve full source path (relative to sourceRoot)
    const fullSourcePath = relativeSourcePath ? join(settings.sourceRoot, relativeSourcePath) : null;

    // Write file - either from upload or copy from source
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(destPath, buffer);
    } else if (fullSourcePath) {
      await copyFile(fullSourcePath, destPath);
    }

    // Verify write succeeded
    await access(destPath, constants.F_OK);

    // Delete source file after successful copy
    if (fullSourcePath) {
      try {
        await unlink(fullSourcePath);
      } catch (deleteError) {
        console.warn('Could not delete source file:', fullSourcePath, deleteError);
      }
    }

    // File write confirmed - now save patient data if provided
    const firstName = formData.get('firstName') as string | null;
    const lastName = formData.get('lastName') as string | null;
    const dob = formData.get('dob') as string | null;
    const surgeon = formData.get('surgeon') as string | null;

    if (firstName && lastName) {
      const existing = await findPatientByCase(metadata.caseNumber);
      if (!existing) {
        await createPatient({
          case_number: metadata.caseNumber,
          first_name: firstName,
          last_name: lastName,
          dob: dob || '',
          surgery_date: metadata.surgeryDate,
          primary_procedure: metadata.procedureType,
          surgeon: surgeon || ''
        });
      }
    }

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
