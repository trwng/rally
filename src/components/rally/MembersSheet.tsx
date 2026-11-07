import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PlayerAvatar } from "./Avatar";
import type { Player } from "@/lib/rally-data";
import { useOpenPlayer } from "@/lib/player-modal";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  members: { player: Player; role?: string }[];
}

export function MembersSheet({ open, onClose, title, subtitle, members }: Props) {
  const openPlayer = useOpenPlayer();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[80dvh] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg font-black tracking-tight text-left">
            {title}
          </SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground text-left">{subtitle}</p>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <p className="px-5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Members · {members.length}
          </p>
          <ul>
            {members.map(({ player, role }, i) => (
              <li
                key={player.id + i}
                className="border-t border-border first:border-t-0"
              >
                <button
                  onClick={() => {
                    onClose();
                    // slight defer so this sheet closes before the profile opens
                    setTimeout(() => openPlayer(player), 50);
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/40 active:bg-accent text-left"
                >
                  <PlayerAvatar player={player} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[14px] truncate">
                      {player.name}
                    </p>
                    {(player.city || role) && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {role && (
                          <span className="uppercase tracking-wider font-bold text-[10px] text-primary mr-1.5">
                            {role}
                          </span>
                        )}
                        {player.city ?? ""}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    View
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
