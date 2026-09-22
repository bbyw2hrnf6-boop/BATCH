import { getChatGPTUser } from '@/app/chatgpt-auth';
import { photoStorage } from '@/lib/photo-storage';
import { isJpeg, photoKey, readPhotoBody } from '@/lib/photo-format';
export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: 'Bitte anmelden, um ein Bild hochzuladen.' }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return response({ error: 'Ungültiger Ursprung.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0] !== 'image/jpeg') return response({ error: 'Bitte ein gültiges Foto auswählen.' }, 415);
  try {
    const bytes = await readPhotoBody(request);
    if (!isJpeg(bytes)) return response({ error: 'Bitte ein gültiges Foto auswählen.' }, 400);
    const photoId = crypto.randomUUID();
    await photoStorage().put(photoKey(user.userId, photoId), bytes, { httpMetadata: { contentType: 'image/jpeg' } });
    return response({ photoId }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'PHOTO_TOO_LARGE') return response({ error: 'Das Bild ist zu groß. Bitte ein kleineres Foto auswählen.' }, 413);
    console.error('Recipe photo upload failed', error);
    return response({ error: 'Bild konnte nicht gespeichert werden. Bitte erneut versuchen.' }, 503);
  }
}
