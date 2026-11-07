import { X } from "lucide-react";
import { PlayerAvatar } from "./Avatar";
import { KUDO_LABELS, type KudoKind } from "@/lib/rally-api";
import { useRally } from "@/lib/rally-store";
import type { Player } from "@/lib/rally-data";
import { toast } from "sonner";

const KIND_ORDER: KudoKind[] = [
  "good_sport",
  "skilled",
  "friendly",
  "on_time",
  "great_teammate",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gameId: string;
  gameLabel: string;
  players: Player[];
}

export function KudosSheet({ open, onOpenChange, gameId, gameLabel, players }: Props) {
  const { kudosGivenBy, giveKudoAction, revokeKudoAction, kudoIdOf } = useRally();

  if (!open) return null;

  const others = players.filter((p) => p.id !== "me");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-lg max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur hairline-b px-4 py-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Give kudos
            </p>
            <h3 className="mt-0.5 text-[15px] font-bold leading-tight">{gameLabel}</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {others.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No other players in this game to commend.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {others.map((p) => {
              const given = kudosGivenBy(gameId, p.id);
              return (
                <li key={p.id} className="px-4 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <PlayerAvatar player={p} size={36} />
                    <p className="font-semibold text-[14px]">{p.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {KIND_ORDER.map((kind) => {
                      const active = given.has(kind);
                      const meta = KUDO_LABELS[kind];
                      return (
                        <button
                          key={kind}
                          onClick={async () => {
                            try {
                              if (active) {
                                const id = kudoIdOf(gameId, "me", p.id, kind);
                                if (id) await revokeKudoAction(id);
                              } else {
                                await giveKudoAction({
                                  gameId,
                                  toUserId: p.id,
                                  kind,
                                });
                                toast.success(`Sent "${meta.label}" to ${p.name}`);
                              }
                            } catch (e) {
                              toast.error(
                                e instanceof Error ? e.message : "Couldn't send kudo",
                              );
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold tap-scale transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface border border-border text-foreground hover:border-foreground/25"
                          }`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
