export async function hashArrayBuffer(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function hashFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  return hashArrayBuffer(buffer);
}
