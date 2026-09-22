import { env } from 'cloudflare:workers';
export function photoStorage(): R2Bucket {
  const bucket = (env as unknown as { RECIPE_PHOTOS?: R2Bucket }).RECIPE_PHOTOS;
  if (!bucket) throw new Error('Recipe photo storage is unavailable');
  return bucket;
}
