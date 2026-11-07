import { createFileRoute } from "@tanstack/react-router";

interface NomResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
}

// Simple in-memory cache per Worker instance to reduce upstream calls.
const cache = new Map<string, { at: number; data: NomResult[] }>();
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;

function cacheGet(key: string): NomResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: NomResult[]) {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { at: Date.now(), data });
}

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return Response.json([]);
        const latStr = url.searchParams.get("lat");
        const lngStr = url.searchParams.get("lng");
        const viewer =
          latStr && lngStr
            ? { lat: parseFloat(latStr), lng: parseFloat(lngStr) }
            : null;

        const params = new URLSearchParams({
          format: "jsonv2",
          addressdetails: "1",
          namedetails: "1",
          limit: "15",
          q,
        });
        if (viewer) {
          const d = 0.4;
          const viewbox = `${viewer.lng - d},${viewer.lat + d},${viewer.lng + d},${viewer.lat - d}`;
          params.set("viewbox", viewbox);
          // NOT bounded so global fallbacks still appear in a single request.
        }

        const cacheKey = params.toString();
        const cached = cacheGet(cacheKey);
        if (cached) return Response.json(cached);

        try {
          const upstream = await fetch(
            `https://nominatim.openstreetmap.org/search?${cacheKey}`,
            {
              headers: {
                Accept: "application/json",
                "User-Agent":
                  "Rally/1.0 (https://park-play-app.lovable.app; contact: support@park-play-app.lovable.app)",
                "Accept-Language": "en",
              },
            },
          );
          if (!upstream.ok) {
            return new Response(
              JSON.stringify({ error: "geocoder_unavailable" }),
              {
                status: 502,
                headers: { "content-type": "application/json" },
              },
            );
          }
          const data = (await upstream.json()) as NomResult[];
          cacheSet(cacheKey, data);
          return Response.json(data);
        } catch {
          return new Response(
            JSON.stringify({ error: "geocoder_unavailable" }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
