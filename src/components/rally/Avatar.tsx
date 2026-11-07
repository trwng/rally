import { useEffect, useState } from "react";
import type { Player } from "@/lib/rally-data";
import { signAvatar } from "@/lib/rally-api";

interface Props {
  player: Player;
  size?: number;
  ring?: boolean;
}

export function PlayerAvatar({ player, size = 40, ring }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (player.avatarPath) {
      signAvatar(player.avatarPath).then((u) => {
        if (!cancelled) setUrl(u);
      });
    } else {
      setUrl(null);
    }
    return () => {
      cancelled = true;
    };
  }, [player.avatarPath]);

  const ringCls = ring ? "ring-2 ring-background" : "";

  if (url) {
    return (
      <img
        src={url}
        alt={player.name}
        className={`rounded-full object-cover shrink-0 ${ringCls}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${ringCls}`}
      style={{
        width: size,
        height: size,
        backgroundColor: player.avatarColor,
        fontSize: size * 0.4,
      }}
    >
      {player.initials}
    </div>
  );
}
