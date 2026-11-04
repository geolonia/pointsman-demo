// Daily counters that hold under parallel requests (#112, #111).
//
// One Durable Object per UTC day (its name is the date). A Durable Object
// handles one call at a time, and the reads and writes below are synchronous
// (SQLite storage), so two parallel calls can never both take the last slot.
// Workers KV could not do this: it takes one write per second per key and
// shows a write in other locations up to a minute late.

import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env';

/** Counters live two days, then the alarm deletes them. */
const KEEP_MS = 2 * 24 * 3600_000;

export class DailyLimits extends DurableObject<Env> {
  /** Takes one of `limit` for `name`; ok false (nothing taken) when all are used. */
  async take(name: string, limit: number): Promise<{ ok: boolean; used: number }> {
    const kv = this.ctx.storage.kv;
    const used = kv.get<number>(name) ?? 0;
    if (used >= limit) return { ok: false, used };
    kv.put(name, used + 1);
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + KEEP_MS);
    return { ok: true, used: used + 1 };
  }

  /** Gives back one that was taken, when the work it was for did not happen. */
  async giveBack(name: string): Promise<void> {
    const kv = this.ctx.storage.kv;
    const used = kv.get<number>(name) ?? 0;
    if (used > 0) kv.put(name, used - 1);
  }

  async used(name: string): Promise<number> {
    return this.ctx.storage.kv.get<number>(name) ?? 0;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}

/**
 * The counters of the current UTC day. Two objects a day, so a flood of
 * comments or of one visitor's reports cannot slow down the daily totals:
 * 'totals' (reports, issues) and 'visitors' (per visitor and per issue).
 */
export function todaysLimits(env: Env, scope: 'totals' | 'visitors' = 'totals', now = new Date()): DurableObjectStub<DailyLimits> {
  const day = now.toISOString().slice(0, 10);
  return env.LIMITS.get(env.LIMITS.idFromName(scope === 'totals' ? day : `${day}:${scope}`));
}

/** One visitor for the limits: the IPv4 address, or the /64 of an IPv6 address (one home or phone). */
export function visitorKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  const [head = '', tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  return `${full.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
