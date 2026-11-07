import { MapPin, Calendar } from "lucide-react";
import { PlayerAvatar } from "../Avatar";
import { sportByKey } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { useOpenPlayer } from "@/lib/player-modal";

export function PastTab() {
  const { pastGames } = useRally();
  const openPlayer = useOpenPlayer();

  return (
    <div className="pb-28">
      <header className="px-4 pt-8 pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          History
        </p>
        <h1 className="mt-1 text-[28px] leading-none font-black tracking-tight">
          Past games
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          <span className="num font-semibold text-foreground">
            {pastGames.length}
          </span>{" "}
          game{pastGames.length === 1 ? "" : "s"} · tap a player for their profile
        </p>
      </header>

      <ul className="hairline-t">
        {pastGames.map((g) => {
          const sport = sportByKey(g.sport);
          return (
            <li key={g.id} className="hairline-b bg-card px-4 py-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl"
                  style={{
                    backgroundColor: `${sport.tint}18`,
                    color: sport.tint,
                  }}
                >
                  {sport.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold tracking-tight">
                    {sport.name}
                  </p>
                  <div className="text-[12px] text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {g.date}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" /> {g.location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pl-14">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Played with · {g.players.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPlayer(p)}
                      className="flex items-center gap-1.5 rounded-md bg-surface border border-border pr-2.5 pl-1 py-1 hover:border-foreground/25 transition-colors"
                    >
                      <PlayerAvatar player={p} size={22} />
                      <span className="text-[12px] font-medium">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
