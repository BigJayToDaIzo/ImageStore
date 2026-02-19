import { idbGet, idbSet, idbDelete } from './idb';

export async function pickDirectory(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle> {
  return window.showDirectoryPicker(options);
}

export async function persistHandle(
  key: string,
  handle: FileSystemDirectoryHandle | FileSystemFileHandle,
): Promise<void> {
  await idbSet('handles', key, handle);
}

export async function reconnectHandle(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>('handles', key);
    if (!handle) return null;

    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission === 'granted') return handle;

    // Permission denied — stale handle
    await idbDelete('handles', key);
    return null;
  } catch (err) {
    // NotFoundError (directory no longer exists) or SecurityError (user gesture required)
    if (err instanceof DOMException && (err.name === 'NotFoundError' || err.name === 'SecurityError')) {
      await idbDelete('handles', key).catch(() => {});
      return null;
    }
    throw err;
  }
}
