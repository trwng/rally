import { useMemo, useState } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { SportChips } from "../SportChips";
import { GameCard } from "../GameCard";
import { NewGameSheet } from "../NewGameSheet";
import { MapView } from "../MapView";
import { ChatView } from "../ChatView";
import { useRally } from "@/lib/rally-store";
import type { SportKey } from "@/lib/rally-data";

type SortKey = "closest" | "soonest" | "newest";

export function FindTab() {
  const { games } = useRally();
  const [filter, setFilter] = useState<SportKey | "all">("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<SortKey>("closest");
  const [chatGameId, setChatGameId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base =
      filter === "all" ? games : games.filter((g) => g.sport === filter);
    const sorted = [...base];
    if (sort === "closest") {
      sorted.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } else if (sort === "newest") {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  }, [games, filter, sort]);

  if (chatGameId) {
    return (
      <ChatView threadId={`g:${chatGameId}`} onBack={() => setChatGameId(null)} />
    );
  }

  return (
    <div className="pb-28">
      <header className="px-4 pt-8 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Browse
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-[28px] leading-none font-black tracking-tight">
            Find players
          </h1>
          <div className="shrink-0 flex border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-2.5 h-8 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                view === "list"
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={2.2} />
              List
            </button>
            <button
              onClick={() => setView("map")}
              className={`px-2.5 h-8 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors border-l border-border ${
                view === "map"
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
              Map
            </button>
          </div>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          <span className="num font-semibold text-foreground">
            {filtered.length}
          </span>{" "}
          open game{filtered.length === 1 ? "" : "s"} · post yours with the +
          button
        </p>
      </header>

      <div className="hairline-t hairline-b bg-surface">
        <div className="px-4 pt-3 pb-2">
          <SportChips value={filter} onChange={setFilter} />
        </div>
        {view === "list" && (
          <div className="px-4 pb-3 flex items-center gap-1 text-[11px] font-semibold">
            <span className="text-muted-foreground uppercase tracking-wider mr-1">
              Sort
            </span>
            {(["closest", "soonest", "newest"] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 rounded-sm transition-colors ${
                  sort === s
                    ? "text-foreground underline underline-offset-4 decoration-primary decoration-2"
                    : "text-muted-foreground"
                }`}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === "list" ? (
        <section>
          {filtered.length === 0 ? (
            <div className="m-4 border border-dashed border-border rounded-md p-8 text-center">
              <p className="text-2xl">🎯</p>
              <p className="mt-2 text-[13px] text-muted-foreground">
                No games for this sport yet. Tap + to post one.
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((g) => (
                <li key={g.id} className="hairline-b bg-card">
                  <div className="px-4 py-4">
                    <GameCard game={g} onOpenChat={setChatGameId} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-0">
          <MapView games={filtered} onOpenChat={setChatGameId} square />
        </div>
      )}

      <NewGameSheet />
    </div>
  );
}
