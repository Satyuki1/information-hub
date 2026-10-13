declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SITE_ACCESS_KEY?: string;
    ASSETS?: Fetcher;
    DEEPSEEK_API_KEY?: string;
    DEEPSEEK_MODEL?: string;
    X_BEARER_TOKEN?: string;
    TWITTERAPI_IO_KEY?: string;
    WECOM_WEBHOOK_URL?: string;
  }
}
