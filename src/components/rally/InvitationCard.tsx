import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { sportByKey, type Game } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { useOpenPlayer } from "@/lib/player-modal";
import { toast } from "sonner";

export function InvitationCard({ game }: { game: Game }) {
  const { joinGame, dismissInvite } = useRally();
  const openPlayer = useOpenPlayer();
  const sport = sportByKey(game.sport);
  const spotsLeft = game.spotsTotal - game.spotsTaken;

  return (
    <div className="relative bg-foreground text-background rounded-lg p-4 overflow-hidden">
      <button
        aria-label="Dismiss"
        onClick={() => dismissInvite(game.id)}
        className="absolute top-2.5 right-2.5 h-7 w-7 rounded-sm bg-white/10 hover:bg-white/15 flex items-center justify-center"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: sport.tint }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
          Want to play?
        </p>
      </div>

      <p className="mt-2 text-[16px] font-bold leading-snug pr-8">
        <button
          onClick={() => openPlayer(game.host)}
          className="underline decoration-white/40 underline-offset-2"
        >
          {game.host.name}
        </button>{" "}
        needs {spotsLeft} more for {sport.name}
      </p>
      <p className="mt-1 text-[13px] opacity-75">
        {game.when} · {game.location}
      </p>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => {
            joinGame(game.id);
            dismissInvite(game.id);
            toast.success(`You're in! ${sport.name} · ${game.when}`);
          }}
          className="flex-1 h-10 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Join
        </Button>
        <Button
          onClick={() => dismissInvite(game.id)}
          variant="ghost"
          className="flex-1 h-10 rounded-md text-background hover:bg-white/10 hover:text-background border border-white/20"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
