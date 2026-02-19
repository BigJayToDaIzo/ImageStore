import { isImageFile } from '../util/image-utils';
import type { SourceImage } from './types';

const activeURLs: string[] = [];

// Lazy-loaded libheif module — only fetched when the first HEIC file is encountered
let libheifPromise: Promise<typeof import('libheif-js/wasm-bundle')> | null = null;

function isHeic(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return ext === '.heic' || ext === '.heif';
}

function getLibheif() {
  if (!libheifPromise) {
    libheifPromise = import('libheif-js/wasm-bundle');
  }
  return libheifPromise;
}

async function decodeHeicToObjectURL(file: File): Promise<string> {
  const libheif = await getLibheif();
  const buffer = new Uint8Array(await file.arrayBuffer());

  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buffer);
  if (!images || images.length === 0) {
    throw new Error('HEIC decode failed: no images found');
  }

  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);

  await new Promise<void>((resolve, reject) => {
    image.display(imageData, (result: any) => {
      if (!result) return reject(new Error('HEIC display/render failed'));
      resolve();
    });
  });

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      0.85,
    );
  });

  return URL.createObjectURL(blob);
}

export async function listSourceImages(
  sourceHandle: FileSystemDirectoryHandle,
): Promise<SourceImage[]> {
  const images: SourceImage[] = [];

  for await (const entry of sourceHandle.values()) {
    if (entry.kind === 'file' && isImageFile(entry.name)) {
      images.push({ name: entry.name, handle: entry as FileSystemFileHandle });
    }
  }

  images.sort((a, b) => a.name.localeCompare(b.name));
  return images;
}

export async function getImageObjectURL(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();

  let url: string;
  if (isHeic(file.name)) {
    url = await decodeHeicToObjectURL(file);
  } else {
    url = URL.createObjectURL(file);
  }

  activeURLs.push(url);
  return url;
}

export function revokeAllObjectURLs(): void {
  for (const url of activeURLs) {
    URL.revokeObjectURL(url);
  }
  activeURLs.length = 0;
}
