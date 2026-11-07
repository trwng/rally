import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRally, type GroupSummary } from "@/lib/rally-store";
import { PlayerAvatar } from "./Avatar";
import { useOpenPlayer } from "@/lib/player-modal";
import { ChatView } from "./ChatView";
import { sportByKey, type SportKey } from "@/lib/rally-data";
import { toast } from "sonner";
import {
  Copy,
  Crown,
  LogOut,
  MessageCircle,
  Trash2,
  UserMinus,
  UserPlus,
  Globe2,
  Lock,
  Check,
  X,
} from "lucide-react";

interface Props {
  group: GroupSummary | null;
  onClose: () => void;
}

export function GroupDetailSheet({ group, onClose }: Props) {
  const {
    auth,
    groupMembersOf,
    groupGamesOf,
    groupRequestsOf,
    requestJoinGroupAction,
    leaveGroupAction,
    removeGroupMemberAction,
    promoteAction,
    decideGroupRequest,
    createInviteAction,
    deleteGroupAction,
  } = useRally();
  const openPlayer = useOpenPlayer();
  const [openChat, setOpenChat] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const members = useMemo(
    () => (group ? groupMembersOf(group.id) : []),
    [group, groupMembersOf],
  );
  const games = useMemo(
    () => (group ? groupGamesOf(group.id) : []),
    [group, groupGamesOf],
  );
  const requests = useMemo(
    () => (group ? groupRequestsOf(group.id) : []),
    [group, groupRequestsOf],
  );

  if (openChat && group) {
    return (
      <ChatView threadId={`gr:${group.id}`} onBack={() => setOpenChat(false)} />
    );
  }

  const isAdmin = group?.myRole === "admin";
  const isMember = group?.myRole !== null;
  const isCreator = group?.createdBy === auth.userId;

  return (
    <Sheet open={!!group} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-lg overflow-y-auto">
        {group && (
          <>
            <SheetHeader>
              <SheetTitle className="text-2xl flex items-center gap-2">
                {group.name}
                {group.isPublic ? (
                  <Globe2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </SheetTitle>
              {group.description && (
                <p className="text-sm text-muted-foreground text-left">
                  {group.description}
                </p>
              )}
            </SheetHeader>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {group.sports.map((s) => {
                const sp = sportByKey(s as SportKey);
                return (
                  <span
                    key={s}
                    className="text-xs px-2 py-1 rounded-md border border-border"
                  >
                    {sp.emoji} {sp.name}
                  </span>
                );
              })}
            </div>
            {group.city && (
              <p className="mt-2 text-xs text-muted-foreground">📍 {group.city}</p>
            )}

            <div className="mt-4 flex gap-2">
              {isMember ? (
                <>
                  <Button
                    onClick={() => setOpenChat(true)}
                    className="flex-1 h-11 rounded-md"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" /> Group chat
                  </Button>
                  {!isCreator && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!confirm("Leave this group?")) return;
                        await leaveGroupAction(group.id);
                        toast.success("Left group");
                        onClose();
                      }}
                      className="h-11 rounded-md"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : group.requestStatus === "pending" ? (
                <Button disabled className="flex-1 h-11 rounded-md">
                  Request pending
                </Button>
              ) : group.isPublic ? (
                <Button
                  onClick={async () => {
                    await requestJoinGroupAction(group.id);
                    toast.success("Join request sent");
                  }}
                  className="flex-1 h-11 rounded-md"
                >
                  <UserPlus className="h-4 w-4 mr-2" /> Request to join
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Private group. You need an invite code.
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 rounded-md border border-border p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const code = await createInviteAction(group.id);
                      setInviteCode(code);
                    }}
                  >
                    Create invite code
                  </Button>
                  {isCreator && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Delete this group? This cannot be undone.")) return;
                        await deleteGroupAction(group.id);
                        toast.success("Group deleted");
                        onClose();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
                {inviteCode && (
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {inviteCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {isAdmin && requests.length > 0 && (
              <section className="mt-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Join requests · {requests.length}
                </p>
                <div className="space-y-2">
                  {requests.map(({ req, player }) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 p-2 rounded-md border border-border"
                    >
                      {player && <PlayerAvatar player={player} size={32} />}
                      <p className="flex-1 text-sm font-semibold">
                        {player?.name ?? "Unknown"}
                      </p>
                      <button
                        onClick={() => decideGroupRequest(req.id, "approved")}
                        className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => decideGroupRequest(req.id, "denied")}
                        className="h-8 w-8 rounded-md border border-border flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Members · {members.length}
              </p>
              <ul className="hairline-t">
                {members.map(({ player, role }) => (
                  <li
                    key={player.id}
                    className="hairline-b py-2 flex items-center gap-3"
                  >
                    <button
                      onClick={() => openPlayer(player)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <PlayerAvatar player={player} size={36} />
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold truncate">
                          {player.name}
                        </p>
                        {role === "admin" && (
                          <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Admin
                          </p>
                        )}
                      </div>
                    </button>
                    {isAdmin && role !== "admin" && (
                      <>
                        <button
                          onClick={async () => {
                            await promoteAction(group.id, player.id);
                            toast.success("Promoted to admin");
                          }}
                          className="h-8 px-2 text-xs rounded-md border border-border"
                        >
                          Promote
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove ${player.name}?`)) return;
                            await removeGroupMemberAction(group.id, player.id);
                          }}
                          className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-6 mb-8">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Upcoming group games · {games.length}
              </p>
              {games.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No games posted in this group yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {games.map((g) => {
                    const sp = sportByKey(g.sport);
                    return (
                      <li
                        key={g.id}
                        className="p-3 rounded-md border border-border flex items-center gap-3"
                      >
                        <div
                          className="h-10 w-10 rounded-md flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${sp.tint}22` }}
                        >
                          {sp.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {sp.name} · {g.when.split(",")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {g.location} · {g.spotsTaken}/{g.spotsTotal}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function InviteCodeInput() {
  const { consumeInviteAction } = useRally();
  const [code, setCode] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite code"
        className="h-10 rounded-md"
      />
      <Button
        variant="outline"
        disabled={!code.trim()}
        onClick={async () => {
          try {
            await consumeInviteAction(code.trim());
            toast.success("Joined group");
            setCode("");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Invalid code");
          }
        }}
      >
        Join
      </Button>
    </div>
  );
}
