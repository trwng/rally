import { Home, Search, MessageCircle, Users, User } from "lucide-react";

export type TabKey = "home" | "find" | "chats" | "groups" | "profile";

const tabs: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "find", label: "Find", icon: Search },
  { key: "groups", label: "Groups", icon: Users },
  { key: "chats", label: "Chats", icon: MessageCircle },
  { key: "profile", label: "You", icon: User },
];

export function BottomTabs({
  active,
  onChange,
  chatBadge = 0,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  chatBadge?: number;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur hairline-t">
      <div className="mx-auto max-w-md px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        <ul className="grid grid-cols-5">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <li key={key}>
                <button
                  onClick={() => onChange(key)}
                  className={`relative w-full py-1.5 flex flex-col items-center gap-1 text-[10px] font-semibold tracking-wide uppercase transition-colors tap-scale ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon
                      className={`h-[22px] w-[22px] ${isActive ? "stroke-[2.2]" : "stroke-[1.75]"}`}
                    />
                    {key === "chats" && chatBadge > 0 && (
                      <span
                        className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center num"
                        style={{
                          background: "var(--accent-orange)",
                          color: "var(--accent-orange-foreground)",
                        }}
                      >
                        {chatBadge}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px]">{label}</span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 h-[3px] w-8 bg-primary rounded-full"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
