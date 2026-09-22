export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function photoKey(ownerId: string, photoId: string) {
  if (!ownerId || !PHOTO_ID.test(photoId)) throw new Error('Invalid photo reference');
  return `recipe-photos/${encodeURIComponent(ownerId)}/${photoId}.jpg`;
}
export function isJpeg(bytes: Uint8Array) {
  return bytes.byteLength >= 4 && bytes.byteLength <= MAX_PHOTO_BYTES
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}
export async function readPhotoBody(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_PHOTO_BYTES) throw new Error('PHOTO_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PHOTO_BYTES) { await reader.cancel(); throw new Error('PHOTO_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
