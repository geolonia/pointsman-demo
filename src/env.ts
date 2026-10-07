// Settings of the demo Worker (wrangler.jsonc vars and secrets).

export interface Env {
  // Vars
  POINTSMAN_URL: string;
  BROKER_URL: string;
  BROKER_TENANT: string;
  /** owner/name of the repository whose issues are the review queue. */
  GITHUB_REPOSITORY: string;
  GITHUB_APP_ID: string;
  GITHUB_INSTALLATION_ID: string;
  /** Pointsman calls allowed per UTC day; reports beyond it are refused. */
  DAILY_LIMIT: string;
  /** Origins allowed to call /api (the demo page). */
  ALLOWED_ORIGINS: string;
  TURNSTILE_SITE_KEY?: string;

  // Secrets
  POINTSMAN_TOKEN: string;
  BROKER_API_KEY: string;
  NOTIFY_SECRET: string;
  GITHUB_WEBHOOK_SECRET: string;
  /** The app's private key in PKCS#8 PEM ("BEGIN PRIVATE KEY"). */
  GITHUB_APP_PRIVATE_KEY: string;
  /** Without it, only prepared reports are accepted. */
  TURNSTILE_SECRET?: string;

  // Bindings
  ASSETS: Fetcher;
  DEMO: KVNamespace;
  REPORT_LIMIT: RateLimit;
}

const REQUIRED = [
  'POINTSMAN_URL', 'BROKER_URL', 'BROKER_TENANT', 'GITHUB_REPOSITORY', 'GITHUB_APP_ID', 'GITHUB_INSTALLATION_ID',
  'DAILY_LIMIT', 'ALLOWED_ORIGINS', 'POINTSMAN_TOKEN', 'BROKER_API_KEY', 'NOTIFY_SECRET', 'GITHUB_WEBHOOK_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
] as const;

/** Throws naming the first missing or invalid setting. */
export function checkEnv(env: Env): void {
  for (const name of REQUIRED) if (!env[name]) throw new Error(`${name} is not set`);
  for (const name of ['POINTSMAN_URL', 'BROKER_URL'] as const) {
    const u = URL.parse(env[name]);
    if (!u || (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname))) {
      throw new Error(`${name} must be an https URL (http only for localhost)`);
    }
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY)) throw new Error('GITHUB_REPOSITORY must be owner/name');
  if (!(Number(env.DAILY_LIMIT) > 0)) throw new Error('DAILY_LIMIT must be a positive number');
}

export const trimUrl = (u: string) => u.replace(/\/+$/, '');
