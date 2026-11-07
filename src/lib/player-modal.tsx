import { createContext, useContext, useState, type ReactNode } from "react";
import type { Player } from "@/lib/rally-data";
import { PlayerProfileSheet } from "@/components/rally/PlayerProfileSheet";

interface Ctx {
  open: (p: Player) => void;
}

const PlayerModalCtx = createContext<Ctx | null>(null);

export function PlayerModalProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);

  return (
    <PlayerModalCtx.Provider value={{ open: (p) => setPlayer(p) }}>
      {children}
      <PlayerProfileSheet
        player={player}
        onClose={() => setPlayer(null)}
      />
    </PlayerModalCtx.Provider>
  );
}

export function useOpenPlayer() {
  const c = useContext(PlayerModalCtx);
  if (!c) throw new Error("useOpenPlayer must be used inside PlayerModalProvider");
  return c.open;
}
