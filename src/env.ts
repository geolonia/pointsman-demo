// Settings of the demo Worker (wrangler.jsonc vars and secrets).

import type { BridgeMessage } from '../engine/packages/fiware/src/bridge';
import type { DailyLimits } from './limits';

export interface Env {
  // Vars
  POINTSMAN_URL: string;
  BROKER_URL: string;
  BROKER_TENANT: string;
  /** owner/name of the repository whose issues are the review queue. */
  GITHUB_REPOSITORY: string;
  GITHUB_APP_ID: string;
  GITHUB_INSTALLATION_ID: string;
  /** Reports allowed per UTC day; reports beyond it are refused. */
  DAILY_LIMIT: string;
  /** GitHub issues the demo opens per UTC day; reports beyond it wait on the page only. */
  DAILY_ISSUE_LIMIT: string;
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
  /** The daily counters (src/limits.ts), one Durable Object per UTC day. */
  LIMITS: DurableObjectNamespace<DailyLimits>;
  /** Optional: the bridge's queue (pointsman#88), producer and consumer. */
  BRIDGE_QUEUE?: Queue<BridgeMessage>;
}

const REQUIRED = [
  'POINTSMAN_URL', 'BROKER_URL', 'BROKER_TENANT', 'GITHUB_REPOSITORY', 'GITHUB_APP_ID', 'GITHUB_INSTALLATION_ID',
  'DAILY_LIMIT', 'DAILY_ISSUE_LIMIT', 'ALLOWED_ORIGINS', 'POINTSMAN_TOKEN', 'BROKER_API_KEY', 'NOTIFY_SECRET', 'GITHUB_WEBHOOK_SECRET',
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
  for (const name of ['DAILY_LIMIT', 'DAILY_ISSUE_LIMIT'] as const) {
    if (!(Number(env[name]) > 0)) throw new Error(`${name} must be a positive number`);
  }
}

export const trimUrl = (u: string) => u.replace(/\/+$/, '');
