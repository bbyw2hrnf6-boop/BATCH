import { getChatGPTUser } from '@/app/chatgpt-auth';
import { photoStorage } from '@/lib/photo-storage';
import { PHOTO_ID, photoKey } from '@/lib/photo-format';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ photoId: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return new Response(null, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const { photoId } = await context.params;
  if (!PHOTO_ID.test(photoId)) return new Response(null, { status: 404 });
  try {
    // Resolving within the authenticated owner's namespace prevents cross-account reads.
    const object = await photoStorage().get(photoKey(user.userId, photoId));
    if (!object) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return new Response(object.body, { headers: { 'Content-Type': 'image/jpeg', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'Cross-Origin-Resource-Policy': 'same-origin' } });
  } catch (error) {
    console.error('Recipe photo read failed', error);
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
