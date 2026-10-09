// The context broker (GeonicDB): road restrictions and Decision entities of
// the demo tenant.

import { DECISION_CONTEXT, TASK_CONTEXT } from '../engine/bridge/src/bridge';
import { type Env, trimUrl } from './env';
import { fetchWithAgent } from './http';

/** The datamodels.jp transportation context: RoadRestriction and its attributes. */
export const TRANSPORTATION_CONTEXT = 'https://datamodels.jp/context/transportation/v1.jsonld';
const CORE_CONTEXT = 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld';
/** Smart Data Models, all subjects (Alert among them). */
export const SDM_CONTEXT = 'https://smartdatamodels.org/context.jsonld';
const link = (ctx: string) => `<${ctx}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`;

export type Entity = { id: string; type: string; [attribute: string]: unknown };

export class Broker {
  private readonly base: string;
  // A wrapper, not `fetch` itself: Workers refuse `this.fetchFn()` with the
  // global fetch as a property ("Illegal invocation").
  constructor(private readonly env: Env, private readonly fetchFn: typeof fetch = fetchWithAgent) {
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

  /**
   * All road restrictions, newest first, with system attributes (createdAt).
   * Paged (NGSI-LD brokers cap a page; GeonicDB at 1000); `max` bounds the
   * total, far above what a day of demo data holds.
   */
  async listRoadRestrictions(max = 5000): Promise<Entity[]> {
    const page = 1000;
    const all: Entity[] = [];
    for (let offset = 0; offset < max; offset += page) {
      const res = await this.call('GET', `/entities?type=RoadRestriction&limit=${page}&offset=${offset}&options=sysAttrs`, {
        headers: { accept: 'application/json', link: link(TRANSPORTATION_CONTEXT) },
      });
      if (!res.ok) throw new BrokerError('list', res.status);
      const batch = (await res.json()) as Entity[];
      all.push(...batch);
      if (batch.length < page) break;
    }
    return all.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
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

  /** Adds or replaces attributes of a Decision entity (the published Decision context). */
  async updateDecision(id: string, attributes: Record<string, unknown>): Promise<void> {
    const res = await this.call('POST', `/entities/${encodeURIComponent(id)}/attrs`, {
      body: { '@context': [DECISION_CONTEXT, CORE_CONTEXT], ...attributes },
      headers: { 'content-type': 'application/ld+json' },
    });
    if (!res.ok) throw new BrokerError('update decision', res.status);
  }

  /** Adds or replaces attributes of a Task entity (the published Task context). A missing Task is fine. */
  async updateTask(id: string, attributes: Record<string, unknown>): Promise<void> {
    const res = await this.call('POST', `/entities/${encodeURIComponent(id)}/attrs`, {
      body: { '@context': [TASK_CONTEXT, CORE_CONTEXT], ...attributes },
      headers: { 'content-type': 'application/ld+json' },
    });
    if (!res.ok && res.status !== 404) throw new BrokerError('update task', res.status);
  }

  /**
   * A Decision entity as stored, without a context: its terms come back as
   * full IRIs (prov:, dpv:, datamodels.jp), which is what the page shows.
   */
  async getDecision(id: string): Promise<Entity | null> {
    const res = await this.call('GET', `/entities/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new BrokerError('get decision', res.status);
    return (await res.json()) as Entity;
  }

  /**
   * Decision entities that wait for a person (reviewStatus "pending"), across
   * all entities, in one NGSI-LD query. The broker reads the short names
   * (Decision, reviewStatus) from `contextUrl`: it must be a URL the broker
   * can fetch, served as application/ld+json. Paged like
   * listRoadRestrictions; `query` is the first page's request, `pages` how
   * many were read.
   */
  async listPendingDecisions(contextUrl: string, max = 5000): Promise<{ query: string; pages: number; decisions: Entity[] }> {
    const page = 1000;
    const base = `/entities?type=Decision&q=${encodeURIComponent('reviewStatus=="pending"')}&limit=${page}`;
    const decisions: Entity[] = [];
    let pages = 0;
    for (let offset = 0; offset < max; offset += page) {
      const res = await this.call('GET', offset ? `${base}&offset=${offset}` : base, { headers: { accept: 'application/json', link: link(contextUrl) } });
      if (!res.ok) throw new BrokerError('list decisions', res.status);
      const batch = (await res.json()) as Entity[];
      decisions.push(...batch);
      pages += 1;
      if (batch.length < page) break;
    }
    return { query: base, pages, decisions };
  }

  /** An entity as stored, without a context (terms as full IRIs), or null. */
  async getEntity(id: string): Promise<Entity | null> {
    const res = await this.call('GET', `/entities/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new BrokerError('get entity', res.status);
    return (await res.json()) as Entity;
  }

  /**
   * Creates an Alert (Smart Data Models, dataModel.Alert) with the Smart
   * Data Models context. An Alert that already exists (a retry) is fine.
   */
  async createAlert(alert: Entity): Promise<void> {
    const res = await this.call('POST', '/entities', { body: alert, headers: { 'content-type': 'application/json', link: link(SDM_CONTEXT) } });
    if (res.status !== 201 && res.status !== 409) throw new BrokerError('create alert', res.status);
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
