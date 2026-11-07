import { useState } from "react";
import { MapPin, Clock, Users, MessageCircle, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlayerAvatar } from "./Avatar";
import { sportByKey, type Game } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { useOpenPlayer } from "@/lib/player-modal";
import { toast } from "sonner";
import { ReportSheet } from "./ReportSheet";

interface Props {
  game: Game;
  onOpenChat?: (gameId: string) => void;
  compact?: boolean;
}

export function GameCard({ game, onOpenChat, compact }: Props) {
  const { joinedIds, joinGame, leaveGame, cancelGame, endGame, isActiveGame, gameRoster, removePlayer } =
    useRally();
  const openPlayer = useOpenPlayer();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const sport = sportByKey(game.sport);
  const spotsLeft = game.spotsTotal - game.spotsTaken;
  const joined = joinedIds.includes(game.id);
  const isHost = game.host.id === "me";
  const full = spotsLeft <= 0;
  const roster = isHost ? gameRoster(game.id) : [];
  const active = isActiveGame(game);

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;


  return (
    <article className="bg-card">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl"
          style={{ backgroundColor: `${sport.tint}18`, color: sport.tint }}
          aria-hidden
        >
          {sport.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-[15px] font-bold tracking-tight">
              {sport.name}
            </h3>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {game.skill}
            </span>
          </div>
          <button
            onClick={() => openPlayer(game.host)}
            className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <PlayerAvatar player={game.host} size={16} />
            <span className="truncate">
              {isHost ? "You" : game.host.name}
            </span>
            <span>·</span>
            <span className="num">{game.distance}</span>
          </button>
        </div>
      </div>

      {!compact && (
        <dl className="mt-3 space-y-1.5 text-[13px] text-foreground/85">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
            <span className="truncate">{game.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
            <span>{game.when}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
            <span>
              <span className="num font-semibold text-foreground">
                {game.spotsTaken}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="num">{game.spotsTotal}</span>{" "}
              <span className="text-muted-foreground">
                {full ? "full" : "joined"}
              </span>
            </span>
          </div>
        </dl>
      )}

      {game.note && !compact && (
        <p className="mt-3 text-[13px] text-muted-foreground italic border-l-2 border-border pl-3">
          {game.note}
        </p>
      )}

      <div className="mt-3.5 flex gap-2">
        {joined || isHost ? (
          <>
            <Button
              onClick={() => onOpenChat?.(game.id)}
              className="flex-1 rounded-md h-9 text-[13px] font-semibold"
              variant="secondary"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" strokeWidth={2.2} />
              Group chat
            </Button>
            {!isHost && (
              <Button
                onClick={() => setConfirmLeave(true)}
                variant="outline"
                className="rounded-md h-9 text-[13px] font-semibold"
              >
                Leave
              </Button>
            )}
            {isHost && (
              <>
                <Button
                  onClick={() => setManageOpen(true)}
                  variant="outline"
                  className="rounded-md h-9 text-[13px] font-semibold"
                >
                  Manage
                </Button>
                {active ? (
                  <Button
                    onClick={() => setConfirmEnd(true)}
                    className="rounded-md h-9 text-[13px] font-semibold"
                  >
                    End game
                  </Button>
                ) : (
                  <Button
                    onClick={() => setConfirmCancel(true)}
                    variant="outline"
                    className="rounded-md h-9 text-[13px] font-semibold text-destructive border-destructive/40 hover:bg-destructive/5"
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}

          </>
        ) : (
          <Button
            disabled={full}
            onClick={() => {
              joinGame(game.id);
              toast.success(`You're in! ${sport.name} · ${game.when}`);
            }}
            className="w-full rounded-md h-10 text-[14px] font-semibold"
          >
            {full ? "Full" : "Join game"}
          </Button>
        )}
      </div>

      {!isHost && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground tap-scale"
          >
            <Flag className="h-3 w-3" /> Report game
          </button>
        </div>
      )}
      <ReportSheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="game"
        targetId={game.id}
        targetLabel={`${sport.name} · ${game.when}`}
      />


      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this game?</AlertDialogTitle>
            <AlertDialogDescription>
              Your spot will open up for someone else. The host and other players
              will see the updated count.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await leaveGame(game.id);
                  toast("You left the game.");
                } catch (error) {
                  toast.error(errorMessage(error, "Couldn't leave the game."));
                }
              }}
              className="rounded-md"
            >
              Leave game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>End this game?</AlertDialogTitle>
            <AlertDialogDescription>
              This wraps up the game and moves it to your activity feed. Players
              can then give each other kudos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Keep playing</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await endGame(game.id);
                  toast.success("Game wrapped. Nice one!");
                } catch (error) {
                  toast.error(errorMessage(error, "Couldn't end the game."));
                }
              }}
              className="rounded-md"
            >
              End game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this game?</AlertDialogTitle>
            <AlertDialogDescription>
              The game and its group chat will be removed for everyone who joined.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Keep game</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await cancelGame(game.id);
                  toast("Game cancelled.");
                } catch (error) {
                  toast.error(errorMessage(error, "Couldn't cancel the game."));
                }
              }}
              className="rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isHost && manageOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setManageOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">Players ({roster.length})</h4>
              <button
                onClick={() => setManageOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No one has joined yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {roster.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <PlayerAvatar player={p} size={32} />
                    <button
                      onClick={() => {
                        setManageOpen(false);
                        openPlayer(p);
                      }}
                      className="flex-1 text-left text-sm font-medium truncate hover:underline"
                    >
                      {p.name}
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const realId = (p as { id: string }).id;
                        if (realId === "me") return;
                        try {
                          await removePlayer(game.id, realId);
                          toast(`Removed ${p.name}`);
                        } catch (error) {
                          toast.error(errorMessage(error, `Couldn't remove ${p.name}`));
                        }
                      }}
                      className="rounded-md h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/5"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>

  );
}
