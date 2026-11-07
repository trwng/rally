import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SPORTS, type Skill, type SportKey } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { toast } from "sonner";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { geocodeOne, type GeoPlace } from "@/lib/geocode";

const SKILLS: Skill[] = ["Beginner", "Intermediate", "Advanced"];

function todayAtMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function NewGameSheet() {
  const { addGame, groups, profile } = useRally();
  const myGroups = groups.filter((g) => g.myRole !== null);
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<SportKey>("pickleball");
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [placeText, setPlaceText] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("18:00");
  const [spots, setSpots] = useState(4);
  const [skill, setSkill] = useState<Skill>("Intermediate");
  const [note, setNote] = useState("");
  const [scope, setScope] = useState<string>("public");
  const [submitting, setSubmitting] = useState(false);

  const combined = useMemo(() => {
    if (!date) return null;
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  }, [date, time]);

  const inPast = !!combined && combined.getTime() < Date.now();

  const reset = () => {
    setPlace(null);
    setPlaceText("");
    setDate(undefined);
    setTime("18:00");
    setSpots(4);
    setSkill("Intermediate");
    setNote("");
    setSport("pickleball");
    setScope("public");
  };

  // External trigger: NearbyPlaces sheet dispatches this to prefill and open.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | {
            place?: GeoPlace;
            sport?: SportKey;
          }
        | undefined;
      if (detail?.place) {
        setPlace(detail.place);
        setPlaceText(detail.place.display_name);
      }
      if (detail?.sport) setSport(detail.sport);
      setOpen(true);
    };
    window.addEventListener("rally:new-game", handler);
    return () => window.removeEventListener("rally:new-game", handler);
  }, []);


  const trimmedText = placeText.trim();
  const hasLocation = !!place || trimmedText.length >= 2;

  const submit = async () => {
    if (!hasLocation) {
      toast.error("Enter a location");
      return;
    }
    if (!combined) {
      toast.error("Pick a date and time");
      return;
    }
    if (inPast) {
      toast.error("Date/time is in the past");
      return;
    }

    setSubmitting(true);
    let resolved = place;
    if (!resolved && trimmedText.length >= 2) {
      const viewer =
        profile.lat != null && profile.lng != null
          ? { lat: profile.lat, lng: profile.lng }
          : null;
      resolved = await geocodeOne(trimmedText, viewer);
    }

    const label = format(combined, "EEE, MMM d · h:mm a");
    addGame({
      sport,
      location: resolved?.city ?? trimmedText,
      lat: resolved?.lat ?? null,
      lng: resolved?.lng ?? null,
      when: label,
      whenAt: combined,
      spotsTotal: Math.max(2, spots),
      skill,
      note: note.trim() || undefined,
      groupId: scope === "public" ? null : scope,
    });
    if (!resolved) {
      toast.success("Game posted (address saved without map pin)");
    } else {
      toast.success("Game posted!");
    }
    setSubmitting(false);
    setOpen(false);
    reset();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <SheetTrigger asChild>
        <button
          aria-label="Post a game"
          className="fixed bottom-20 right-4 z-30 h-12 pl-3.5 pr-4 rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-pop)] flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider tap-scale"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Post game
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-lg h-[92dvh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl">Looking for players</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {myGroups.length > 0 && (
            <div>
              <Label className="mb-1.5 block">Post to</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="h-12 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">🌍 Public feed</SelectItem>
                  {myGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      👥 {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Group games are only visible to members of that group.
              </p>
            </div>
          )}
          <div>
            <Label className="mb-1.5 block">Sport</Label>
            <Select value={sport} onValueChange={(v) => setSport(v as SportKey)}>
              <SelectTrigger className="h-12 rounded-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.emoji} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Location</Label>
            <PlaceAutocomplete
              value={place}
              onChange={setPlace}
              onTextChange={setPlaceText}
              placeholder="Search park, court, or address"
            />
            {place ? (
              <p className="mt-1.5 text-xs text-muted-foreground truncate">
                {place.display_name}
              </p>
            ) : trimmedText.length >= 2 ? (
              <p className="mt-1.5 text-xs text-muted-foreground truncate">
                Using typed address — pin may be approximate.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-12 w-full justify-start rounded-md font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "EEE, MMM d") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < todayAtMidnight()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="mb-1.5 block">Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 rounded-md"
              />
            </div>
          </div>

          {inPast && (
            <p className="text-xs text-destructive -mt-2">
              That time is in the past — pick a later one.
            </p>
          )}

          <div>
            <Label className="mb-1.5 block">Players needed (total)</Label>
            <Input
              type="number"
              min={2}
              value={spots}
              onChange={(e) => setSpots(Number(e.target.value))}
              className="h-12 rounded-md"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Skill level</Label>
            <div className="grid grid-cols-3 gap-2">
              {SKILLS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setSkill(lv)}
                  className={`rounded-md py-2.5 text-sm font-medium border transition-colors ${
                    skill === lv
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border"
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Casual doubles, bring water..."
              className="rounded-md min-h-20"
            />
          </div>

          <Button
            onClick={submit}
            disabled={!place || !combined || inPast}
            className="w-full h-12 rounded-md text-base font-semibold"
          >
            Post game
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
