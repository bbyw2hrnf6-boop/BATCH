import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/database';
import { seedState, upgradeCatalog } from '@/lib/inventory';
import { saveSchema, stateSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return response({ error: 'Bitte anmelden, um deine Inventur zu laden.' }, 401);
  try {
    const record = await database().prepare('SELECT payload, revision, updated_at FROM batch_workspaces WHERE owner_id = ?').bind(user.userId).first<{ payload: string; revision: number; updated_at: string }>();
    if (!record) return response({ state: seedState(), revision: 0, updatedAt: null });
    return response({ state: stateSchema.parse(upgradeCatalog(stateSchema.parse(JSON.parse(record.payload)))), revision: record.revision, updatedAt: record.updated_at });
  } catch (error) {
    console.error('Inventory load failed', error);
    return response({ error: 'Deine Inventur konnte nicht geladen werden. Bitte erneut versuchen.' }, 503);
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: 'Bitte erneut anmelden. Deine Eingaben bleiben hier erhalten.' }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return response({ error: 'Ungültiger Ursprung.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return response({ error: 'JSON erwartet.' }, 415);
  let data;
  try {
    const raw = await request.text();
    if (raw.length > 500000) return response({ error: 'Zu viele Daten.' }, 413);
    data = saveSchema.parse(JSON.parse(raw));
  } catch { return response({ error: 'Bitte Mengen, Flaschengrößen und Zutaten prüfen.' }, 400); }
  try {
    const now = new Date().toISOString();
    const revision = data.revision + 1;
    const db = database();
    const result = data.revision === 0
      ? await db.prepare('INSERT INTO batch_workspaces (owner_id, payload, revision, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner_id) DO NOTHING').bind(user.userId, JSON.stringify(data.state), revision, now).run()
      : await db.prepare('UPDATE batch_workspaces SET payload = ?, revision = ?, updated_at = ? WHERE owner_id = ? AND revision = ?').bind(JSON.stringify(data.state), revision, now, user.userId, data.revision).run();
    if (result.meta.changes !== 1) return response({ error: 'Diese Inventur wurde auf einem anderen Gerät geändert. Lade den aktuellen Stand, bevor du erneut speicherst.' }, 409);
    return response({ revision, updatedAt: now });
  } catch (error) {
    console.error('Inventory save failed', error);
    return response({ error: 'Speichern gerade nicht möglich. Deine Eingaben bleiben erhalten. Bitte erneut versuchen.' }, 503);
  }
}
