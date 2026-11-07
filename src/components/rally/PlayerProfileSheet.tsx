import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "./Avatar";
import { ChatView } from "./ChatView";
import { MapPin, Calendar, Trophy, UserPlus, Check, MessageCircle, Clock, X, Flag, Ban } from "lucide-react";
import { sportByKey, type Player } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { KUDO_LABELS, type KudoKind } from "@/lib/rally-api";
import { toast } from "sonner";
import { ReportSheet } from "./ReportSheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  player: Player | null;
  onClose: () => void;
}

export function PlayerProfileSheet({ player, onClose }: Props) {
  const {
    addBuddy,
    removeBuddy,
    me,
    friendshipStatus,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    blockUser,
    isBlocked,
    kudosCountByUser,
    kudosBreakdownByUser,
  } = useRally();
  const [dmOpen, setDmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const open = !!player;
  const isMe = player?.id === me.id;
  const blocked = player ? isBlocked(player.id) : false;
  const status = player ? friendshipStatus(player.id) : { kind: "none" as const };
  const isFriend = status.kind === "friends";
  const canMessage = isFriend; // messaging restricted to accepted friends

  if (player && dmOpen) {
    return (
      <Sheet open onOpenChange={(o) => { if (!o) setDmOpen(false); }}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[92dvh] overflow-hidden p-0">
          <SheetHeader className="sr-only"><SheetTitle>Chat with {player.name}</SheetTitle></SheetHeader>
          <ChatView threadId={`dm:${player.id}`} onBack={() => setDmOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }



  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl h-[92dvh] overflow-y-auto p-0 [&>button]:z-50 [&>button]:bg-background/80 [&>button]:backdrop-blur [&>button]:rounded-full [&>button]:p-1.5 [&>button]:opacity-100"
      >
        {player && (
          <>
            <div
              className="relative px-5 pt-8 pb-6"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--primary) 18%, transparent), transparent)",
              }}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{player.name}</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-4">
                <PlayerAvatar player={player} size={80} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-black tracking-tight truncate">
                    {player.name}
                    {isMe && (
                      <span className="ml-2 text-xs font-semibold text-primary bg-secondary rounded-full px-2 py-0.5 align-middle">
                        You
                      </span>
                    )}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                    {player.age && <span>{player.age} years old</span>}
                    {player.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {player.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {player.bio && (
                <p className="mt-4 text-sm text-foreground/85 leading-relaxed">
                  {player.bio}
                </p>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat
                  label="Games"
                  value={player.gamesPlayed?.toString() ?? "—"}
                  icon={<Trophy className="h-4 w-4" />}
                />
                <Stat
                  label="Sports"
                  value={(player.favoriteSports?.length ?? 0).toString()}
                  icon={<span className="text-sm">🎯</span>}
                />
                <Stat
                  label="Since"
                  value={player.memberSince?.split(" ")[1] ?? "—"}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {player && (() => {
                const total = kudosCountByUser(player.id);
                const breakdown = kudosBreakdownByUser(player.id);
                if (total === 0) return null;
                return (
                  <div className="mt-5 rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Kudos received
                      </p>
                      <span className="text-[18px] font-black num">{total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(KUDO_LABELS) as KudoKind[]).map((k) => {
                        const n = breakdown[k] ?? 0;
                        if (!n) return null;
                        const meta = KUDO_LABELS[k];
                        return (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2.5 py-1 text-[11px] font-semibold"
                          >
                            <span>{meta.emoji}</span>
                            <span>{meta.label}</span>
                            <span className="num text-muted-foreground">· {n}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {!isMe && (
                <div className="mt-5 flex gap-2">
                  {status.kind === "incoming" ? (
                    <>
                      <Button
                        onClick={async () => {
                          await acceptFriendRequest(status.reqId);
                          toast.success(`You and ${player.name} are now friends`);
                        }}
                        className="flex-1 h-11 rounded-md font-semibold"
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Accept request
                      </Button>
                      <Button
                        onClick={async () => {
                          await declineFriendRequest(status.reqId);
                          toast(`Declined request from ${player.name}`);
                        }}
                        variant="outline"
                        className="h-11 rounded-md font-semibold px-4"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : status.kind === "outgoing" ? (
                    <Button
                      onClick={async () => {
                        await cancelFriendRequest(status.reqId);
                        toast(`Request to ${player.name} canceled`);
                      }}
                      variant="outline"
                      className="flex-1 h-11 rounded-md font-semibold"
                    >
                      <Clock className="h-4 w-4 mr-1.5" /> Requested · tap to cancel
                    </Button>
                  ) : status.kind === "friends" ? (
                    <>
                      <Button
                        onClick={() => {
                          removeBuddy(player.id);
                          toast(`Removed ${player.name} as a friend`);
                        }}
                        variant="outline"
                        className="flex-1 h-11 rounded-md font-semibold"
                      >
                        <Check className="h-4 w-4 mr-1.5" /> Friends
                      </Button>
                      <Button
                        onClick={() => setDmOpen(true)}
                        className="h-11 rounded-md font-semibold px-4"
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" /> Message
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={async () => {
                        await addBuddy(player);
                        toast.success(`Friend request sent to ${player.name}`);
                      }}
                      className="flex-1 h-11 rounded-md font-semibold"
                    >
                      <UserPlus className="h-4 w-4 mr-1.5" /> Add friend
                    </Button>
                  )}
                </div>
              )}
              {!isMe && !canMessage && status.kind !== "incoming" && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  You'll be able to message {player.name.split(" ")[0]} once they accept your request.
                </p>
              )}


              {!isMe && (
                <div className="mt-4 flex items-center justify-end gap-4 text-xs text-muted-foreground">
                  <button
                    onClick={() => setReportOpen(true)}
                    className="inline-flex items-center gap-1 hover:text-foreground tap-scale"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="inline-flex items-center gap-1 hover:text-destructive tap-scale">
                        <Ban className="h-3.5 w-3.5" /> {blocked ? "Blocked" : "Block"}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Block {player.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You won't see each other anywhere in Rally. Pending requests will be cancelled. You can unblock from Settings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await blockUser(player.id);
                            toast(`Blocked ${player.name}`);
                            onClose();
                          }}
                        >
                          Block
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>


            <div className="px-5 pb-8 space-y-6">
              {player.favoriteSports && player.favoriteSports.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Plays
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {player.favoriteSports.map((k) => {
                      const s = sportByKey(k);
                      return (
                        <span
                          key={k}
                          className="rounded-full bg-card border border-border px-3 py-1.5 text-sm font-medium"
                        >
                          <span className="mr-1">{s.emoji}</span>
                          {s.name}
                        </span>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Photos from past games
                </h3>
                {player.photos && player.photos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {player.photos.map((p, i) => {
                      const s = sportByKey(p.sport);
                      return (
                        <div
                          key={i}
                          className="rounded-2xl overflow-hidden bg-muted border border-border"
                        >
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img
                              src={p.url}
                              alt={p.caption}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-medium truncate">
                              <span className="mr-1">{s.emoji}</span>
                              {p.caption}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No photos yet.
                  </p>
                )}
              </section>

              {player.memberSince && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Rally member since {player.memberSince}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
      {player && (
        <ReportSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={player.id}
          targetLabel={player.name}
        />
      )}
    </Sheet>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
