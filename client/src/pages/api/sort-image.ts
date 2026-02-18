import type { APIRoute } from 'astro';
import { join } from 'node:path';
import { access, writeFile, unlink, constants } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { loadSettings } from '../../lib/settings';
import { loadManifest, getActiveManifest } from '../../lib/manifest';
import { sortImage } from '../../lib/sort-image';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const settings = await loadSettings();
    const destinationRoot = process.env.IMAGESTORE_DEST || settings.destinationRoot;
    const formData = await request.formData();

    // Extract metadata
    const metadata = {
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
    const required = ['caseNumber', 'consentStatus', 'procedureType', 'surgeryDate', 'imageType', 'angle'] as const;
    for (const field of required) {
      if (!metadata[field]) {
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

    // Resolve source path
    const customSourceRoot = formData.get('sourceRoot') as string | null;
    const sourceRoot = customSourceRoot || settings.sourceRoot;
    let sourcePath: string;
    let tempFilePath: string | null = null;

    if (relativeSourcePath) {
      sourcePath = join(sourceRoot, relativeSourcePath);
      await access(sourcePath, constants.R_OK);
    } else if (file) {
      // File upload: write to temp file, use as source
      tempFilePath = join(tmpdir(), `imagestore-upload-${Date.now()}-${file.name}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(tempFilePath, buffer);
      sourcePath = tempFilePath;
    } else {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get manifest by ID if provided, otherwise fall back to active manifest
    const formManifestId = formData.get('manifestId') as string | null;
    const manifest = formManifestId ? await loadManifest(formManifestId) : await getActiveManifest();

    // Look up sourceHash from manifest if available
    let sourceHash: string | undefined;
    if (manifest) {
      const manifestImage = manifest.images.find(img => img.filename === metadata.originalFilename);
      if (manifestImage?.sourceHash) {
        sourceHash = manifestImage.sourceHash;
      }
    }

    // Build patient data from form fields
    const firstName = formData.get('firstName') as string | null;
    const lastName = formData.get('lastName') as string | null;
    const dob = formData.get('dob') as string | null;
    const surgeon = formData.get('surgeon') as string | null;

    const patient = (firstName && lastName) ? {
      firstName,
      lastName,
      dob: dob || undefined,
      surgeon: surgeon || undefined,
    } : undefined;

    // Delegate to lib
    const result = await sortImage({
      metadata,
      sourcePath,
      destinationRoot,
      sourceHash,
      manifest: manifest ?? undefined,
      patient,
    });

    // Clean up temp file if we created one
    if (tempFilePath) {
      try { await unlink(tempFilePath); } catch { /* best effort */ }
    }

    if (result.conflict) {
      return new Response(JSON.stringify({
        error: result.error,
        conflict: true,
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!result.success) {
      return new Response(JSON.stringify({
        error: result.error || 'Failed to sort image',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      destination: result.destinationPath,
      filename: result.filename,
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
