import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Maximize2, X } from "lucide-react";
import { GameCard } from "./GameCard";
import { sportByKey, type Game } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";

interface Props {
  games: Game[];
  onOpenChat?: (gameId: string) => void;
  compact?: boolean;
  expandable?: boolean;
  onExpand?: () => void;
  square?: boolean;
}

function sportDivIcon(emoji: string, tint: string) {
  return L.divIcon({
    className: "rally-pin",
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
    html: `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,.25));">
        <div style="
          width:34px;height:34px;border-radius:999px;
          background:${tint};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;border:2.5px solid #fff;line-height:1;">
          ${emoji}
        </div>
        <div style="
          width:0;height:0;margin-top:-3px;
          border-left:6px solid transparent;border-right:6px solid transparent;
          border-top:9px solid ${tint};"></div>
      </div>`,
  });
}

const meIcon = L.divIcon({
  className: "rally-me",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `
    <div style="width:22px;height:22px;border-radius:999px;
      background:oklch(0.6 0.18 148);border:3px solid #fff;
      box-shadow:0 0 0 4px oklch(0.6 0.18 148 / 0.25);"></div>`,
});

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const key = center.join(",");
  useEffect(() => {
    map.setView(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export default function MapView({
  games,
  onOpenChat,
  compact,
  expandable,
  onExpand,
  square,
}: Props) {
  const { profile } = useRally();
  const [openId, setOpenId] = useState<string | null>(null);

  const viewer: [number, number] | null =
    profile.lat != null && profile.lng != null
      ? [profile.lat, profile.lng]
      : null;

  const withCoords = useMemo(
    () =>
      games.filter(
        (g): g is Game & { lat: number; lng: number } =>
          g.lat != null && g.lng != null,
      ),
    [games],
  );

  // Center: user's location, else average of games, else world default
  const center: [number, number] = useMemo(() => {
    if (viewer) return viewer;
    if (withCoords.length) {
      const avgLat =
        withCoords.reduce((s, g) => s + g.lat, 0) / withCoords.length;
      const avgLng =
        withCoords.reduce((s, g) => s + g.lng, 0) / withCoords.length;
      return [avgLat, avgLng];
    }
    return [40.7128, -74.006];
  }, [viewer, withCoords]);

  const openGame = games.find((g) => g.id === openId) ?? null;

  const mapRef = useRef<L.Map | null>(null);
  const height = compact ? 220 : "100%";

  return (
    <div className={square ? "h-full" : "px-4"}>
      <div
        className={`relative overflow-hidden bg-surface ${
          square ? "h-full" : "rounded-md border border-border"
        }`}
        style={{ height: compact ? 220 : square ? "100%" : 440 }}
      >
        <MapContainer
          center={center}
          zoom={viewer ? 13 : 11}
          scrollWheelZoom={!compact}
          dragging={!compact}
          touchZoom={!compact}
          doubleClickZoom={!compact}
          boxZoom={!compact}
          keyboard={!compact}
          zoomControl={!compact}
          style={{ height: "100%", width: "100%" }}
          ref={(m) => {
            mapRef.current = m ?? null;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} />

          {viewer && <Marker position={viewer} icon={meIcon} />}

          {withCoords.map((g) => {
            const s = sportByKey(g.sport);
            return (
              <Marker
                key={g.id}
                position={[g.lat, g.lng]}
                icon={sportDivIcon(s.emoji, s.tint)}
                eventHandlers={{ click: () => setOpenId(g.id) }}
              >
                <Popup>
                  <div className="text-xs font-semibold">
                    {s.name} · {g.location}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Compact preview: overlay swallows touch so page scroll isn't trapped */}
        {compact && (
          <button
            type="button"
            onClick={() => onExpand?.()}
            aria-label="Open full map"
            className="absolute inset-0 z-[400] bg-transparent cursor-pointer"
          />
        )}


        {expandable && onExpand && (
          <button
            onClick={onExpand}
            className="absolute top-3 right-3 z-[500] h-9 w-9 rounded-md bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent"
            aria-label="Expand map"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}

        {withCoords.length === 0 && (
          <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-md bg-card/95 backdrop-blur border border-border px-3 py-2 text-xs text-muted-foreground">
            No games with a set location yet.
          </div>
        )}
      </div>

      {openGame && (
        <div
          className="fixed inset-0 z-[1000] bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-md border border-border shadow-lg p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenId(null)}
              className="absolute top-2 right-2 h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <GameCard game={openGame} onOpenChat={onOpenChat} />
          </div>
        </div>
      )}
    </div>
  );
}
