import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SPORTS, type Skill, type SportKey } from "@/lib/rally-data";
import {
  completeOnboarding,
  ageFromDob,
} from "@/lib/rally-api";
import { useRally } from "@/lib/rally-store";
import {
  getBrowserLocation,
  reverseGeocode,
  searchPlaces,
  type GeoPlace,
} from "@/lib/geocode";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SKILLS: Skill[] = ["Beginner", "Intermediate", "Advanced"];

export function OnboardingWizard() {
  const { refresh, auth } = useRally();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [dob, setDob] = useState("");
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [selected, setSelected] = useState<SportKey[]>([]);
  const [skills, setSkills] = useState<Partial<Record<SportKey, Skill>>>({});
  const [submitting, setSubmitting] = useState(false);

  const age = dob ? ageFromDob(dob) : null;
  const dobOk = age != null && age >= 15 && age <= 100;
  const ageError =
    age != null && age < 15
      ? "You must be at least 15 to use Rally."
      : age != null && age > 100
        ? "Please check your date of birth."
        : null;

  const finish = async () => {
    if (!auth.userId || !place || !dobOk) return;
    setSubmitting(true);
    try {
      // Read the user's display name from their auth account
      const { data } = await supabase.auth.getUser();
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string };
      const fullName =
        meta.full_name?.trim() ||
        data.user?.email?.split("@")[0] ||
        "Rally player";
      await completeOnboarding({
        userId: auth.userId,
        full_name: fullName,
        dob,
        city: place.city,
        lat: place.lat,
        lng: place.lng,
        sports: skills as Record<string, Skill>,
        avatar_seed: fullName,
      });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background px-5 py-8 flex flex-col mx-auto max-w-md">
      <ProgressBar step={step} />

      <div className="mb-6 mt-4 flex items-center gap-2">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-black">
          R
        </div>
        <span className="text-lg font-black tracking-tight">Rally</span>
      </div>

      {step === 0 && (
        <div className="flex-1 flex flex-col">
          <h1 className="text-[26px] font-black tracking-tight">
            When were you born?
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            We use your age to keep the community safe. You must be 15+ to join.
          </p>
          <div className="mt-8">
            <Label className="text-[12px] font-semibold">Date of birth</Label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="mt-1 h-11 rounded-md"
            />
            {ageError && (
              <p className="mt-2 text-[13px] text-destructive font-medium">
                {ageError}
              </p>
            )}
            {age != null && dobOk && (
              <p className="mt-2 text-[13px] text-muted-foreground">
                You're <span className="font-bold text-foreground">{age}</span>{" "}
                — you'll play in the{" "}
                <span className="font-bold text-foreground">
                  {age < 18 ? "15–17 (teen)" : "18+ (adult)"}
                </span>{" "}
                community.
              </p>
            )}
          </div>
          <div className="mt-auto pt-8">
            <Button
              disabled={!dobOk}
              onClick={() => setStep(1)}
              className="w-full h-11 rounded-md text-[14px] font-semibold"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <h1 className="text-[26px] font-black tracking-tight">
            Where do you play?
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            We'll show games near this location.
          </p>
          <LocationPicker value={place} onChange={setPlace} />
          <div className="mt-auto pt-8">
            <Button
              disabled={!place}
              onClick={() => setStep(2)}
              className="w-full h-11 rounded-md text-[14px] font-semibold"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <h1 className="text-[26px] font-black tracking-tight">
            Which sports do you play?
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Pick your sports and set a skill level for each.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SPORTS.map((s) => {
              const active = selected.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() =>
                    setSelected((prev) => {
                      if (prev.includes(s.key)) {
                        setSkills((sk) => {
                          const n = { ...sk };
                          delete n[s.key];
                          return n;
                        });
                        return prev.filter((x) => x !== s.key);
                      }
                      setSkills((sk) => ({ ...sk, [s.key]: "Intermediate" }));
                      return [...prev, s.key];
                    })
                  }
                  className={`rounded-md px-3.5 py-2 text-[13px] font-semibold border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  <span className="mr-1.5">{s.emoji}</span>
                  {s.name}
                </button>
              );
            })}
          </div>

          {selected.length > 0 && (
            <div className="mt-6 space-y-3">
              {selected.map((k) => {
                const s = SPORTS.find((x) => x.key === k)!;
                return (
                  <div
                    key={k}
                    className="rounded-md border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-lg">{s.emoji}</span>
                      <span className="text-[14px] font-semibold">
                        {s.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {SKILLS.map((lv) => {
                        const active = skills[k] === lv;
                        return (
                          <button
                            key={lv}
                            onClick={() =>
                              setSkills((prev) => ({ ...prev, [k]: lv }))
                            }
                            className={`rounded-md py-2 text-[12px] font-semibold border transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border"
                            }`}
                          >
                            {lv}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-auto pt-8">
            <Button
              onClick={finish}
              disabled={selected.length === 0 || submitting}
              className="w-full h-11 rounded-md text-[14px] font-semibold"
            >
              {submitting ? "Setting up…" : "Start playing"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= step ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function LocationPicker({
  value,
  onChange,
}: {
  value: GeoPlace | null;
  onChange: (p: GeoPlace | null) => void;
}) {
  const [q, setQ] = useState(value?.display_name ?? "");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const debounced = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (!debounced || value?.display_name === debounced) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      controllerRef.current?.abort();
      const c = new AbortController();
      controllerRef.current = c;
      setBusy(true);
      try {
        const r = await searchPlaces(debounced, c.signal);
        setResults(r);
      } catch {
        // aborted
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [debounced, value]);

  const useGps = async () => {
    setGpsBusy(true);
    try {
      const loc = await getBrowserLocation();
      const rev = await reverseGeocode(loc.lat, loc.lng);
      if (rev) {
        onChange(rev);
        setQ(rev.display_name);
        setResults([]);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't get your location",
      );
    } finally {
      setGpsBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <Label className="text-[12px] font-semibold">City or address</Label>
      <div className="relative mt-1">
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          placeholder="Start typing your city…"
          className="h-11 rounded-md pr-10"
          autoComplete="off"
        />
        {busy && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {results.length > 0 && !value && (
        <ul className="mt-2 border border-border rounded-md overflow-hidden bg-card divide-y divide-border">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                onClick={() => {
                  onChange(r);
                  setQ(r.display_name);
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-accent"
              >
                <p className="text-[13px] font-semibold truncate">{r.city}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {r.display_name}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && (
        <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate">{value.city}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {value.display_name}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={useGps}
        disabled={gpsBusy}
        className="mt-3 w-full h-10 rounded-md border border-border text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-accent"
      >
        {gpsBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        Use my current location
      </button>
    </div>
  );
}
