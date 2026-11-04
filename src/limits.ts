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

/** The counters of the current UTC day. */
export function todaysLimits(env: Env, now = new Date()): DurableObjectStub<DailyLimits> {
  return env.LIMITS.get(env.LIMITS.idFromName(now.toISOString().slice(0, 10)));
}
