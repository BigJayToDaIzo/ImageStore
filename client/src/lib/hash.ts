import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, constants } from 'node:fs/promises';

/**
 * Compute SHA256 hash of a file using streaming (handles large files efficiently).
 * Returns lowercase hex string (64 characters).
 */
export async function hashFile(filePath: string): Promise<string> {
  // Verify file exists first for a clear error
  await access(filePath, constants.R_OK);

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Verify that a destination file is a bit-perfect copy of a source.
 *
 * The first argument can be either:
 * - A file path (string containing '/') — the source file will be hashed
 * - A pre-computed SHA256 hex string (64 hex chars) — used directly, source not read
 */
export async function verifyFileCopy(
  sourceOrHash: string,
  destPath: string
): Promise<{ verified: boolean; sourceHash: string; destHash: string }> {
  const isHash = /^[a-f0-9]{64}$/.test(sourceOrHash);

  const sourceHash = isHash ? sourceOrHash : await hashFile(sourceOrHash);
  const destHash = await hashFile(destPath);

  return {
    verified: sourceHash === destHash,
    sourceHash,
    destHash,
  };
}
