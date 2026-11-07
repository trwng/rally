export interface GeoPlace {
  display_name: string;
  city: string;
  name?: string;
  category?: string;
  lat: number;
  lng: number;
}

interface NomResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
}

function pickCity(a: Record<string, string> | undefined, fallback: string): string {
  if (!a) return fallback;
  return (
    a.city ||
    a.town ||
    a.village ||
    a.hamlet ||
    a.suburb ||
    a.county ||
    a.state ||
    fallback
  );
}

function labelOf(r: NomResult): string {
  if (r.name && r.name.trim().length > 0) return r.name;
  return r.display_name.split(",")[0];
}

function prettyCategory(r: NomResult): string | undefined {
  const cls = r.class;
  const typ = r.type;
  if (!cls && !typ) return undefined;
  const t = (typ ?? "").replace(/_/g, " ");
  if (cls === "leisure") return t || "Leisure";
  if (cls === "amenity") return t || "Place";
  if (cls === "sport") return `${t} facility`;
  if (cls === "tourism") return t || "Place";
  if (cls === "shop") return `${t} shop`;
  if (cls === "building") return t || "Building";
  if (cls === "highway") return "Address";
  if (cls === "place") return t || "Place";
  return t || cls;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Simple client-side memoization to dedupe repeat queries.
const clientCache = new Map<string, GeoPlace[]>();

function mapAndRank(
  rows: NomResult[],
  viewer: { lat: number; lng: number } | null,
): GeoPlace[] {
  const places: GeoPlace[] = rows.map((r) => ({
    display_name: r.display_name,
    name: labelOf(r),
    category: prettyCategory(r),
    city: pickCity(r.address, r.display_name.split(",")[0]),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
  if (viewer) {
    const NEAR_KM = 75;
    const withDist = places.map((p) => ({ p, d: haversineKm(viewer, p) }));
    withDist.sort((a, b) => {
      const aNear = a.d <= NEAR_KM ? 0 : 1;
      const bNear = b.d <= NEAR_KM ? 0 : 1;
      if (aNear !== bNear) return aNear - bNear;
      return a.d - b.d;
    });
    return withDist.slice(0, 12).map((x) => x.p);
  }
  return places.slice(0, 12);
}

export class GeocodeError extends Error {}

export async function searchPlaces(
  q: string,
  signal?: AbortSignal,
  viewer?: { lat: number; lng: number } | null,
): Promise<GeoPlace[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const key = `${query.toLowerCase()}|${viewer ? `${viewer.lat.toFixed(3)},${viewer.lng.toFixed(3)}` : "-"}`;
  const cached = clientCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ q: query });
  if (viewer) {
    params.set("lat", String(viewer.lat));
    params.set("lng", String(viewer.lng));
  }

  const res = await fetch(`/api/geocode?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new GeocodeError("Suggestions unavailable");
  }
  const rows = (await res.json()) as NomResult[];
  const out = mapAndRank(rows, viewer ?? null);
  clientCache.set(key, out);
  return out;
}

/** Best-effort geocode of a free-text address; returns null when nothing usable. */
export async function geocodeOne(
  q: string,
  viewer?: { lat: number; lng: number } | null,
): Promise<GeoPlace | null> {
  try {
    const rows = await searchPlaces(q, undefined, viewer ?? null);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoPlace | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const r = (await res.json()) as NomResult;
  return {
    display_name: r.display_name,
    city: pickCity(r.address, "Your location"),
    lat,
    lng,
  };
}

export function getBrowserLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}
