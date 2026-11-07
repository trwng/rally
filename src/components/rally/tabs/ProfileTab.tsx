import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "../Avatar";
import { ActivityCalendar } from "../ActivityCalendar";
import { PastGameFeed } from "../PastGameFeed";
import { ChatView } from "../ChatView";
import { TermsContent, PrivacyContent } from "../LegalContent";

import { SPORTS, type Skill, type SportKey } from "@/lib/rally-data";
import { useRally } from "@/lib/rally-store";
import { useOpenPlayer } from "@/lib/player-modal";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { LogOut, Pencil, Check, MessageCircle, FileText, ShieldCheck, Sun, Moon, Monitor, Camera, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";

const SKILLS: Skill[] = ["Beginner", "Intermediate", "Advanced"];

export function ProfileTab() {
  const {
    profile,
    setProfile,
    games,
    joinedIds,
    me,
    buddies,
    logout,
    activity,
    pastGames,
    saveContactInfo,
    updatePrivacyAction,
    uploadAvatarAction,
    removeAvatarAction,
    blockedUsers,
    unblockUser,
  } = useRally();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const openPlayer = useOpenPlayer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.sports);
  const [dm, setDm] = useState<string | null>(null);
  const [legal, setLegal] = useState<null | "terms" | "privacy">(null);
  const [editContact, setEditContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    phone: profile.phone ?? "",
    instagram: profile.instagram ?? "",
    snapchat: profile.snapchat ?? "",
    other_social: profile.other_social ?? "",
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      await uploadAvatarAction(file);
      toast.success("Profile picture updated");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!me.avatarPath) return;
    setUploadingAvatar(true);
    try {
      await removeAvatarAction();
      toast("Profile picture removed");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't remove photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const mySports = Object.entries(profile.sports) as [SportKey, Skill][];
  const myGames = games.filter(
    (g) => joinedIds.includes(g.id) || g.host.id === "me",
  );

  const totalGames = useMemo(
    () => activity.reduce((sum, d) => sum + d.count, 0),
    [activity],
  );

  const streak = useMemo(() => {
    let s = 0;
    for (let i = activity.length - 1; i >= 0; i--) {
      if (activity[i].count > 0) s++;
      else break;
    }
    return s;
  }, [activity]);

  const perSport = useMemo(() => {
    const map = new Map<SportKey, number>();
    pastGames.forEach((p) => map.set(p.sport, (map.get(p.sport) ?? 0) + 1));
    myGames.forEach((g) => map.set(g.sport, (map.get(g.sport) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [pastGames, myGames]);

  const toggleSport = (k: SportKey) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (k in next) delete next[k];
      else next[k] = "Intermediate";
      return next;
    });
  };
  const setSkill = (k: SportKey, s: Skill) =>
    setDraft((prev) => ({ ...prev, [k]: s }));

  const save = () => {
    setProfile({ ...profile, sports: draft });
    setEditing(false);
    toast.success("Sports updated");
  };

  if (dm) {
    return <ChatView threadId={`dm:${dm}`} onBack={() => setDm(null)} />;
  }

  return (
    <div className="pb-28">
      {/* Identity */}
      <header className="px-4 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <PlayerAvatar player={{ ...me, name: profile.name }} size={72} />
            <label
              className={`absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md cursor-pointer tap-scale ${uploadingAvatar ? "opacity-60 pointer-events-none" : ""}`}
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
                disabled={uploadingAvatar}
              />
            </label>
            {me.avatarPath && !uploadingAvatar && (
              <button
                onClick={onRemoveAvatar}
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background border border-border text-muted-foreground flex items-center justify-center shadow-sm tap-scale"
                aria-label="Remove profile picture"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Athlete
            </p>
            <h1 className="mt-0.5 text-[26px] font-black tracking-tight truncate leading-none">
              {profile.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Big stats — Strava-style */}
      <section className="hairline-t hairline-b bg-surface">
        <div className="grid grid-cols-3 divide-x divide-hairline">
          <BigStat value={String(totalGames)} label="Games" />
          <BigStat value={String(streak)} label="Day streak" accent />
          <BigStat value={String(mySports.length)} label="Sports" />
        </div>
      </section>

      {/* Activity graph */}
      <section className="px-4 py-6 hairline-b">
        <ActivityCalendar days={activity} />
      </section>

      {/* Games per sport */}
      {perSport.length > 0 && (
        <section className="px-4 py-6 hairline-b">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Games per sport
          </p>
          <div className="space-y-2.5">
            {perSport.map(([k, n]) => {
              const s = SPORTS.find((x) => x.key === k)!;
              const max = perSport[0][1];
              const pct = Math.max(6, Math.round((n / max) * 100));
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="text-base w-5 text-center">{s.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-muted-foreground num">{n}</span>
                    </div>
                    <div className="h-1.5 bg-muted overflow-hidden rounded-sm">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: s.tint }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent activity — Strava-style completed-game feed */}
      <section className="py-6 hairline-b">
        <div className="px-4 flex items-baseline justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Recent activity
          </p>
          {pastGames.length > 0 && (
            <span className="text-[11px] text-muted-foreground num">
              {pastGames.length} total
            </span>
          )}
        </div>
        <PastGameFeed games={pastGames} limit={6} />
      </section>



      {/* My sports */}
      <section className="px-4 py-6 hairline-b">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            My sports
          </p>
          <button
            onClick={() => {
              if (editing) save();
              else {
                setDraft(profile.sports);
                setEditing(true);
              }
            }}
            className="text-[12px] font-semibold text-primary flex items-center gap-1"
          >
            {editing ? (
              <>
                <Check className="h-3.5 w-3.5" /> Save
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Edit
              </>
            )}
          </button>
        </div>

        {editing ? (
          <div className="space-y-2">
            {SPORTS.map((s) => {
              const active = s.key in draft;
              return (
                <div
                  key={s.key}
                  className="border border-border rounded-md p-3"
                >
                  <button
                    onClick={() => toggleSport(s.key)}
                    className="w-full flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 font-semibold text-[13px]">
                      <span className="text-lg">{s.emoji}</span>
                      {s.name}
                    </span>
                    <span
                      className={`h-5 w-5 rounded-sm border ${
                        active
                          ? "bg-primary border-primary"
                          : "border-border"
                      } flex items-center justify-center`}
                    >
                      {active && (
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </span>
                  </button>
                  {active && (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {SKILLS.map((lv) => (
                        <button
                          key={lv}
                          onClick={() => setSkill(s.key, lv)}
                          className={`rounded-sm py-1.5 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                            draft[s.key] === lv
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background border-border text-muted-foreground"
                          }`}
                        >
                          {lv}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {mySports.length === 0 && (
              <p className="text-[13px] text-muted-foreground">
                No sports yet. Tap edit to add some.
              </p>
            )}
            {mySports.map(([k, lv]) => {
              const s = SPORTS.find((x) => x.key === k)!;
              return (
                <span
                  key={k}
                  className="rounded-md bg-surface border border-border pl-1.5 pr-2 py-1 text-[12px] font-semibold flex items-center gap-1.5"
                >
                  <span
                    className="h-5 w-5 rounded-sm flex items-center justify-center text-xs"
                    style={{ backgroundColor: `${s.tint}20` }}
                  >
                    {s.emoji}
                  </span>
                  {s.name}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">
                    {lv}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Buddies */}
      <section className="px-4 py-6 hairline-b">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Regular buddies · <span className="num text-foreground">{buddies.length}</span>
        </p>
        {buddies.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Add buddies from your past games.
          </p>
        ) : (
          <ul className="-mx-4 hairline-t">
            {buddies.map((b) => (
              <li key={b.id} className="hairline-b px-4 py-2.5 flex items-center gap-3">
                <button
                  onClick={() => openPlayer(b)}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <PlayerAvatar player={b} size={36} />
                  <div className="min-w-0 text-left">
                    <p className="font-semibold truncate text-[14px]">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.city} · <span className="num">{b.gamesPlayed}</span> games
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setDm(b.id)}
                  className="h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 flex items-center justify-center tap-scale"
                  aria-label={`Message ${b.name}`}
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Contact info (private) */}
      <section className="px-4 py-6 hairline-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Contact info · private
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Only shared when you explicitly send it in a chat.
            </p>
          </div>
          <button
            onClick={async () => {
              if (editContact) {
                await saveContactInfo({
                  phone: contactDraft.phone.trim() || null,
                  instagram: contactDraft.instagram.trim() || null,
                  snapchat: contactDraft.snapchat.trim() || null,
                  other_social: contactDraft.other_social.trim() || null,
                });
                toast.success("Contact info saved");
                setEditContact(false);
              } else {
                setContactDraft({
                  phone: profile.phone ?? "",
                  instagram: profile.instagram ?? "",
                  snapchat: profile.snapchat ?? "",
                  other_social: profile.other_social ?? "",
                });
                setEditContact(true);
              }
            }}
            className="text-[12px] font-semibold text-primary flex items-center gap-1"
          >
            {editContact ? (
              <>
                <Check className="h-3.5 w-3.5" /> Save
              </>
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Edit
              </>
            )}
          </button>
        </div>

        {editContact ? (
          <div className="space-y-2">
            {(
              [
                ["phone", "Phone"],
                ["instagram", "Instagram"],
                ["snapchat", "Snapchat"],
                ["other_social", "Other"],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {label}
                </label>
                <input
                  value={contactDraft[k]}
                  onChange={(e) =>
                    setContactDraft((p) => ({ ...p, [k]: e.target.value }))
                  }
                  placeholder={label}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-[13px] mt-1"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13px] space-y-1">
            {profile.phone && <p><span className="text-muted-foreground">Phone:</span> {profile.phone}</p>}
            {profile.instagram && <p><span className="text-muted-foreground">IG:</span> {profile.instagram}</p>}
            {profile.snapchat && <p><span className="text-muted-foreground">Snap:</span> {profile.snapchat}</p>}
            {profile.other_social && <p><span className="text-muted-foreground">Other:</span> {profile.other_social}</p>}
            {!profile.phone && !profile.instagram && !profile.snapchat && !profile.other_social && (
              <p className="text-muted-foreground">Nothing saved yet.</p>
            )}
          </div>
        )}
      </section>

      {/* Settings & privacy */}
      <section className="px-4 py-6 hairline-b">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Appearance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Monitor],
            ] as const
          ).map(([val, label, Icon]) => {
            const active = themeMode === val;
            return (
              <button
                key={val}
                onClick={() => setThemeMode(val as ThemeMode)}
                className={`rounded-md border py-2.5 flex flex-col items-center gap-1 text-[11px] font-semibold tap-scale ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-6 hairline-b">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Privacy · who sees what
        </p>
        <div className="border border-border rounded-md divide-y divide-border">
          <PrivacyRow
            label="Discoverable"
            desc="Show me in “Find more people” to others in my city."
            value={profile.discoverable}
            onChange={(v) => {
              updatePrivacyAction({ discoverable: v });
              toast(v ? "You're discoverable" : "Hidden from discovery");
            }}
          />
          <PrivacyRow
            label="Show activity"
            desc="Let others see my activity calendar and recent games."
            value={profile.show_activity}
            onChange={(v) => updatePrivacyAction({ show_activity: v })}
          />
          <PrivacyRow
            label="Show city"
            desc="Display my city on my profile."
            value={profile.show_location}
            onChange={(v) => updatePrivacyAction({ show_location: v })}
          />
          <PrivacyRow
            label="Show sports"
            desc="Display the sports I play."
            value={profile.show_sports}
            onChange={(v) => updatePrivacyAction({ show_sports: v })}
          />
          <PrivacyRow
            label="Show skill level"
            desc="Display Beginner / Intermediate / Advanced tags."
            value={profile.show_skill}
            onChange={(v) => updatePrivacyAction({ show_skill: v })}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Your total <span className="font-semibold text-foreground">games played</span> is always
          visible to others in your pool — it's the app's basic trust signal.
        </p>
      </section>

      {/* Blocked users */}
      <section className="px-4 py-6 hairline-b">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Blocked users
        </p>
        {blockedUsers.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">You haven't blocked anyone.</p>
        ) : (
          <ul className="border border-border rounded-md divide-y divide-border">
            {blockedUsers.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                <Ban className="h-4 w-4 text-muted-foreground" />
                <span className="text-[13px] font-medium flex-1 truncate">{b.name}</span>
                <button
                  onClick={async () => {
                    await unblockUser(b.id);
                    toast(`Unblocked ${b.name}`);
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline tap-scale"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Legal & safety */}
      <section className="px-4 py-6 hairline-b">


        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">
          Legal &amp; safety
        </p>
        <div className="border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setLegal("terms")}
            className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-accent/40 border-b border-border"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold flex-1">Terms &amp; Conditions</span>
            <span className="text-[11px] text-muted-foreground">Read</span>
          </button>
          <button
            onClick={() => setLegal("privacy")}
            className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-accent/40"
          >
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold flex-1">Privacy Policy</span>
            <span className="text-[11px] text-muted-foreground">Read</span>
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Games and meetups happen between users at their own risk. Rally is a
          platform that connects players — it does not organize, supervise, or
          take responsibility for what happens at in-person meetups. You are
          responsible for your own safety.
        </p>
      </section>

      <section className="px-4 py-6">
        <Button
          onClick={() => {
            logout();
            toast("Logged out. Starting fresh.");
          }}
          variant="outline"
          className="w-full h-11 rounded-md text-[13px] font-semibold"
        >
          <LogOut className="h-4 w-4 mr-2" /> Log out
        </Button>
      </section>

      <Dialog open={legal !== null} onOpenChange={(o) => !o && setLegal(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {legal === "terms" ? "Terms & Conditions" : "Privacy Policy"}
            </DialogTitle>
          </DialogHeader>
          {legal === "terms" ? <TermsContent /> : <PrivacyContent />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BigStat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="px-3 py-5 text-center">
      <div
        className={`text-[32px] font-black leading-none num tracking-tight ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PrivacyRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 h-6 w-11 rounded-full relative transition-colors ${
          value ? "bg-primary" : "bg-muted border border-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
            value ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
