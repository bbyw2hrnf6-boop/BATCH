declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RECIPE_PHOTOS?: R2Bucket;
  }
}
