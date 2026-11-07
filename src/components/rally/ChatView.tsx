import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Paperclip, Contact, MoreVertical, Flag, Ban, ImagePlus, X } from "lucide-react";
import { PlayerAvatar } from "./Avatar";
import { MembersSheet } from "./MembersSheet";
import { useRally } from "@/lib/rally-store";
import { sportByKey, type Player } from "@/lib/rally-data";
import { useOpenPlayer } from "@/lib/player-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReportSheet } from "./ReportSheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { signChatPhoto } from "@/lib/rally-api";

interface Props {
  threadId: string;
  onBack: () => void;
}

export function ChatView({ threadId, onBack }: Props) {
  const {
    messages,
    sendMessage,
    games,
    groups,
    playerById,
    profile,
    me,
    gameRoster,
    groupMembersOf,
    blockUser,
    uploadChatPhotoAction,
    markThreadReadAction,
  } = useRally();
  const openPlayer = useOpenPlayer();
  const [text, setText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.threadId === threadId)
        .sort((a, b) => a.ts - b.ts),
    [messages, threadId],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [thread.length]);

  // Mark thread as read on open and whenever new messages arrive while open.
  useEffect(() => {
    void markThreadReadAction(threadId);
  }, [threadId, thread.length, markThreadReadAction]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Header info
  let title = "Chat";
  let subtitle = "";
  let avatar: React.ReactNode = null;
  let members: { player: Player; role?: string }[] = [];
  let isGroupChat = false;

  if (threadId.startsWith("g:")) {
    const gameId = threadId.slice(2);
    const game = games.find((g) => g.id === gameId);
    if (game) {
      isGroupChat = true;
      const sport = sportByKey(game.sport);
      title = `${sport.name} · ${game.when.split(",")[0]}`;
      subtitle = `${game.location} · ${game.spotsTaken}/${game.spotsTotal} players`;
      avatar = (
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${sport.tint}22` }}
        >
          {sport.emoji}
        </div>
      );
      const roster = gameRoster(gameId);
      const meAsPlayer: Player = { ...me, name: profile.name };
      const list: { player: Player; role?: string }[] = [
        { player: game.host, role: "Host" },
      ];
      for (const p of roster) {
        if (p.id !== game.host.id) list.push({ player: p });
      }
      // Ensure current user shows up if joined but not in roster snapshot
      const meJoined = list.some((m) => m.player.id === me.id);
      if (!meJoined && game.host.id !== me.id) {
        // no-op: only add if actually joined; roster is source of truth
      }
      members = list;
    }
  } else if (threadId.startsWith("gr:")) {
    const grpId = threadId.slice(3);
    const grp = groups.find((g) => g.id === grpId);
    if (grp) {
      isGroupChat = true;
      title = grp.name;
      subtitle = `${grp.memberCount} members`;
      avatar = (
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
          {grp.name.slice(0, 2).toUpperCase()}
        </div>
      );
      const gm = groupMembersOf(grpId);
      members = gm.map((m) => ({
        player: m.player,
        role: m.role === "admin" ? "Admin" : undefined,
      }));
    }
  } else if (threadId.startsWith("dm:")) {
    const other = playerById(threadId.slice(3));
    if (other) {
      title = other.name;
      subtitle = other.city ?? "Direct message";
      avatar = <PlayerAvatar player={other} size={40} />;
      members = [{ player: other }];
    }
  }

  const contactItems: { key: string; label: string; value: string }[] = [];
  if (profile.phone) contactItems.push({ key: "phone", label: "Phone", value: profile.phone });
  if (profile.instagram) contactItems.push({ key: "instagram", label: "Instagram", value: profile.instagram });
  if (profile.snapchat) contactItems.push({ key: "snapchat", label: "Snapchat", value: profile.snapchat });
  if (profile.other_social) contactItems.push({ key: "other", label: "Other", value: profile.other_social });

  const shareContact = (item: { label: string; value: string }) => {
    sendMessage(threadId, `${item.label}: ${item.value}`, {
      kind: "contact",
      payload: { label: item.label, value: item.value },
    });
    setShareOpen(false);
    toast.success(`${item.label} shared`);
  };

  const onHeaderTap = () => {
    if (isGroupChat) {
      setMembersOpen(true);
    } else if (members[0]) {
      openPlayer(members[0].player);
    }
  };

  // Report target derived from thread kind
  const reportInfo: { type: "user" | "game" | "group"; id: string; label: string } | null =
    threadId.startsWith("dm:") && members[0]
      ? { type: "user", id: members[0].player.id, label: members[0].player.name }
      : threadId.startsWith("g:")
        ? { type: "game", id: threadId.slice(2), label: title }
        : threadId.startsWith("grp:")
          ? { type: "group", id: threadId.slice(4), label: title }
          : null;
  const dmPeer = threadId.startsWith("dm:") ? members[0]?.player ?? null : null;

  function ChatImage({
    path,
    onTap,
    className = "h-24 w-32",
  }: {
    path: string;
    onTap?: (url: string) => void;
    className?: string;
  }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
      let active = true;
      signChatPhoto(path)
        .then((u) => { if (active) setUrl(u); })
        .catch(() => { if (active) setUrl(null); });
      return () => { active = false; };
    }, [path]);
    if (!url) {
      return <div className={`${className} rounded-md bg-muted animate-pulse`} />;
    }
    return (
      <button
        type="button"
        onClick={() => onTap?.(url)}
        className={`relative block overflow-hidden rounded-md ${className} tap-scale`}
      >
        <img
          src={url}
          alt="Shared photo"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </button>
    );
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          toast.error("Only photos can be sent in chat");
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error("Photo must be under 10 MB");
          continue;
        }
        const path = await uploadChatPhotoAction(threadId, file);
        paths.push(path);
      }
      setAttachments((prev) => [...prev, ...paths]);
      if (paths.length) toast.success(paths.length === 1 ? "Photo attached" : `${paths.length} photos attached`);
    } catch (err) {
      toast.error("Failed to attach photo");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col mx-auto max-w-md">
      <header className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-border bg-card/95 backdrop-blur">
        <button
          onClick={onBack}
          className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center tap-scale"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onHeaderTap}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          {avatar}
          <div className="min-w-0">
            <p className="font-bold tracking-tight truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </button>

        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center tap-scale">
              <MoreVertical className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            {reportInfo && (
              <button
                onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent text-left"
              >
                <Flag className="h-4 w-4" /> Report
              </button>
            )}
            {dmPeer && (
              <button
                onClick={() => { setMenuOpen(false); setBlockOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent text-destructive text-left"
              >
                <Ban className="h-4 w-4" /> Block user
              </button>
            )}
          </PopoverContent>
        </Popover>
      </header>

      {reportInfo && (
        <ReportSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType={reportInfo.type}
          targetId={reportInfo.id}
          targetLabel={reportInfo.label}
        />
      )}
      {dmPeer && (
        <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Block {dmPeer.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                You won't see each other anywhere in Rally. You can unblock from Settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await blockUser(dmPeer.id);
                  toast(`Blocked ${dmPeer.name}`);
                  onBack();
                }}
              >
                Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}


      <MembersSheet
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={title}
        subtitle={subtitle}
        members={members}
      />


      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {thread.length === 0 && (
          <div className="text-center pt-16">
            <p className="text-3xl">💬</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No messages yet. Say hi!
            </p>
          </div>
        )}
        {thread.map((m) => {
          const mine = m.authorId === "me";
          const author = mine
            ? { ...me, name: profile.name }
            : playerById(m.authorId);
          const isContact = m.kind === "contact";
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}
            >
              {!mine && author && (
                <PlayerAvatar player={author} size={26} />
              )}
              <div
                className={
                  isContact
                    ? `max-w-[75%] rounded-md px-3.5 py-2 text-sm leading-snug border border-primary/40 bg-primary/5 text-foreground ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`
                    : mine
                      ? "max-w-[75%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm leading-snug bg-primary text-primary-foreground shadow-sm"
                      : "max-w-[75%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm leading-snug bg-card border border-border text-foreground shadow-sm"
                }
              >
                {!mine && author && (threadId.startsWith("g:") || threadId.startsWith("gr:")) && (
                  <p className="text-[11px] font-semibold mb-0.5" style={{ color: author.avatarColor }}>
                    {author.name}
                  </p>
                )}
                {isContact ? (
                  <div className="flex items-center gap-2">
                    <Contact className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Contact shared
                      </p>
                      <p className="font-semibold">{m.text}</p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                )}
                {m.attachments && m.attachments.length > 0 && (
                  <div className={`mt-2 flex gap-2 flex-wrap ${isContact || !m.text ? "" : ""}`}>
                    {m.attachments.map((path) => (
                      <ChatImage key={path} path={path} onTap={(url) => setLightbox(url)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size" className="max-h-full max-w-full rounded-sm object-contain" />
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const val = text.trim();
          if (!val && attachments.length === 0) return;
          setText("");
          const paths = attachments;
          setAttachments([]);
          void sendMessage(threadId, val, { attachments: paths.length ? paths : undefined });
        }}
        className="border-t border-border bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2"
      >
        <Popover open={shareOpen} onOpenChange={setShareOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-11 w-11 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground tap-scale"
              aria-label="Share contact"
            >
              <Paperclip className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-64 p-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              Share contact info
            </p>
            {contactItems.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3">
                Add contact info in your profile first.
              </p>
            ) : (
              <div className="space-y-1">
                {contactItems.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => shareContact(c)}
                    className="w-full text-left rounded-sm px-2 py-2 hover:bg-accent flex items-center justify-between"
                  >
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">
                      {c.label}
                    </span>
                    <span className="text-[13px] font-semibold truncate ml-2">
                      {c.value}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground px-2 pt-2">
              Only shared when you tap. Never automatic.
            </p>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-11 w-11 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 tap-scale"
          aria-label="Attach photo"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {attachments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {attachments.map((path) => (
                <div key={path} className="relative h-8 w-8 rounded-md overflow-hidden bg-muted">
                  <ChatImage path={path} className="h-full w-full" />
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((p) => p !== path))}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={attachments.length ? "Add a caption..." : "Message..."}
            autoComplete="off"
            className="w-full h-11 rounded-full bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() && attachments.length === 0}
          aria-label="Send message"
          className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors tap-scale"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
