// Reports from the demo page: prepared ones (the default) and free text.
// Each becomes a RoadRestriction entity (datamodels.jp, transportation).
// Places are real (Chiyoda and around, Tokyo; each on the road it names,
// checked against OpenStreetMap); the events are invented.

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
  /** What happened, for the card; the page never shows a made-up road name. */
  title: { en: string; ja: string };
  /** A landmark people can find (Japan names few streets): a station, park or river. */
  place: { en: string; ja: string };
  /** Shown first on the page, with this label: one example for each outcome. */
  featured?: { en: string; ja: string };
}

// The texts are tuned so that Clef-flash gives the expected action in both
// languages, with some margin to the profile's thresholds (checked on
// 2026-10-20 with Pointsman dev:live and FACTS_MODE gsi). A model update can move the answers:
// check again then.
export const PREPARED: Prepared[] = [
  {
    id: 'flooded-underpass',
    title: { en: 'Underpass flooded', ja: 'アンダーパスが冠水' },
    place: { en: 'Yasukuni-dori, near Kudanshita Station', ja: '靖国通り・九段下駅の近く' },
    featured: { en: 'A clear report', ja: 'はっきりした報告' },
    roadName: '靖国通り',
    status: 'closed',
    statusLabel: '通行止め中',
    description: {
      ja: '大雨でアンダーパスが冠水したため、10時45分から全面通行止め。けが人や取り残された車はない。迂回は内堀通りへ。',
      en: 'The underpass is flooded by heavy rain; fully closed since 10:45. No one is hurt and no cars are stuck. Detour via Uchibori-dori.',
    },
    location: { type: 'LineString', coordinates: [[139.750448, 35.695271], [139.751998, 35.695608]] },
    expected: 'publish',
  },
  {
    id: 'car-trapped',
    title: { en: 'Landslide, a car is buried', ja: '土砂崩れで車が巻き込まれた' },
    place: { en: 'Kioicho, near Akasaka-mitsuke Station', ja: '紀尾井町・赤坂見附駅の近く' },
    featured: { en: 'Someone in danger', ja: '人に危険がある' },
    roadName: '紀尾井町通り',
    status: 'closed',
    description: {
      ja: '斜面が崩れて道路が埋まっている。車が1台巻き込まれ、中に人がいる模様。',
      en: 'A slope collapsed and buried the road. A car is caught, and someone seems to be inside.',
    },
    location: { type: 'Point', coordinates: [139.735907, 35.680017] },
    expected: 'urgent',
  },
  {
    id: 'status-contradicts',
    title: { en: 'Road shoulder collapsed', ja: '路肩が崩れた' },
    place: { en: 'Uchibori-dori, near Takebashi Station', ja: '内堀通り・竹橋駅の近く' },
    roadName: '内堀通り',
    status: 'closed',
    description: {
      ja: '路肩が一部崩れたが、片側交互通行で通れる。',
      en: 'Part of the road shoulder collapsed, but traffic passes in one lane, alternating.',
    },
    location: { type: 'Point', coordinates: [139.756507, 35.690631] },
    expected: 'review',
  },
  {
    id: 'water-pipe-works',
    title: { en: 'A lane closed for water pipe works', ja: '水道管工事で車線規制' },
    place: { en: 'Hakusan-dori, near Suidobashi Station', ja: '白山通り・水道橋駅の近く' },
    roadName: '白山通り',
    status: 'limited',
    statusLabel: '車線規制',
    description: {
      ja: '水道管工事のため、9時から17時まで左車線を規制。右車線は通行できる。',
      en: 'Water pipe works: the left lane is closed from 9:00 to 17:00. Traffic passes in the right lane.',
    },
    location: { type: 'LineString', coordinates: [[139.756542, 35.699003], [139.755839, 35.70028]] },
    expected: 'publish',
  },
  {
    id: 'vague',
    title: { en: 'A road seems blocked', ja: '道が通れないらしい' },
    place: { en: 'Kanda-Ogawamachi (only a pin on the map)', ja: '神田小川町（地図の位置だけ）' },
    featured: { en: 'An unclear report', ja: 'はっきりしない報告' },
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
    title: { en: 'Water rising by the Sumida River', ja: '隅田川沿いで水かさが増えている' },
    place: { en: 'Hamacho-gashi-dori, near Hamacho Station', ja: '浜町河岸通り・浜町駅の近く' },
    roadName: '浜町河岸通り',
    status: 'closed',
    description: {
      ja: '隅田川沿いの道路が冠水し、水かさが増えてきている。',
      en: 'The road along the Sumida River is flooded, and the water is rising.',
    },
    location: { type: 'Point', coordinates: [139.788389, 35.690434] },
    expected: 'urgent',
  },
  {
    // The chain (pointsman#66), same text at two places. Step 1: urgent
    // (Clef-flash danger about 0.92 in both languages, 2026-10-20).
    // Step 2: no way through on foot. From Koishikawa Bridge along the river
    // (under the expressway), the way around on foot
    // is about 316 m longer, with an evacuation site 443 m away: an Alert
    // for its staff. In the street grid it is about 143 m: no alert.
    id: 'bridge-blocked',
    title: { en: 'Fallen tree at Koishikawa Bridge', ja: '小石川橋のたもとで倒木' },
    place: { en: 'By the Nihonbashi River, near Iidabashi Station', ja: '日本橋川沿い・飯田橋駅の近く' },
    featured: { en: 'Near an evacuation site', ja: '避難場所の近く' },
    roadName: '',
    status: 'closed',
    description: {
      ja: '倒木で道路がふさがれ、車も歩行者も通れない。救急車も通れない。',
      en: 'A fallen tree blocks the road; neither cars nor people on foot can pass. Ambulances cannot get through.',
    },
    location: { type: 'LineString', coordinates: [[139.750481, 35.702539], [139.750472, 35.702397], [139.750458, 35.701952], [139.750476, 35.701524], [139.750613, 35.701197], [139.750727, 35.700972]] },
    expected: 'urgent',
  },
  {
    id: 'street-blocked',
    title: { en: 'Fallen tree blocks a side street', ja: '倒木で裏通りがふさがれた' },
    place: { en: 'Iidabashi 4-chome, near Iidabashi Station', ja: '飯田橋四丁目・飯田橋駅の近く' },
    roadName: '',
    status: 'closed',
    description: {
      ja: '倒木で道路がふさがれ、車も歩行者も通れない。救急車も通れない。',
      en: 'A fallen tree blocks the road; neither cars nor people on foot can pass. Ambulances cannot get through.',
    },
    location: { type: 'LineString', coordinates: [[139.746432, 35.701305], [139.7461, 35.700931], [139.745926, 35.700653]] },
    expected: 'urgent',
  },
  {
    id: 'fallen-tree',
    title: { en: 'Fallen tree blocks both lanes', ja: '倒木で両車線が通れない' },
    place: { en: 'Hibiya-dori, by Hibiya Park', ja: '日比谷通り・日比谷公園の横' },
    roadName: '日比谷通り',
    status: 'closed',
    description: {
      ja: '大雨と強風で倒木があり、両車線が通れない（日比谷公園の横、7時から）。作業班が向かっている。',
      en: 'Heavy rain and strong wind brought down a tree; both lanes are blocked next to Hibiya Park since 7 am. Crews are on the way.',
    },
    location: { type: 'Point', coordinates: [139.758798, 35.674377] },
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
