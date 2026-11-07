import { useMemo, useState } from "react";
import { MessageCircle, Users, UserPlus, Check, X, Clock } from "lucide-react";
import { PlayerAvatar } from "../Avatar";
import { ChatView } from "../ChatView";
import { useRally } from "@/lib/rally-store";
import { useOpenPlayer } from "@/lib/player-modal";
import { sportByKey } from "@/lib/rally-data";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function ChatsTab() {
  const {
    games,
    joinedIds,
    buddies,
    messages,
    playerById,
    groups,
    discoverablePeople,
    profile,
    incomingRequests,
    outgoingRequests,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    unreadCount,
  } = useRally();
  const openPlayer = useOpenPlayer();
  const [openThread, setOpenThread] = useState<string | null>(null);

  const gameThreads = useMemo(() => {
    const mine = games.filter(
      (g) => joinedIds.includes(g.id) || g.host.id === "me",
    );
    return mine.map((g) => {
      const tid = `g:${g.id}`;
      const msgs = messages.filter((m) => m.threadId === tid);
      const last = msgs[msgs.length - 1];
      return { game: g, threadId: tid, last };
    });
  }, [games, joinedIds, messages]);

  const groupThreads = useMemo(() => {
    return groups
      .filter((g) => g.myRole !== null)
      .map((g) => {
        const tid = `gr:${g.id}`;
        const msgs = messages.filter((m) => m.threadId === tid);
        const last = msgs[msgs.length - 1];
        return { group: g, threadId: tid, last };
      });
  }, [groups, messages]);

  const dmThreads = useMemo(() => {
    return buddies.map((b) => {
      const tid = `dm:${b.id}`;
      const msgs = messages.filter((m) => m.threadId === tid);
      const last = msgs[msgs.length - 1];
      return { player: b, threadId: tid, last };
    });
  }, [buddies, messages]);

  if (openThread) {
    return <ChatView threadId={openThread} onBack={() => setOpenThread(null)} />;
  }

  const empty = gameThreads.length === 0 && dmThreads.length === 0 && groupThreads.length === 0;

  return (
    <div className="pb-28">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-black tracking-tight">Chats</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Group chats for your games and DMs with buddies.
        </p>
      </header>

      {/* Incoming friend requests */}
      {incomingRequests.length > 0 && (
        <section className="px-5 mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Friend requests · {incomingRequests.length}
          </h2>
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {incomingRequests.map(({ req, player }, i, arr) => (
              <div
                key={req.id}
                className={`flex items-center gap-3 px-3 py-3 ${i !== arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <button
                  onClick={() => player && openPlayer(player)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  {player && <PlayerAvatar player={player} size={38} />}
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] truncate">
                      {player?.name ?? "Someone"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      wants to be friends
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => acceptFriendRequest(req.id)}
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap-scale"
                  aria-label="Accept"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => declineFriendRequest(req.id)}
                  className="h-8 w-8 rounded-full border border-border text-muted-foreground flex items-center justify-center tap-scale"
                  aria-label="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outgoing (pending) requests */}
      {outgoingRequests.length > 0 && (
        <section className="px-5 mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Pending · sent
          </h2>
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {outgoingRequests.map(({ req, player }, i, arr) => (
              <div
                key={req.id}
                className={`flex items-center gap-3 px-3 py-3 ${i !== arr.length - 1 ? "border-b border-border" : ""}`}
              >
                <button
                  onClick={() => player && openPlayer(player)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  {player && <PlayerAvatar player={player} size={34} />}
                  <div className="min-w-0">
                    <p className="font-medium text-[13px] truncate">
                      {player?.name ?? "Someone"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Waiting for response
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => cancelFriendRequest(req.id)}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}


      {empty && (
        <div className="px-5 mt-6">
          <div className="rounded-3xl bg-card border border-border p-8 text-center shadow-[var(--shadow-card)]">
            <div
              className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <MessageCircle className="h-8 w-8 text-primary-foreground" />
            </div>
            <p className="mt-4 font-bold text-lg">No chats yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Join a game to unlock its group chat, or add buddies from your past
              games to start a DM.
            </p>
          </div>
        </div>
      )}

      {groupThreads.length > 0 && (
        <section className="px-5 mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Group chats
          </h2>
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
            {groupThreads.map(({ group, threadId, last }, i) => (
              <button
                key={threadId}
                onClick={() => setOpenThread(threadId)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/40 active:bg-accent text-left ${
                  i !== groupThreads.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center">
                  {group.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold truncate">{group.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount(threadId) > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--accent-orange)] text-[color:var(--accent-orange-foreground)] text-[10px] font-bold flex items-center justify-center num">
                          {unreadCount(threadId)}
                        </span>
                      )}
                      {last && (
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(last.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {last
                      ? `${last.authorId === "me" ? "You" : playerById(last.authorId)?.name ?? "Someone"}: ${last.text}`
                      : `${group.memberCount} members`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {gameThreads.length > 0 && (
        <section className="px-5 mt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Game chats
          </h2>
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
            {gameThreads.map(({ game, threadId, last }, i) => {
              const sport = sportByKey(game.sport);
              return (
                <button
                  key={threadId}
                  onClick={() => setOpenThread(threadId)}
                  className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/40 active:bg-accent transition-colors text-left ${
                    i !== gameThreads.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${sport.tint}22` }}
                  >
                    {sport.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-semibold truncate">
                        {sport.name} · {game.when.split(",")[0]}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount(threadId) > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--accent-orange)] text-[color:var(--accent-orange-foreground)] text-[10px] font-bold flex items-center justify-center num">
                            {unreadCount(threadId)}
                          </span>
                        )}
                        {last && (
                          <span className="text-[11px] text-muted-foreground">
                            {timeAgo(last.ts)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {last
                        ? `${
                            last.authorId === "me"
                              ? "You"
                              : playerById(last.authorId)?.name ?? "Someone"
                          }: ${last.text}`
                        : `${game.spotsTaken} players · ${game.location}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {dmThreads.length > 0 && (
        <section className="px-5 mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Direct messages
          </h2>
          <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]">
            {dmThreads.map(({ player, threadId, last }, i) => (
              <button
                key={threadId}
                onClick={() => setOpenThread(threadId)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/40 active:bg-accent transition-colors text-left ${
                  i !== dmThreads.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <PlayerAvatar player={player} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold truncate">{player.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {unreadCount(threadId) > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--accent-orange)] text-[color:var(--accent-orange-foreground)] text-[10px] font-bold flex items-center justify-center num">
                          {unreadCount(threadId)}
                        </span>
                      )}
                      {last && (
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(last.ts)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {last
                      ? `${last.authorId === "me" ? "You: " : ""}${last.text}`
                      : `Start a chat with ${player.name.split(" ")[0]}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Find more people — same city, same age pool, opted-in to discovery */}
      <section className="px-5 mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Find more people
          {profile.city && (
            <span className="text-muted-foreground/70 font-medium normal-case tracking-normal">
              · in {profile.city}
            </span>
          )}
        </h2>
        {discoverablePeople.length === 0 ? (
          <div className="rounded-md border border-border bg-card px-4 py-6 text-center">
            <p className="text-[13px] text-muted-foreground">
              No one new to show right now. Check back later, or invite friends.
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {discoverablePeople.slice(0, 20).map((p, i, arr) => (
              <button
                key={p.id}
                onClick={() => openPlayer(p)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/40 active:bg-accent text-left ${
                  i !== arr.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <PlayerAvatar player={p} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[14px] truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {p.city ?? "Nearby"}
                    {" · "}
                    <span className="num">{p.gamesPlayed ?? 0}</span> games
                    {p.favoriteSports && p.favoriteSports.length > 0 && (
                      <> · {p.favoriteSports.slice(0, 3).map((k) => sportByKey(k).emoji).join(" ")}</>
                    )}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-primary">View</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
