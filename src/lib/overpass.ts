import type { SportKey } from "./rally-data";

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  /** meters from viewer */
  distanceM: number;
  sportTag?: string;
}

const SPORT_TAG: Partial<Record<SportKey, string[]>> = {
  tennis: ["tennis"],
  pickleball: ["pickleball"],
  basketball: ["basketball"],
  soccer: ["soccer"],
  volleyball: ["volleyball", "beachvolleyball"],
  badminton: ["badminton"],
  running: ["running", "athletics"],
  cycling: ["cycling", "bmx"],
};

interface OverpassTags {
  name?: string;
  leisure?: string;
  sport?: string;
  amenity?: string;
  "addr:street"?: string;
  "addr:housenumber"?: string;
  "addr:city"?: string;
  [k: string]: string | undefined;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OverpassTags;
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function prettyType(tags: OverpassTags): string {
  const sport = tags.sport?.split(";")[0];
  if (sport) {
    const nice = sport.charAt(0).toUpperCase() + sport.slice(1);
    if (tags.leisure === "pitch") return `${nice} court`;
    if (tags.leisure === "sports_centre") return `${nice} centre`;
    return nice;
  }
  if (tags.leisure === "park") return "Park";
  if (tags.leisure === "pitch") return "Sports pitch";
  if (tags.leisure === "sports_centre") return "Sports centre";
  if (tags.leisure === "stadium") return "Stadium";
  if (tags.leisure === "fitness_centre") return "Gym";
  if (tags.amenity === "gym") return "Gym";
  return tags.leisure ?? "Venue";
}

function formatAddress(tags: OverpassTags): string | undefined {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export async function fetchNearbyPlaces(opts: {
  lat: number;
  lng: number;
  radiusM?: number;
  sport?: SportKey | null;
  limit?: number;
}): Promise<NearbyPlace[]> {
  const { lat, lng, radiusM = 4000, sport = null, limit = 40 } = opts;
  const sportTags = sport ? SPORT_TAG[sport] : undefined;

  // Build query. When sport filter, prefer tagged pitches/centres.
  const sportFilter = sportTags
    ? `[sport~"${sportTags.join("|")}"]`
    : "";

  const q = sport
    ? `
[out:json][timeout:20];
(
  nwr(around:${radiusM},${lat},${lng})[leisure=pitch]${sportFilter};
  nwr(around:${radiusM},${lat},${lng})[leisure=sports_centre]${sportFilter};
  nwr(around:${radiusM},${lat},${lng})[leisure=fitness_centre]${sportFilter};
  ${sport === "running" || sport === "cycling"
    ? `nwr(around:${radiusM},${lat},${lng})[leisure=track];`
    : ""}
);
out center ${limit};
`
    : `
[out:json][timeout:20];
(
  nwr(around:${radiusM},${lat},${lng})[leisure=pitch];
  nwr(around:${radiusM},${lat},${lng})[leisure=sports_centre];
  nwr(around:${radiusM},${lat},${lng})[leisure=fitness_centre];
  nwr(around:${radiusM},${lat},${lng})[leisure=park];
  nwr(around:${radiusM},${lat},${lng})[leisure=stadium];
);
out center ${limit};
`;

  let elements: OverpassElement[] = [];
  let lastErr: unknown = null;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: q,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements: OverpassElement[] };
      elements = json.elements ?? [];
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr && elements.length === 0) throw lastErr;

  const viewer = { lat, lng };
  const seen = new Set<string>();
  const places: NearbyPlace[] = [];
  for (const el of elements) {
    const pt =
      el.lat != null && el.lon != null
        ? { lat: el.lat, lng: el.lon }
        : el.center
          ? { lat: el.center.lat, lng: el.center.lon }
          : null;
    if (!pt) continue;
    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name) continue;
    const key = `${name}|${pt.lat.toFixed(4)}|${pt.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: `${el.type[0]}${el.id}`,
      name,
      type: prettyType(tags),
      lat: pt.lat,
      lng: pt.lng,
      address: formatAddress(tags),
      distanceM: haversineM(viewer, pt),
      sportTag: tags.sport,
    });
  }
  places.sort((a, b) => a.distanceM - b.distanceM);
  return places.slice(0, limit);
}

export function formatDistance(m: number): string {
  if (m < 950) return `${Math.round(m)} m`;
  const km = m / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function directionsUrl(p: NearbyPlace): string {
  // Universal — Apple opens Maps, Android/desktop opens Google Maps.
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}
