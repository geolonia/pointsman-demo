// The context broker (GeonicDB): road restrictions and Decision entities of
// the demo tenant.

import { DECISION_TERMS } from '../engine/bridge/src/bridge';
import { type Env, trimUrl } from './env';

/** The datamodels.jp transportation context: RoadRestriction and its attributes. */
export const TRANSPORTATION_CONTEXT = 'https://datamodels.jp/context/transportation/v1.jsonld';
const CORE_CONTEXT = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld';
const link = (ctx: string) => `<${ctx}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`;

export type Entity = { id: string; type: string; [attribute: string]: unknown };

export class Broker {
  private readonly base: string;
  // A wrapper, not `fetch` itself: Workers refuse `this.fetchFn()` with the
  // global fetch as a property ("Illegal invocation").
  constructor(private readonly env: Env, private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init)) {
    this.base = `${trimUrl(env.BROKER_URL)}/ngsi-ld/v1`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { 'x-api-key': this.env.BROKER_API_KEY, 'NGSILD-Tenant': this.env.BROKER_TENANT, ...extra };
  }

  private async call(method: string, path: string, init: { body?: unknown; headers?: Record<string, string> } = {}): Promise<Response> {
    return this.fetchFn(`${this.base}${path}`, {
      method,
      headers: this.headers(init.headers),
      ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
    });
  }

  /** Creates a RoadRestriction (normalized, datamodels.jp context). */
  async createRoadRestriction(entity: Entity): Promise<void> {
    const res = await this.call('POST', '/entities', { body: entity, headers: { 'content-type': 'application/json', link: link(TRANSPORTATION_CONTEXT) } });
    if (res.status !== 201) throw new BrokerError('create', res.status);
  }

  /** Road restrictions, newest first, with system attributes (createdAt). */
  async listRoadRestrictions(limit = 100): Promise<Entity[]> {
    const res = await this.call('GET', `/entities?type=RoadRestriction&limit=${limit}&options=sysAttrs`, {
      headers: { accept: 'application/json', link: link(TRANSPORTATION_CONTEXT) },
    });
    if (!res.ok) throw new BrokerError('list', res.status);
    const list = (await res.json()) as Entity[];
    return list.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
  }

  /** With sysAttrs, attributes and sub-attributes carry createdAt/modifiedAt: never write those back. */
  async getRoadRestriction(id: string, { sysAttrs = true } = {}): Promise<Entity | null> {
    const res = await this.call('GET', `/entities/${encodeURIComponent(id)}${sysAttrs ? '?options=sysAttrs' : ''}`, {
      headers: { accept: 'application/json', link: link(TRANSPORTATION_CONTEXT) },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new BrokerError('get', res.status);
    return (await res.json()) as Entity;
  }

  /** Replaces one attribute (single-attribute update: no notification, see pointsman#41). */
  async writeAttribute(id: string, name: string, value: unknown, context: string = TRANSPORTATION_CONTEXT): Promise<void> {
    const res = await this.call('PATCH', `/entities/${encodeURIComponent(id)}/attrs/${encodeURIComponent(name)}`, {
      body: value, headers: { 'content-type': 'application/json', link: link(context) },
    });
    if (!res.ok) throw new BrokerError('update', res.status);
  }

  /** Adds or replaces attributes of a Decision entity (its terms inline). */
  async updateDecision(id: string, attributes: Record<string, unknown>): Promise<void> {
    const res = await this.call('POST', `/entities/${encodeURIComponent(id)}/attrs`, {
      body: { '@context': [DECISION_TERMS, CORE_CONTEXT], ...attributes },
      headers: { 'content-type': 'application/ld+json' },
    });
    if (!res.ok) throw new BrokerError('update decision', res.status);
  }

  /** Deletes an entity; a missing one is fine. */
  async delete(id: string): Promise<void> {
    const res = await this.call('DELETE', `/entities/${encodeURIComponent(id)}`);
    if (!res.ok && res.status !== 404) throw new BrokerError('delete', res.status);
  }
}

export class BrokerError extends Error {
  constructor(what: string, readonly status: number) {
    // Only the status: bodies may echo report text.
    super(`broker ${what} failed: ${status}`);
  }
}
