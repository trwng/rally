import { useState } from "react";
import { Clock, MapPin, Users, Award } from "lucide-react";
import { PlayerAvatar } from "./Avatar";
import { sportByKey } from "@/lib/rally-data";
import type { PastGame } from "@/lib/rally-data";
import { useOpenPlayer } from "@/lib/player-modal";
import { KudosSheet } from "./KudosSheet";

interface Props {
  games: PastGame[];
  limit?: number;
}

/**
 * Strava-style completed-game activity feed.
 * Edge-to-edge cards, crisp stats, tappable co-players.
 */
export function PastGameFeed({ games, limit }: Props) {
  const openPlayer = useOpenPlayer();
  const [kudosGame, setKudosGame] = useState<PastGame | null>(null);
  const list = limit ? games.slice(0, limit) : games;

  if (list.length === 0) {
    return (
      <div className="mx-4 border border-dashed border-border rounded-md p-8 text-center">
        <p className="text-[13px] font-semibold">No completed games yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Once a game you host or join wraps up, it'll show up here as an activity.
        </p>
      </div>
    );
  }

  return (
    <ul className="hairline-t">
      {list.map((g) => {
        const sport = sportByKey(g.sport);
        return (
          <li key={g.id} className="hairline-b bg-card">
            <article className="px-4 py-4">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-2xl"
                  style={{
                    backgroundColor: `${sport.tint}18`,
                    color: sport.tint,
                  }}
                  aria-hidden
                >
                  {sport.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {g.date}
                    {g.time ? ` · ${g.time}` : ""}
                  </p>
                  <h3 className="mt-0.5 text-[17px] font-black tracking-tight leading-tight">
                    {sport.name}
                  </h3>
                </div>
              </div>

              {/* Meta stats — Strava-style row */}
              <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12.5px] text-foreground/85">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin
                    className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                    strokeWidth={2}
                  />
                  <span className="truncate">{g.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users
                    className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                    strokeWidth={2}
                  />
                  <span className="num font-semibold">{g.players.length}</span>
                  <span className="text-muted-foreground">
                    player{g.players.length === 1 ? "" : "s"}
                  </span>
                </div>
                {g.time && (
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                      strokeWidth={2}
                    />
                    <span>{g.time}</span>
                  </div>
                )}
              </dl>

              {g.note && (
                <p className="mt-3 text-[13px] text-muted-foreground italic border-l-2 border-border pl-3">
                  {g.note}
                </p>
              )}

              {/* Co-players */}
              {g.players.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                    Played with
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openPlayer(p)}
                        className="flex items-center gap-1.5 rounded-md bg-surface border border-border pr-2.5 pl-1 py-1 hover:border-foreground/25 transition-colors tap-scale"
                      >
                        <PlayerAvatar player={p} size={22} />
                        <span className="text-[12px] font-medium">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {g.players.some((p) => p.id !== "me") && (
                <button
                  onClick={() => setKudosGame(g)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold hover:border-primary/50 hover:text-primary transition-colors tap-scale"
                >
                  <Award className="h-3.5 w-3.5" />
                  Give kudos
                </button>
              )}
            </article>
          </li>
        );
      })}
      {kudosGame && (
        <KudosSheet
          open
          onOpenChange={(v) => !v && setKudosGame(null)}
          gameId={kudosGame.id}
          gameLabel={`${sportByKey(kudosGame.sport).name} · ${kudosGame.date}`}
          players={kudosGame.players}
        />
      )}
    </ul>
  );
}

