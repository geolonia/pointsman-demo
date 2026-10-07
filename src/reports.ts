// Reports from the demo page: prepared ones (the default) and free text.
// Each becomes a RoadRestriction entity (datamodels.jp, transportation).
// Places are real (Chiyoda, Tokyo); the events are invented.

import type { Entity } from './broker';

type Status = 'closed' | 'limited' | 'open';
type Geometry = { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: [number, number][] };

export interface Prepared {
  id: string;
  roadName: string;
  status: Status;
  statusLabel?: string;
  description: { ja: string; en: string };
  location: Geometry;
  /** What the storyboard expects Pointsman to do (docs/fiware-demo.md in pointsman). */
  expected: 'publish' | 'review' | 'urgent';
}

export const PREPARED: Prepared[] = [
  {
    id: 'flooded-underpass',
    roadName: '靖国通り',
    status: 'closed',
    statusLabel: '通行止め中',
    description: {
      ja: '大雨でアンダーパスが冠水したため、10時45分から全面通行止め。迂回は内堀通りへ。',
      en: 'The underpass is flooded by heavy rain; fully closed since 10:45. Detour via Uchibori-dori.',
    },
    location: { type: 'LineString', coordinates: [[139.7505, 35.695], [139.752, 35.6956]] },
    expected: 'publish',
  },
  {
    id: 'car-trapped',
    roadName: '紀尾井町通り',
    status: 'closed',
    description: {
      ja: '斜面が崩れて道路が埋まっている。車が1台巻き込まれ、中に人がいる模様。',
      en: 'A slope collapsed and buried the road. A car is caught, and someone seems to be inside.',
    },
    location: { type: 'Point', coordinates: [139.7368, 35.6803] },
    expected: 'urgent',
  },
  {
    id: 'status-contradicts',
    roadName: '内堀通り',
    status: 'closed',
    description: {
      ja: '路肩が一部崩れたが、片側交互通行で通れる。',
      en: 'Part of the road shoulder collapsed, but traffic passes in one lane, alternating.',
    },
    location: { type: 'Point', coordinates: [139.753, 35.6855] },
    expected: 'review',
  },
  {
    id: 'water-pipe-works',
    roadName: '白山通り',
    status: 'limited',
    statusLabel: '車線規制',
    description: {
      ja: '水道管工事のため、9時から17時まで左車線を規制。',
      en: 'Water pipe works: the left lane is closed from 9:00 to 17:00.',
    },
    location: { type: 'LineString', coordinates: [[139.7552, 35.6985], [139.7556, 35.7002]] },
    expected: 'publish',
  },
  {
    id: 'vague',
    roadName: '',
    status: 'closed',
    description: { ja: '道が通れないらしい', en: 'The road seems to be blocked' },
    location: { type: 'Point', coordinates: [139.762, 35.694] },
    expected: 'review',
  },
  {
    // In a river flood zone of 3 to 5 m (maximum assumed rainfall): the
    // profile's rule on the flood fact makes it urgent (pointsman#70).
    id: 'water-rising',
    roadName: '靖国通り',
    status: 'closed',
    description: {
      ja: '両国橋の手前で道路が冠水し、水かさが増えてきている。',
      en: 'The road before Ryogoku Bridge is flooded, and the water is rising.',
    },
    location: { type: 'Point', coordinates: [139.788, 35.692] },
    expected: 'urgent',
  },
  {
    id: 'fallen-tree',
    roadName: '日比谷通り',
    status: 'closed',
    description: {
      ja: '倒木が両車線をふさいでいる（川の橋の近く、7時から）。作業班が向かっている。',
      en: 'A fallen tree blocks both lanes near the river bridge since 7 am. Crews are on the way.',
    },
    location: { type: 'Point', coordinates: [139.759, 35.676] },
    expected: 'publish',
  },
];

/** The demo area (Chiyoda and around): free-text reports must lie inside. */
export const AREA = { west: 139.72, south: 35.66, east: 139.79, north: 35.71 };

const LIMITS = { roadName: 60, descriptionMin: 5, descriptionMax: 300, linePoints: 20 };

export type ReportInput =
  | { prepared: string; lang: 'ja' | 'en' }
  | { roadName?: string; status: Status; description: string; location: Geometry };

/** Checks a report from the page; returns it or an error message. */
export function parseReport(body: unknown): ReportInput | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'expected a JSON object';
  const b = body as Record<string, unknown>;
  if ('prepared' in b) {
    if (!PREPARED.some((p) => p.id === b.prepared)) return 'unknown prepared report';
    if (b.lang !== 'ja' && b.lang !== 'en') return 'lang must be ja or en';
    return { prepared: b.prepared as string, lang: b.lang };
  }
  const roadName = b.roadName ?? '';
  if (typeof roadName !== 'string' || roadName.length > LIMITS.roadName) return `roadName: at most ${LIMITS.roadName} characters`;
  if (!['closed', 'limited', 'open'].includes(b.status as string)) return 'status must be closed, limited or open';
  const d = b.description;
  if (typeof d !== 'string' || d.trim().length < LIMITS.descriptionMin || d.length > LIMITS.descriptionMax) {
    return `description: ${LIMITS.descriptionMin} to ${LIMITS.descriptionMax} characters`;
  }
  const location = parseGeometry(b.location);
  if (typeof location === 'string') return location;
  return { roadName: roadName.trim(), status: b.status as Status, description: d.trim(), location };
}

function parseGeometry(g: unknown): Geometry | string {
  const inArea = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n))
    && p[0] >= AREA.west && p[0] <= AREA.east && p[1] >= AREA.south && p[1] <= AREA.north;
  if (!g || typeof g !== 'object') return 'location: a GeoJSON Point or LineString';
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown };
  if (type === 'Point' && inArea(coordinates)) return { type, coordinates: coordinates as [number, number] };
  if (type === 'LineString' && Array.isArray(coordinates) && coordinates.length >= 2
    && coordinates.length <= LIMITS.linePoints && coordinates.every(inArea)) {
    return { type, coordinates: coordinates as [number, number][] };
  }
  return `location: a Point or LineString (2 to ${LIMITS.linePoints} positions) inside the demo area`;
}

/** The RoadRestriction entity for a report (normalized, datamodels.jp transportation). */
export function toEntity(input: ReportInput, now = new Date()): { entity: Entity; prepared?: string } {
  const P = (value: unknown) => ({ type: 'Property', value });
  const id = `urn:ngsi-ld:RoadRestriction:demo-${crypto.randomUUID()}`;
  const r = 'prepared' in input
    ? (() => {
      const p = PREPARED.find((x) => x.id === input.prepared)!;
      return { roadName: p.roadName, status: p.status, statusLabel: p.statusLabel, description: p.description[input.lang], location: p.location };
    })()
    : { ...input, statusLabel: undefined };
  const entity: Entity = {
    id,
    type: 'RoadRestriction',
    // Always present (empty when unknown), as in the profile's tests.
    roadName: P(r.roadName ?? ''),
    restrictionStatus: P(r.status),
    ...(r.statusLabel && { statusLabel: P(r.statusLabel) }),
    description: P(r.description),
    location: { type: 'GeoProperty', value: r.location },
    validFrom: P({ '@type': 'DateTime', '@value': now.toISOString() }),
  };
  return { entity, ...('prepared' in input && { prepared: input.prepared }) };
}
