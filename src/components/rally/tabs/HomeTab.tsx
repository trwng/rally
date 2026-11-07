import { useMemo, useState } from "react";
import { ChevronRight, Flame, Trophy, Sparkles, X, Compass } from "lucide-react";
import { GameCard } from "../GameCard";
import { MapView } from "../MapView";
import { ChatView } from "../ChatView";
import { PlayerAvatar } from "../Avatar";
import { SportChips } from "../SportChips";
import { NearbyPlacesSheet } from "../NearbyPlacesSheet";
import { useRally } from "@/lib/rally-store";
import { sportByKey, type SportKey } from "@/lib/rally-data";
import { Sheet, SheetContent } from "@/components/ui/sheet";


function todayLabel() {
  const d = new Date();
  const wd = d.toLocaleDateString(undefined, { weekday: "long" });
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${wd}, ${md}`;
}

export function HomeTab() {
  const {
    profile,
    games,
    joinedIds,
    activity,
    pastGames,
    isActiveGame,
  } = useRally();
  const [filter, setFilter] = useState<SportKey | "all">("all");
  const [chatGameId, setChatGameId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);


  const mySports = Object.keys(profile.sports) as SportKey[];

  const filtered = useMemo(
    () => (filter === "all" ? games : games.filter((g) => g.sport === filter)),
    [games, filter],
  );

  const upcoming = useMemo(() => {
    const mine = games.filter(
      (g) => joinedIds.includes(g.id) || g.host.id === "me",
    );
    // Active first, then chronological.
    return mine.slice().sort((a, b) => {
      const aa = isActiveGame(a) ? 0 : 1;
      const bb = isActiveGame(b) ? 0 : 1;
      if (aa !== bb) return aa - bb;
      return (a.whenAt ?? 0) - (b.whenAt ?? 0);
    });
  }, [games, joinedIds, isActiveGame]);

  const nearYou = useMemo(() => filtered.slice(0, 6), [filtered]);

  const suggested = useMemo(
    () =>
      games
        .filter(
          (g) =>
            mySports.includes(g.sport) &&
            !joinedIds.includes(g.id) &&
            g.host.id !== "me" &&
            g.spotsTaken < g.spotsTotal,
        )
        .slice(0, 3),
    [games, mySports, joinedIds],
  );

  const totalGames = useMemo(
    () => activity.reduce((sum, d) => sum + d.count, 0),
    [activity],
  );

  const streak = useMemo(() => {
    let s = 0;
    for (let i = activity.length - 1; i >= 0; i--) {
      if (activity[i].count > 0) s++;
      else break;
    }
    return s;
  }, [activity]);

  const lastPlayedSport = pastGames[0]?.sport;

  if (chatGameId) {
    return (
      <ChatView threadId={`g:${chatGameId}`} onBack={() => setChatGameId(null)} />
    );
  }

  return (
    <div className="pb-28">
      {/* Greeting */}
      <header className="px-4 pt-8 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {todayLabel()}
        </p>
        <h1 className="mt-1 text-[28px] leading-[1.05] font-black tracking-tight">
          Hi, {profile.name} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Ready to play?
        </p>
      </header>

      {/* Quick stats strip — edge-to-edge with dividers */}
      <section className="hairline-t hairline-b bg-surface">
        <div className="grid grid-cols-3 divide-x divide-hairline">
          <Stat
            value={String(totalGames)}
            label="Games played"
            icon={<Trophy className="h-3.5 w-3.5" />}
          />
          <Stat
            value={String(streak)}
            label={streak === 1 ? "Day streak" : "Day streak"}
            icon={<Flame className="h-3.5 w-3.5" />}
            accent
          />
          <Stat
            value={String(upcoming.length)}
            label="Upcoming"
            icon={<Sparkles className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      {/* Map — full-bleed, square edges */}
      <section className="mt-6">
        <div className="px-4 flex items-baseline justify-between mb-2.5 gap-3">
          <SectionHeading>Near you</SectionHeading>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlacesOpen(true)}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <Compass className="h-3.5 w-3.5" strokeWidth={2.4} />
              Courts nearby
            </button>
            <button
              onClick={() => setMapOpen(true)}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              Full map →
            </button>
          </div>
        </div>
        <div className="px-4">
          <SportChips value={filter} onChange={setFilter} />
        </div>
        <div className="mt-3">
          <MapView
            games={filtered}
            onOpenChat={setChatGameId}
            compact
            expandable
            onExpand={() => setMapOpen(true)}
            square
          />
        </div>
      </section>


      {/* Games near you — horizontal carousel */}
      {nearYou.length > 0 && (
        <section className="mt-8">
          <div className="px-4 flex items-baseline justify-between mb-3">
            <SectionHeading>Games near you</SectionHeading>
            <span className="text-[11px] text-muted-foreground num">
              {filtered.length} open
            </span>
          </div>
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <div className="flex gap-3 pb-1">
              {nearYou.map((g) => {
                const sport = sportByKey(g.sport);
                const spotsLeft = g.spotsTotal - g.spotsTaken;
                return (
                  <button
                    key={g.id}
                    onClick={() => setChatGameId(null) /* noop; card view below */}
                    className="shrink-0 w-[220px] text-left bg-card border border-border rounded-lg p-3.5 hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center text-base"
                        style={{ backgroundColor: `${sport.tint}18` }}
                      >
                        {sport.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate">
                          {sport.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground num">
                          {g.distance} · {g.skill}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] font-semibold truncate">
                      {g.when}
                    </p>
                    <p className="text-[12px] text-muted-foreground truncate">
                      {g.location}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        <span className="num text-foreground">
                          {spotsLeft}
                        </span>{" "}
                        spot{spotsLeft === 1 ? "" : "s"} left
                      </span>
                      <PlayerAvatar player={g.host} size={22} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Games — active first, then upcoming */}
      <section className="mt-8">
        <div className="px-4 mb-3">
          <SectionHeading>Games</SectionHeading>
        </div>
        {upcoming.length === 0 ? (
          <div className="mx-4 border border-dashed border-border rounded-md p-6 text-center">
            <p className="text-[13px] text-muted-foreground">
              Nothing on the calendar yet.
              <br />
              Join a game below or head to{" "}
              <span className="font-semibold text-foreground">Find</span> to
              browse all open games.
            </p>
          </div>
        ) : (
          <ul className="hairline-t">
            {upcoming.map((g) => {
              const active = isActiveGame(g);
              return (
                <li
                  key={g.id}
                  className={`hairline-b ${
                    active
                      ? "bg-primary/10 border-l-[3px] border-l-primary"
                      : "bg-card"
                  }`}
                >
                  <div className="px-4 py-4">
                    {active && (
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Live now
                      </div>
                    )}
                    <GameCard game={g} onOpenChat={setChatGameId} compact />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Suggested for you */}
      {suggested.length > 0 && (
        <section className="mt-8">
          <div className="px-4 mb-3 flex items-baseline justify-between">
            <SectionHeading>Suggested for you</SectionHeading>
            {lastPlayedSport && (
              <span className="text-[11px] text-muted-foreground">
                Based on your sports
              </span>
            )}
          </div>
          <ul className="hairline-t">
            {suggested.map((g) => (
              <li key={g.id} className="hairline-b bg-card">
                <div className="px-4 py-4">
                  <GameCard game={g} onOpenChat={setChatGameId} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fullscreen map */}
      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] p-0 rounded-none border-0 flex flex-col"
        >
          <div className="hairline-b px-4 h-14 flex items-center justify-between bg-background">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Map
              </p>
              <p className="text-[15px] font-bold leading-none mt-0.5">
                <span className="num">{filtered.length}</span> nearby
              </p>
            </div>
            <button
              onClick={() => setMapOpen(false)}
              aria-label="Close"
              className="h-9 w-9 rounded-md border border-border flex items-center justify-center tap-scale"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="hairline-b px-4 py-3">
            <SportChips value={filter} onChange={setFilter} />
          </div>
          <div className="flex-1 min-h-0">
            <MapView games={filtered} onOpenChat={setChatGameId} square />
          </div>
        </SheetContent>
      </Sheet>

      <NearbyPlacesSheet open={placesOpen} onOpenChange={setPlacesOpen} />
    </div>
  );
}


function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h2>
  );
}

function Stat({
  value,
  label,
  icon,
  accent,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-3.5 text-center">
      <div
        className={`flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
          accent ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-[22px] font-black leading-none num tracking-tight">
        {value}
      </div>
    </div>
  );
}

// Chevron used in earlier draft — keep import silent
void ChevronRight;
