import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { RallyProvider, useRally } from "@/lib/rally-store";
import { PlayerModalProvider } from "@/lib/player-modal";
import { ThemeProvider } from "@/lib/theme";
import { AuthPage } from "./AuthPage";
import { OnboardingWizard } from "./OnboardingWizard";
import { BottomTabs, type TabKey } from "./BottomTabs";
import { HomeTab } from "./tabs/HomeTab";
import { FindTab } from "./tabs/FindTab";
import { GroupsTab } from "./tabs/GroupsTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { ChatsTab } from "./tabs/ChatsTab";

function Shell() {
  const { auth, unreadTotal } = useRally();
  const [tab, setTab] = useState<TabKey>("home");

  if (auth.status === "loading") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (auth.status === "signed_out") {
    return (
      <div className="mx-auto max-w-md min-h-dvh bg-background">
        <AuthPage />
      </div>
    );
  }

  if (auth.status === "no_profile") {
    return (
      <div className="mx-auto max-w-md min-h-dvh bg-background">
        <OnboardingWizard />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md min-h-dvh bg-background relative">
      {tab === "home" && <HomeTab />}
      {tab === "find" && <FindTab />}
      {tab === "chats" && <ChatsTab />}
      {tab === "groups" && <GroupsTab />}
      {tab === "profile" && <ProfileTab />}
      <BottomTabs active={tab} onChange={setTab} chatBadge={unreadTotal} />
    </div>
  );
}

export function RallyApp() {
  return (
    <ThemeProvider>
      <RallyProvider>
        <PlayerModalProvider>
          <div className="min-h-dvh bg-background">
            <Shell />
            <Toaster position="top-center" />
          </div>
        </PlayerModalProvider>
      </RallyProvider>
    </ThemeProvider>
  );
}
