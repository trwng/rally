import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Plus, Search, Loader2 } from "lucide-react";
import { SPORTS, sportByKey, type SportKey } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import {
  directionsUrl,
  fetchNearbyPlaces,
  formatDistance,
  type NearbyPlace,
} from "@/lib/overpass";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NearbyPlacesSheet({ open, onOpenChange }: Props) {
  const { profile } = useRally();
  const [sport, setSport] = useState<SportKey | null>(null);
  const [radiusKm, setRadiusKm] = useState(4);
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const viewer = useMemo(
    () =>
      profile.lat != null && profile.lng != null
        ? { lat: profile.lat, lng: profile.lng }
        : null,
    [profile.lat, profile.lng],
  );

  useEffect(() => {
    if (!open || !viewer) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchNearbyPlaces({
      lat: viewer.lat,
      lng: viewer.lng,
      radiusM: radiusKm * 1000,
      sport,
      limit: 40,
    })
      .then((r) => {
        if (!cancelled) setPlaces(r);
      })
      .catch(() => {
        if (!cancelled) setErr("Couldn't reach the venue directory. Try again.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, viewer, sport, radiusKm]);

  const postGameHere = (p: NearbyPlace) => {
    onOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("rally:new-game", {
        detail: {
          place: {
            display_name: `${p.name}${p.address ? `, ${p.address}` : ""}`,
            city: p.name,
            lat: p.lat,
            lng: p.lng,
          },
          sport: sport ?? undefined,
        },
      }),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-lg h-[92dvh] overflow-y-auto p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-3 hairline-b">
          <SheetTitle className="text-2xl">Courts &amp; places nearby</SheetTitle>
          <p className="text-[13px] text-muted-foreground text-left">
            Live results from OpenStreetMap · within {radiusKm} km
          </p>
        </SheetHeader>

        {/* Filters */}
        <div className="px-4 py-3 hairline-b space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSport(null)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border ${
                sport === null
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border"
              }`}
            >
              All venues
            </button>
            {SPORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSport(s.key)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border inline-flex items-center gap-1.5 ${
                  sport === s.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border"
                }`}
              >
                <span>{s.emoji}</span>
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Radius
            </span>
            {[2, 4, 8, 15].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`h-7 px-2.5 rounded-sm text-[11px] font-semibold border ${
                  radiusKm === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="pb-24">
          {!viewer ? (
            <EmptyState
              title="Set your location first"
              body="Add your location in Profile so we can find courts near you."
            />
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching venues…
            </div>
          ) : err ? (
            <EmptyState title="Couldn't load places" body={err} />
          ) : places.length === 0 ? (
            <EmptyState
              title="No venues found"
              body="Try a bigger radius or a different sport."
            />
          ) : (
            <ul className="hairline-t">
              {places.map((p) => {
                const sportInfo = p.sportTag
                  ? SPORTS.find((s) => p.sportTag?.includes(s.key))
                  : null;
                return (
                  <li key={p.id} className="hairline-b bg-card px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl"
                        style={{
                          backgroundColor: sportInfo
                            ? `${sportInfo.tint}18`
                            : "var(--muted)",
                          color: sportInfo?.tint ?? "var(--foreground)",
                        }}
                        aria-hidden
                      >
                        {sportInfo?.emoji ?? "📍"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="truncate text-[15px] font-bold tracking-tight">
                            {p.name}
                          </h3>
                          <span className="shrink-0 num text-[11px] font-semibold text-muted-foreground">
                            {formatDistance(p.distanceM)}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {p.type}
                          {p.address ? ` · ${p.address}` : ""}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-md text-[12px] font-semibold"
                            onClick={() => window.open(directionsUrl(p), "_blank")}
                          >
                            <Navigation className="h-3.5 w-3.5 mr-1.5" />
                            Directions
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 rounded-md text-[12px] font-semibold"
                            onClick={() => postGameHere(p)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Post a game
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-[15px] font-bold">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{body}</p>
    </div>
  );
}

// Suppress unused import lint if MapPin isn't referenced elsewhere.
void MapPin;
