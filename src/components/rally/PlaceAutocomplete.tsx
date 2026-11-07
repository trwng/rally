import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Check, AlertCircle } from "lucide-react";
import { searchPlaces, GeocodeError, type GeoPlace } from "@/lib/geocode";
import { useRally } from "@/lib/rally-store";

interface Props {
  value: GeoPlace | null;
  onChange: (place: GeoPlace | null) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
}

export function PlaceAutocomplete({ value, onChange, onTextChange, placeholder }: Props) {
  const { profile } = useRally();
  const [text, setText] = useState(value?.display_name ?? "");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const viewer =
    profile.lat != null && profile.lng != null
      ? { lat: profile.lat, lng: profile.lng }
      : null;

  useEffect(() => {
    onTextChange?.(text);
    if (value && text !== value.display_name) {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (value) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setErrored(false);
      return;
    }
    timerRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErrored(false);
      try {
        const rows = await searchPlaces(text, ctrl.signal, viewer);
        setResults(rows);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (e instanceof GeocodeError) {
          setErrored(true);
          setResults([]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [text, value, viewer]);

  const selected = !!value;

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => (results.length > 0 || errored) && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? "Search parks, courts, gyms, addresses…"}
          className={`h-12 rounded-md pl-9 pr-9 ${
            selected ? "border-primary/60 bg-primary/5" : ""
          }`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && selected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        )}
      </div>

      {open && !selected && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {results.map((p, i) => (
            <li key={`${p.lat},${p.lng},${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p);
                  setText(p.display_name);
                  setOpen(false);
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate flex-1">
                    {p.name ?? p.city}
                  </span>
                  {p.category && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded-sm px-1.5 py-0.5 shrink-0">
                      {p.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {p.display_name}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !selected && errored && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Couldn't load suggestions — you can still type an address and post.</span>
        </div>
      )}

      {!selected && text.trim().length >= 2 && !loading && !errored && results.length === 0 && open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          No matches — you can still use what you typed.
        </div>
      )}
    </div>
  );
}
