import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  Game,
  PastGame,
  Player,
  Skill,
  SportKey,
} from "./rally-data";
import {
  addBuddyRow,
  cancelFriendRequestRow,
  cancelGameRow,
  colorFromSeed,
  consumeInviteCode,
  createGameRow,
  createGroup,
  createGroupInvite,
  decideJoinRequest,
  deleteGroup,
  endGameRow,
  ensureDmThread,
  ensureGameThread,
  ensureGroupThread,
  fetchBuddies,
  fetchFriendRequests,
  fetchGamePlayers,
  fetchGames,
  fetchGroupJoinRequests,
  fetchGroupMembers,
  fetchGroups,
  fetchKudos,
  fetchMessages,
  fetchMyProfile,
  fetchPoolProfiles,
  fetchThreadReads,
  fetchThreads,
  gameToGame,
  giveKudoRow,
  initialsOf,
  joinGameRow,
  leaveGameRow,
  leaveGroup,
  markThreadRead,
  profileToPlayer,
  promoteToAdmin,
  removeBuddyRow,
  removeGamePlayer,
  removeGroupMember,
  requestJoinGroup,
  respondFriendRequestRow,
  revokeKudoRow,
  sendFriendRequestRow,
  sendMessageRow,
  updateContactInfo,
  updatePrivacy,
  updateGroup,
  uploadAvatar,
  removeAvatar,
  uploadChatPhoto,
  fetchBlocks,
  blockUserRow,
  unblockUserRow,
  createReportRow,
  type DbBlock,
  type DbKudo,
  type DbThreadRead,
  type KudoKind,
  type ReportTarget,
  type ReportReason,
  type DbBuddy,
  type DbFriendRequest,
  type DbGame,
  type DbGamePlayer,
  type DbGroup,
  type DbGroupJoinRequest,
  type DbGroupMember,
  type DbMessage,
  type DbProfile,
  type DbThread,
} from "./rally-api";

interface UserProfile {
  name: string;
  sports: Partial<Record<SportKey, Skill>>;
  onboarded: boolean;
  city?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  instagram?: string;
  snapchat?: string;
  other_social?: string;
  discoverable: boolean;
  show_activity: boolean;
  show_location: boolean;
  show_sports: boolean;
  show_skill: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorId: string; // "me" or a DB user id
  text: string;
  ts: number;
  kind: "text" | "contact";
  payload?: Record<string, unknown> | null;
  attachments?: string[] | null;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  sports: string[];
  city: string | null;
  photoUrl: string | null;
  isPublic: boolean;
  createdBy: string;
  memberCount: number;
  myRole: "admin" | "member" | null;
  requestStatus: "pending" | null;
}

interface AuthInfo {
  status: "loading" | "signed_out" | "no_profile" | "ready";
  userId: string | null;
}

interface RallyState {
  auth: AuthInfo;
  me: Player;
  profile: UserProfile;
  games: Game[];
  pastGames: PastGame[];
  buddies: Player[];
  joinedIds: string[];
  gameRoster: (gameId: string) => Player[];
  dismissedInviteIds: string[];
  messages: ChatMessage[];
  activity: ActivityDay[];
  groups: GroupSummary[];
  groupMembersOf: (groupId: string) => { player: Player; role: "admin" | "member" }[];
  groupGamesOf: (groupId: string) => Game[];
  groupRequestsOf: (groupId: string) => { req: DbGroupJoinRequest; player?: Player }[];
  refresh: () => Promise<void>;
  setProfile: (p: UserProfile) => void;
  saveContactInfo: (patch: {
    phone?: string | null;
    instagram?: string | null;
    snapchat?: string | null;
    other_social?: string | null;
  }) => Promise<void>;
  updatePrivacyAction: (patch: Partial<{
    discoverable: boolean;
    show_activity: boolean;
    show_location: boolean;
    show_sports: boolean;
    show_skill: boolean;
  }>) => Promise<void>;
  uploadAvatarAction: (file: File) => Promise<void>;
  removeAvatarAction: () => Promise<void>;
  uploadChatPhotoAction: (threadId: string, file: File) => Promise<string>;
  discoverablePeople: Player[];
  addGame: (g: {
    sport: SportKey;
    when: string;
    whenAt: Date;
    location: string;
    lat: number | null;
    lng: number | null;
    spotsTotal: number;
    skill: Skill;
    note?: string;
    groupId?: string | null;
  }) => Promise<void>;

  joinGame: (id: string) => Promise<void>;
  leaveGame: (id: string) => Promise<void>;
  cancelGame: (id: string) => Promise<void>;
  endGame: (id: string) => Promise<void>;
  isActiveGame: (game: Game) => boolean;
  removePlayer: (gameId: string, userId: string) => Promise<void>;
  dismissInvite: (id: string) => void;
  addBuddy: (p: Player) => Promise<void>;
  removeBuddy: (playerId: string) => Promise<void>;
  incomingRequests: { req: DbFriendRequest; player?: Player }[];
  outgoingRequests: { req: DbFriendRequest; player?: Player }[];
  friendshipStatus: (playerId: string) =>
    | { kind: "self" }
    | { kind: "friends" }
    | { kind: "outgoing"; reqId: string }
    | { kind: "incoming"; reqId: string }
    | { kind: "none" };
  acceptFriendRequest: (reqId: string) => Promise<void>;
  declineFriendRequest: (reqId: string) => Promise<void>;
  cancelFriendRequest: (reqId: string) => Promise<void>;
  sendMessage: (
    threadId: string,
    text: string,
    opts?: { kind?: "contact"; payload?: Record<string, unknown>; attachments?: string[] },
  ) => Promise<void>;
  playerById: (id: string) => Player | undefined;
  // Group actions
  createGroupAction: (input: {
    name: string;
    description?: string;
    sports: string[];
    city?: string;
    lat?: number | null;
    lng?: number | null;
    isPublic: boolean;
  }) => Promise<string>;
  updateGroupAction: (
    groupId: string,
    patch: {
      name?: string;
      description?: string;
      sports?: string[];
      city?: string;
      lat?: number | null;
      lng?: number | null;
      is_public?: boolean;
    },
  ) => Promise<void>;
  deleteGroupAction: (groupId: string) => Promise<void>;
  requestJoinGroupAction: (groupId: string) => Promise<void>;
  decideGroupRequest: (
    requestId: string,
    status: "approved" | "denied",
  ) => Promise<void>;
  leaveGroupAction: (groupId: string) => Promise<void>;
  removeGroupMemberAction: (groupId: string, userId: string) => Promise<void>;
  promoteAction: (groupId: string, userId: string) => Promise<void>;
  createInviteAction: (groupId: string) => Promise<string>;
  consumeInviteAction: (code: string) => Promise<string>;
  blockedUsers: Player[];
  isBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  reportItem: (input: {
    targetType: ReportTarget;
    targetId: string;
    reason: ReportReason;
    details?: string;
  }) => Promise<void>;
  unreadCount: (threadKey: string) => number;
  unreadTotal: number;
  markThreadReadAction: (threadKey: string) => Promise<void>;
  kudosCountByUser: (playerId: string) => number;
  kudosBreakdownByUser: (playerId: string) => Partial<Record<KudoKind, number>>;
  kudosGivenBy: (gameId: string, toUserId: string) => Set<KudoKind>;
  giveKudoAction: (input: { gameId: string; toUserId: string; kind: KudoKind }) => Promise<void>;
  revokeKudoAction: (kudoId: string) => Promise<void>;
  kudoIdOf: (gameId: string, fromUserId: string, toUserId: string, kind: KudoKind) => string | null;
  logout: () => Promise<void>;
}

const Ctx = createContext<RallyState | null>(null);

const defaultProfile: UserProfile = {
  name: "You",
  sports: {},
  onboarded: false,
  discoverable: true,
  show_activity: false,
  show_location: true,
  show_sports: true,
  show_skill: false,
};

const emptyMe: Player = {
  id: "me",
  name: "You",
  initials: "Y",
  avatarColor: "#16a34a",
};

function buildActivityGrid(
  days: number,
  countsByDate: Map<string, number>,
): ActivityDay[] {
  const out: ActivityDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: countsByDate.get(key) ?? 0 });
  }
  return out;
}

export function RallyProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthInfo["status"]>("loading");

  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);
  const [poolProfiles, setPoolProfiles] = useState<DbProfile[]>([]);
  const [dbGames, setDbGames] = useState<DbGame[]>([]);
  const [gamePlayers, setGamePlayers] = useState<DbGamePlayer[]>([]);
  const [threads, setThreads] = useState<DbThread[]>([]);
  const [dbMessages, setDbMessages] = useState<DbMessage[]>([]);
  const [dbBuddies, setDbBuddies] = useState<DbBuddy[]>([]);
  const [dbGroups, setDbGroups] = useState<DbGroup[]>([]);
  const [dbGroupMembers, setDbGroupMembers] = useState<DbGroupMember[]>([]);
  const [dbJoinRequests, setDbJoinRequests] = useState<DbGroupJoinRequest[]>([]);
  const [dbFriendReqs, setDbFriendReqs] = useState<DbFriendRequest[]>([]);
  const [dbBlocks, setDbBlocks] = useState<DbBlock[]>([]);
  const [dbKudos, setDbKudos] = useState<DbKudo[]>([]);
  const [dbThreadReads, setDbThreadReads] = useState<DbThreadRead[]>([]);
  const [dismissedInviteIds, setDismissed] = useState<string[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setAuthStatus("signed_out");
    });
  }, []);

  const loadAll = useCallback(async (userId: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const profile = await fetchMyProfile(userId);
      setDbProfile(profile);
      if (!profile) {
        setAuthStatus("no_profile");
        return;
      }
      const [pps, gs, gps, ts, ms, bs, grps, gms, jrs, frs, blks, kds, trs] = await Promise.all([
        fetchPoolProfiles(),
        fetchGames(),
        fetchGamePlayers(),
        fetchThreads(),
        fetchMessages(),
        fetchBuddies(userId),
        fetchGroups(),
        fetchGroupMembers(),
        fetchGroupJoinRequests(),
        fetchFriendRequests(),
        fetchBlocks().catch(() => [] as DbBlock[]),
        fetchKudos().catch(() => [] as DbKudo[]),
        fetchThreadReads(userId).catch(() => [] as DbThreadRead[]),
      ]);
      setPoolProfiles(pps);
      setDbGames(gs);
      setGamePlayers(gps);
      setThreads(ts);
      setDbMessages(ms);
      setDbBuddies(bs);
      setDbGroups(grps);
      setDbGroupMembers(gms);
      setDbJoinRequests(jrs);
      setDbFriendReqs(frs);
      setDbBlocks(blks);
      setDbKudos(kds);
      setDbThreadReads(trs);
      setAuthStatus("ready");
    } catch (e) {
      console.error("Failed to load rally data", e);
      setAuthStatus("ready");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    setAuthStatus("loading");
    loadAll(session.user.id);
  }, [session, loadAll]);

  // Realtime: subscribe once per session; refresh on any change to relevant tables.
  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) return;
      timer = setTimeout(async () => {
        timer = null;
        // If a load is already in flight, retry shortly after.
        if (loadingRef.current) {
          timer = setTimeout(scheduleRefresh, 400);
          return;
        }
        await loadAll(uid);
      }, 800);
    };
    const tables = [
      "games",
      "game_players",
      "messages",
      "threads",
      "thread_reads",
      "friend_requests",
      "buddies",
      "groups",
      "group_members",
      "group_join_requests",
      "blocks",
      "kudos",
      "profiles",
    ];
    const channel = supabase.channel(`rally-live-${uid}`);
    for (const t of tables) {
      channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: t } as never,
        scheduleRefresh,
      );
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [session, loadAll]);


  const refresh = useCallback(async () => {
    if (!session) return;
    await loadAll(session.user.id);
  }, [session, loadAll]);

  const userId = session?.user.id ?? "";

  const profile: UserProfile = useMemo(() => {
    if (!dbProfile) return defaultProfile;
    return {
      name: dbProfile.full_name,
      sports: (dbProfile.sports ?? {}) as Partial<Record<SportKey, Skill>>,
      onboarded: true,
      city: dbProfile.city ?? undefined,
      lat: dbProfile.lat ?? undefined,
      lng: dbProfile.lng ?? undefined,
      phone: (dbProfile as unknown as { phone?: string }).phone ?? undefined,
      instagram: (dbProfile as unknown as { instagram?: string }).instagram ?? undefined,
      snapchat: (dbProfile as unknown as { snapchat?: string }).snapchat ?? undefined,
      other_social: (dbProfile as unknown as { other_social?: string }).other_social ?? undefined,
      discoverable: dbProfile.discoverable ?? true,
      show_activity: dbProfile.show_activity ?? false,
      show_location: dbProfile.show_location ?? true,
      show_sports: dbProfile.show_sports ?? true,
      show_skill: dbProfile.show_skill ?? false,
    };
  }, [dbProfile]);

  const me: Player = useMemo(() => {
    if (!dbProfile) return emptyMe;
    return {
      id: "me",
      name: dbProfile.full_name,
      initials: initialsOf(dbProfile.full_name),
      avatarColor: colorFromSeed(dbProfile.avatar_seed || dbProfile.id),
      avatarPath: dbProfile.avatar_url ?? null,
    };
  }, [dbProfile]);

  const viewer =
    dbProfile?.lat != null && dbProfile?.lng != null
      ? { lat: dbProfile.lat, lng: dbProfile.lng }
      : null;

  const allGames = useMemo(
    () => dbGames.map((g) => gameToGame(g, userId, viewer)),
    [dbGames, userId, viewer],
  );

  // A game is "past" when the host marked it complete OR its scheduled
  // time has elapsed. This drives PastGames, activity, and stats.
  const isPastFlags = useMemo(() => {
    const now = Date.now();
    return dbGames.map((g) => {
      if (g.is_past) return true;
      if (!g.when_at) return false;
      return new Date(g.when_at).getTime() < now;
    });
  }, [dbGames]);

  const games = useMemo(
    () => allGames.filter((_, i) => !isPastFlags[i]),
    [allGames, isPastFlags],
  );

  // Games played per user (always visible — trust signal exception)
  const gamesPlayedByUser = useMemo(() => {
    const counts = new Map<string, number>();
    const pastIds = new Set(
      dbGames.filter((_, i) => isPastFlags[i]).map((g) => g.id),
    );
    for (const gp of gamePlayers) {
      if (pastIds.has(gp.game_id)) counts.set(gp.user_id, (counts.get(gp.user_id) ?? 0) + 1);
    }
    return counts;
  }, [dbGames, gamePlayers, isPastFlags]);

  const playerById = useCallback(
    (id: string): Player | undefined => {
      const enrich = (p: Player, rawId: string, src?: DbProfile) => {
        p.gamesPlayed = gamesPlayedByUser.get(rawId) ?? 0;
        if (src && rawId !== dbProfile?.id) {
          if (!(src.show_location ?? true)) p.city = undefined;
          if (!(src.show_sports ?? true)) p.favoriteSports = [];
        }
        return p;
      };
      if (id === "me") return enrich({ ...me }, dbProfile?.id ?? "me");
      if (dbProfile && id === dbProfile.id) return enrich({ ...me }, dbProfile.id);
      const p = poolProfiles.find((x) => x.id === id);
      if (p) return enrich(profileToPlayer(p, dbProfile?.id ?? ""), p.id, p);
      return undefined;
    },
    [poolProfiles, dbProfile, me, gamesPlayedByUser],
  );

  const gameRoster = useCallback(
    (gameId: string): Player[] => {
      return gamePlayers
        .filter((gp) => gp.game_id === gameId)
        .map((gp) => playerById(gp.user_id))
        .filter((p): p is Player => !!p);
    },
    [gamePlayers, playerById],
  );

  const pastGames: PastGame[] = useMemo(() => {
    const past = dbGames.filter((_, i) => isPastFlags[i]);
    return past
      .map((g) => {
        const roster = gameRoster(g.id);
        // Ensure host is included (host may not have a game_players row)
        const hasHost = roster.some(
          (p) =>
            p.id === g.host_user_id ||
            (p.id === "me" && g.host_user_id === userId),
        );
        if (!hasHost && g.host_user_id) {
          const host = playerById(g.host_user_id);
          if (host) roster.unshift(host);
        }
        // "Played with" = everyone in the game except the viewer themselves
        const players = roster.filter(
          (p) => p.id !== "me" && p.id !== userId,
        );
        const when = new Date(g.when_at ?? g.created_at);
        return {
          id: g.id,
          sport: g.sport as SportKey,
          date: when.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          time: g.when_at
            ? when.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })
            : undefined,
          playedAt: when.getTime(),
          location: g.location,
          note: g.notes ?? undefined,
          players,
        };
      })
      .sort((a, b) => b.playedAt - a.playedAt);
  }, [dbGames, gameRoster, isPastFlags, playerById, userId]);


  const joinedIds = useMemo(
    () =>
      gamePlayers
        .filter((gp) => gp.user_id === userId)
        .map((gp) => gp.game_id),
    [gamePlayers, userId],
  );

  const buddies: Player[] = useMemo(() => {
    return dbBuddies
      .map((b) => playerById(b.buddy_user_id))
      .filter((p): p is Player => !!p);
  }, [dbBuddies, playerById]);

  const messages: ChatMessage[] = useMemo(() => {
    const threadMap = new Map<string, DbThread>();
    threads.forEach((t) => threadMap.set(t.id, t));
    const threadKeyOf = (t: DbThread): string => {
      if (t.kind === "game" && t.game_id) return `g:${t.game_id}`;
      const anyT = t as unknown as { kind: string; group_id?: string };
      if (anyT.kind === "group" && anyT.group_id) return `gr:${anyT.group_id}`;
      const other =
        t.owner_user_id === userId ? t.peer_user_id : t.owner_user_id;
      return `dm:${other ?? "unknown"}`;
    };
    return dbMessages
      .map((m) => {
        const t = threadMap.get(m.thread_id);
        if (!t) return null;
        const authorId = m.author_user_id === userId ? "me" : m.author_user_id;
        return {
          id: m.id,
          threadId: threadKeyOf(t),
          authorId,
          text: m.text,
          ts: new Date(m.ts).getTime(),
          kind: m.kind ?? "text",
          payload: m.payload ?? null,
          attachments: m.attachments ?? null,
        } as ChatMessage;
      })
      .filter((m): m is ChatMessage => !!m);
  }, [dbMessages, threads, userId]);

  const activity: ActivityDay[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pg of pastGames) {
      const key = new Date(pg.playedAt).toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return buildActivityGrid(120, counts);
  }, [pastGames]);

  const pool = dbProfile?.pool ?? "adult";

  const doJoin = async (id: string) => {
    if (!userId) return;
    // Optimistic: add to game_players, bump spots_taken
    setGamePlayers((prev) =>
      prev.some((gp) => gp.game_id === id && gp.user_id === userId)
        ? prev
        : [...prev, { game_id: id, user_id: userId, pool, joined_at: new Date().toISOString() }],
    );
    setDbGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, spots_taken: g.spots_taken + 1 } : g)),
    );
    try {
      await joinGameRow(id, userId, pool);
    } catch (e) {
      await refresh();
      throw e;
    }
  };

  const doLeave = async (id: string) => {
    if (!userId) return;
    await leaveGameRow(id, userId);
    setGamePlayers((prev) =>
      prev.filter((gp) => !(gp.game_id === id && gp.user_id === userId)),
    );
    setDbGames((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, spots_taken: Math.max(0, g.spots_taken - 1) } : g,
      ),
    );
  };

  const doCancel = async (id: string) => {
    await cancelGameRow(id);
    setDbGames((prev) => prev.filter((g) => g.id !== id));
    setGamePlayers((prev) => prev.filter((gp) => gp.game_id !== id));
    setThreads((prev) => prev.filter((t) => t.game_id !== id));
  };

  const doEndGame = async (id: string) => {
    await endGameRow(id);
    setDbGames((prev) => prev.map((g) => (g.id === id ? { ...g, is_past: true } : g)));
  };

  const isActiveGame = useCallback((g: Game): boolean => {
    if (!g.whenAt) return false;
    const now = Date.now();
    const start = g.whenAt - 15 * 60 * 1000; // starts up to 15 min early
    const end = g.whenAt + 3 * 60 * 60 * 1000; // active for ~3h window
    return now >= start && now <= end;
  }, []);

  const doRemovePlayer = async (gameId: string, uid: string) => {
    await removeGamePlayer(gameId, uid);
    setGamePlayers((prev) =>
      prev.filter((gp) => !(gp.game_id === gameId && gp.user_id === uid)),
    );
    setDbGames((prev) =>
      prev.map((g) =>
        g.id === gameId ? { ...g, spots_taken: Math.max(0, g.spots_taken - 1) } : g,
      ),
    );
  };


  const doAddGame: RallyState["addGame"] = async (g) => {
    if (!dbProfile) return;
    await createGameRow({
      userId: dbProfile.id,
      userName: dbProfile.full_name,
      userAvatarSeed: dbProfile.avatar_seed,
      pool: dbProfile.pool,
      sport: g.sport,
      when_label: g.when,
      when_at: g.whenAt.toISOString(),
      location: g.location,
      lat: g.lat,
      lng: g.lng,
      spots_total: g.spotsTotal,
      skill: g.skill,
      notes: g.note,
      group_id: g.groupId ?? null,
    });
    await refresh();
  };

  // ============ Groups derived state ============
  const groups: GroupSummary[] = useMemo(() => {
    return dbGroups.map((g) => {
      const memberCount = dbGroupMembers.filter((m) => m.group_id === g.id).length;
      const mine = userId
        ? dbGroupMembers.find((m) => m.group_id === g.id && m.user_id === userId)
        : undefined;
      const req = userId
        ? dbJoinRequests.find(
            (r) =>
              r.group_id === g.id &&
              r.user_id === userId &&
              r.status === "pending",
          )
        : undefined;
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        sports: g.sports,
        city: g.city,
        photoUrl: g.photo_url,
        isPublic: g.is_public,
        createdBy: g.created_by,
        memberCount,
        myRole: mine ? (mine.role as "admin" | "member") : null,
        requestStatus: req ? "pending" : null,
      };
    });
  }, [dbGroups, dbGroupMembers, dbJoinRequests, userId]);

  const groupMembersOf = useCallback(
    (groupId: string) =>
      dbGroupMembers
        .filter((m) => m.group_id === groupId)
        .map((m) => {
          const player = playerById(m.user_id);
          return player
            ? { player, role: m.role as "admin" | "member" }
            : null;
        })
        .filter((x): x is { player: Player; role: "admin" | "member" } => !!x),
    [dbGroupMembers, playerById],
  );

  const groupGamesOf = useCallback(
    (groupId: string) =>
      allGames.filter(
        (_, i) =>
          (dbGames[i] as unknown as { group_id?: string | null }).group_id ===
            groupId && !dbGames[i].is_past,
      ),
    [allGames, dbGames],
  );

  const groupRequestsOf = useCallback(
    (groupId: string) =>
      dbJoinRequests
        .filter((r) => r.group_id === groupId && r.status === "pending")
        .map((req) => ({ req, player: playerById(req.user_id) })),
    [dbJoinRequests, playerById],
  );

  const doCreateGroup: RallyState["createGroupAction"] = async (input) => {
    if (!dbProfile) throw new Error("Not signed in");
    const id = await createGroup({
      name: input.name,
      description: input.description,
      sports: input.sports,
      city: input.city,
      lat: input.lat,
      lng: input.lng,
      is_public: input.isPublic,
      userId: dbProfile.id,
    });
    await refresh();
    return id;
  };

  const doUpdateGroup: RallyState["updateGroupAction"] = async (id, patch) => {
    await updateGroup(id, patch as never);
    await refresh();
  };

  const doDeleteGroup = async (id: string) => {
    await deleteGroup(id);
    await refresh();
  };

  const doRequestJoin = async (id: string) => {
    if (!dbProfile) return;
    await requestJoinGroup(id, dbProfile.id);
    await refresh();
  };

  const doDecideRequest = async (
    requestId: string,
    status: "approved" | "denied",
  ) => {
    await decideJoinRequest(requestId, status);
    await refresh();
  };

  const doLeaveGroup = async (id: string) => {
    if (!dbProfile) return;
    await leaveGroup(id, dbProfile.id);
    await refresh();
  };

  const doRemoveMember = async (groupId: string, uid: string) => {
    await removeGroupMember(groupId, uid);
    await refresh();
  };

  const doPromote = async (groupId: string, uid: string) => {
    await promoteToAdmin(groupId, uid);
    await refresh();
  };

  const doCreateInvite = async (groupId: string) => {
    if (!dbProfile) throw new Error("Not signed in");
    const code = await createGroupInvite(groupId, dbProfile.id);
    return code;
  };

  const doConsumeInvite = async (code: string) => {
    const groupId = await consumeInviteCode(code);
    await refresh();
    return groupId;
  };

  const doBlockUser = async (uid: string) => {
    await blockUserRow(uid);
    setDbBlocks((prev) =>
      prev.some((b) => b.blocked_user_id === uid)
        ? prev
        : [
            ...prev,
            {
              id: `tmp-${uid}`,
              blocker_user_id: dbProfile?.id ?? "",
              blocked_user_id: uid,
              pool: (dbProfile?.pool ?? "adult") as never,
              created_at: new Date().toISOString(),
            },
          ],
    );
    await refresh();
  };

  const doUnblockUser = async (uid: string) => {
    await unblockUserRow(uid);
    setDbBlocks((prev) => prev.filter((b) => b.blocked_user_id !== uid));
    await refresh();
  };

  const doReport: RallyState["reportItem"] = async (input) => {
    await createReportRow(input);
  };

  const doSaveContact: RallyState["saveContactInfo"] = async (patch) => {
    if (!dbProfile) return;
    await updateContactInfo(dbProfile.id, patch);
    setDbProfile({ ...dbProfile, ...(patch as Record<string, unknown>) } as DbProfile);
  };

  const doUpdatePrivacy: RallyState["updatePrivacyAction"] = async (patch) => {
    if (!dbProfile) return;
    await updatePrivacy(dbProfile.id, patch);
    setDbProfile({ ...dbProfile, ...(patch as Record<string, unknown>) } as DbProfile);
  };

  const doUploadAvatar: RallyState["uploadAvatarAction"] = async (file) => {
    if (!dbProfile) return;
    const path = await uploadAvatar(dbProfile.id, file);
    setDbProfile({ ...dbProfile, avatar_url: path });
  };

  const doRemoveAvatar: RallyState["removeAvatarAction"] = async () => {
    if (!dbProfile) return;
    await removeAvatar(dbProfile.id, dbProfile.avatar_url);
    setDbProfile({ ...dbProfile, avatar_url: null });
  };

  // People to discover: same pool (already enforced by RLS on fetch), same city,
  // opted-in via `discoverable`, not me, not already a buddy.
  const discoverablePeople: Player[] = useMemo(() => {
    if (!dbProfile) return [];
    const buddyIds = new Set(dbBuddies.map((b) => b.buddy_user_id));
    const myCity = (dbProfile.city ?? "").trim().toLowerCase();
    return poolProfiles
      .filter((p) => p.id !== dbProfile.id)
      .filter((p) => (p.discoverable ?? true) === true)
      .filter((p) => !buddyIds.has(p.id))
      .filter((p) => !myCity || (p.city ?? "").trim().toLowerCase() === myCity)
      .map((p) => {
        const pl = profileToPlayer(p, dbProfile.id);
        pl.gamesPlayed = gamesPlayedByUser.get(p.id) ?? 0;
        if (!(p.show_location ?? true)) pl.city = undefined;
        if (!(p.show_sports ?? true)) pl.favoriteSports = [];
        return pl;
      });
  }, [poolProfiles, dbProfile, dbBuddies, gamesPlayedByUser]);




  // --- Friend requests ---
  const incomingRequests = useMemo(
    () =>
      dbFriendReqs
        .filter((r) => r.to_user_id === userId && r.status === "pending")
        .map((req) => ({ req, player: playerById(req.from_user_id) })),
    [dbFriendReqs, userId, playerById],
  );

  const outgoingRequests = useMemo(
    () =>
      dbFriendReqs
        .filter((r) => r.from_user_id === userId && r.status === "pending")
        .map((req) => ({ req, player: playerById(req.to_user_id) })),
    [dbFriendReqs, userId, playerById],
  );

  const friendshipStatus: RallyState["friendshipStatus"] = useCallback(
    (playerId) => {
      if (!dbProfile) return { kind: "none" };
      const rawId = playerId === "me" ? dbProfile.id : playerId;
      if (rawId === dbProfile.id) return { kind: "self" };
      if (dbBuddies.some((b) => b.buddy_user_id === rawId))
        return { kind: "friends" };
      const outgoing = dbFriendReqs.find(
        (r) =>
          r.from_user_id === userId &&
          r.to_user_id === rawId &&
          r.status === "pending",
      );
      if (outgoing) return { kind: "outgoing", reqId: outgoing.id };
      const incoming = dbFriendReqs.find(
        (r) =>
          r.to_user_id === userId &&
          r.from_user_id === rawId &&
          r.status === "pending",
      );
      if (incoming) return { kind: "incoming", reqId: incoming.id };
      return { kind: "none" };
    },
    [dbProfile, userId, dbBuddies, dbFriendReqs],
  );

  // "addBuddy" now sends a friend request (mutual accept required).
  const doAddBuddy = async (p: Player) => {
    if (!userId || !dbProfile) return;
    const toId = p.id === "me" ? dbProfile.id : p.id;
    if (toId === dbProfile.id) return;
    if (dbBuddies.some((b) => b.buddy_user_id === toId)) return;
    if (
      dbFriendReqs.some(
        (r) =>
          r.status === "pending" &&
          ((r.from_user_id === userId && r.to_user_id === toId) ||
            (r.from_user_id === toId && r.to_user_id === userId)),
      )
    )
      return;
    await sendFriendRequestRow(userId, toId);
    await refresh();
  };

  const doRemoveBuddy = async (playerId: string) => {
    if (!userId) return;
    const raw = playerId === "me" ? (dbProfile?.id ?? "") : playerId;
    // Remove both directions of the friendship.
    await removeBuddyRow(userId, raw);
    await removeBuddyRow(raw, userId).catch(() => {});
    await refresh();
  };

  const doAcceptRequest = async (reqId: string) => {
    await respondFriendRequestRow(reqId, "accepted");
    await refresh();
  };
  const doDeclineRequest = async (reqId: string) => {
    await respondFriendRequestRow(reqId, "declined");
    await refresh();
  };
  const doCancelRequest = async (reqId: string) => {
    await cancelFriendRequestRow(reqId);
    await refresh();
  };


  const doSendMessage: RallyState["sendMessage"] = async (
    threadId,
    text,
    opts,
  ) => {
    const clean = text.trim();
    if (!dbProfile) return;
    if (!clean && opts?.kind !== "contact" && !(opts?.attachments && opts.attachments.length > 0)) return;

    // Optimistic append so the message shows up instantly.
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();
    const optimistic: DbMessage = {
      id: optimisticId,
      thread_id: `local:${threadId}`,
      author_user_id: dbProfile.id,
      author_name: dbProfile.full_name,
      text: clean,
      ts: nowIso,
      pool: dbProfile.pool,
      kind: (opts?.kind ?? "text") as never,
      payload: (opts?.payload ?? null) as never,
      attachments: (opts?.attachments ?? null) as never,
    } as unknown as DbMessage;
    // Ensure a local thread mapping exists so the optimistic message renders.
    const localThread: DbThread = {
      id: `local:${threadId}`,
      kind: threadId.startsWith("g:")
        ? "game"
        : threadId.startsWith("gr:")
          ? ("group" as never)
          : "dm",
      game_id: threadId.startsWith("g:") ? threadId.slice(2) : null,
      owner_user_id: dbProfile.id,
      peer_user_id: threadId.startsWith("dm:") ? threadId.slice(3) : null,
      pool: dbProfile.pool,
      created_at: nowIso,
      title: null,
      ...(threadId.startsWith("gr:") ? { group_id: threadId.slice(3) } : {}),
    } as unknown as DbThread;
    setThreads((prev) =>
      prev.some((t) => t.id === localThread.id) ? prev : [...prev, localThread],
    );
    setDbMessages((prev) => [...prev, optimistic]);

    try {
      let dbThreadId: string | null = null;
      if (threadId.startsWith("g:")) {
        const gid = threadId.slice(2);
        const game = dbGames.find((x) => x.id === gid);
        dbThreadId = await ensureGameThread(
          gid,
          dbProfile.id,
          dbProfile.pool,
          game?.location ?? "Game chat",
        );
      } else if (threadId.startsWith("gr:")) {
        const grid = threadId.slice(3);
        const grp = dbGroups.find((x) => x.id === grid);
        dbThreadId = await ensureGroupThread(
          grid,
          dbProfile.id,
          dbProfile.pool,
          grp?.name ?? "Group chat",
        );
      } else if (threadId.startsWith("dm:")) {
        const peerId = threadId.slice(3);
        const peer = poolProfiles.find((p) => p.id === peerId);
        dbThreadId = await ensureDmThread(
          dbProfile.id,
          peerId,
          dbProfile.pool,
          peer?.full_name ?? "DM",
        );
      }
      if (!dbThreadId) return;
      await sendMessageRow(
        dbThreadId,
        dbProfile.id,
        dbProfile.full_name,
        clean,
        dbProfile.pool,
        { kind: opts?.kind ?? "text", payload: opts?.payload, attachments: opts?.attachments },
      );
      const [ts, ms] = await Promise.all([fetchThreads(), fetchMessages()]);
      setThreads(ts);
      setDbMessages(ms);
    } catch (e) {
      // Rollback the optimistic message on failure.
      setDbMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      console.error("send message failed", e);
    }
  };

  const doUploadChatPhoto = async (threadId: string, file: File): Promise<string> => {
    if (!dbProfile) throw new Error("Not signed in");
    return uploadChatPhoto(dbProfile.id, threadId, file);
  };

  const doSetProfile = (p: UserProfile) => {
    if (!dbProfile) return;
    supabase
      .from("profiles")
      .update({ sports: p.sports as Record<string, Skill> })
      .eq("id", dbProfile.id)
      .then(({ error }) => {
        if (error) console.error(error);
      });
    setDbProfile({ ...dbProfile, sports: p.sports as Record<string, Skill> });
  };

  const doLogout = async () => {
    await supabase.auth.signOut();
    setDbProfile(null);
    setPoolProfiles([]);
    setDbGames([]);
    setGamePlayers([]);
    setThreads([]);
    setDbMessages([]);
    setDbBuddies([]);
    setDbGroups([]);
    setDbGroupMembers([]);
    setDbJoinRequests([]);
    setDismissed([]);
    setSession(null);
    setAuthStatus("signed_out");
  };

  const blockedUserIds = useMemo(
    () => new Set(dbBlocks.map((b) => b.blocked_user_id)),
    [dbBlocks],
  );
  const isBlocked = useCallback((uid: string) => blockedUserIds.has(uid), [blockedUserIds]);
  const blockedUsers: Player[] = useMemo(() => {
    return dbBlocks
      .map((b) => {
        const p = poolProfiles.find((x) => x.id === b.blocked_user_id);
        if (p) return profileToPlayer(p, dbProfile?.id ?? "");
        return {
          id: b.blocked_user_id,
          name: "Blocked user",
          initials: "?",
          avatarColor: "#94a3b8",
        } as Player;
      });
  }, [dbBlocks, poolProfiles, dbProfile]);

  // ============ Thread reads / unread counts ============
  const threadKeyOf = useCallback(
    (t: DbThread): string => {
      if (t.kind === "game" && t.game_id) return `g:${t.game_id}`;
      const anyT = t as unknown as { kind: string; group_id?: string };
      if (anyT.kind === "group" && anyT.group_id) return `gr:${anyT.group_id}`;
      const other =
        t.owner_user_id === userId ? t.peer_user_id : t.owner_user_id;
      return `dm:${other ?? "unknown"}`;
    },
    [userId],
  );

  const lastReadByKey = useMemo(() => {
    const out = new Map<string, number>();
    for (const r of dbThreadReads) {
      const t = threads.find((x) => x.id === r.thread_id);
      if (!t) continue;
      const key = threadKeyOf(t);
      const ts = new Date(r.last_read_at).getTime();
      const prev = out.get(key) ?? 0;
      if (ts > prev) out.set(key, ts);
    }
    return out;
  }, [dbThreadReads, threads, threadKeyOf]);

  // Optimistic local overlay so opening a chat clears the badge instantly.
  const [localReads, setLocalReads] = useState<Map<string, number>>(new Map());
  const effectiveLastRead = useCallback(
    (key: string): number =>
      Math.max(lastReadByKey.get(key) ?? 0, localReads.get(key) ?? 0),
    [lastReadByKey, localReads],
  );

  const unreadCount = useCallback(
    (key: string): number => {
      const cutoff = effectiveLastRead(key);
      let n = 0;
      for (const m of messages) {
        if (m.threadId !== key) continue;
        if (m.authorId === "me") continue;
        if (m.ts > cutoff) n++;
      }
      return n;
    },
    [messages, effectiveLastRead],
  );

  const unreadTotal = useMemo(() => {
    const seen = new Set<string>();
    let n = 0;
    for (const m of messages) {
      if (m.authorId === "me") continue;
      if (seen.has(m.threadId)) continue;
      seen.add(m.threadId);
      n += unreadCount(m.threadId);
    }
    return n;
  }, [messages, unreadCount]);

  const doMarkThreadRead = useCallback(
    async (key: string) => {
      // Optimistic: clear locally right now.
      setLocalReads((prev) => {
        const next = new Map(prev);
        next.set(key, Date.now());
        return next;
      });
      if (!userId) return;
      // Resolve the DB thread id for this key.
      const t = threads.find((x) => threadKeyOf(x) === key);
      if (!t || t.id.startsWith("local:")) return;
      try {
        await markThreadRead(t.id, userId);
      } catch (err) {
        console.error("mark read failed", err);
      }
    },
    [threads, threadKeyOf, userId],
  );

  // ============ Kudos ============
  const kudosCountByUser = useCallback(
    (playerId: string): number => {
      const raw = playerId === "me" ? dbProfile?.id ?? "" : playerId;
      if (!raw) return 0;
      return dbKudos.filter((k) => k.to_user_id === raw).length;
    },
    [dbKudos, dbProfile],
  );

  const kudosBreakdownByUser = useCallback(
    (playerId: string): Partial<Record<KudoKind, number>> => {
      const raw = playerId === "me" ? dbProfile?.id ?? "" : playerId;
      const out: Partial<Record<KudoKind, number>> = {};
      if (!raw) return out;
      for (const k of dbKudos) {
        if (k.to_user_id !== raw) continue;
        out[k.kind] = (out[k.kind] ?? 0) + 1;
      }
      return out;
    },
    [dbKudos, dbProfile],
  );

  const kudosGivenBy = useCallback(
    (gameId: string, toUserId: string): Set<KudoKind> => {
      if (!userId) return new Set();
      const raw = toUserId === "me" ? dbProfile?.id ?? "" : toUserId;
      const s = new Set<KudoKind>();
      for (const k of dbKudos) {
        if (k.game_id === gameId && k.from_user_id === userId && k.to_user_id === raw) {
          s.add(k.kind);
        }
      }
      return s;
    },
    [dbKudos, userId, dbProfile],
  );

  const kudoIdOf: RallyState["kudoIdOf"] = useCallback(
    (gameId, fromUserId, toUserId, kind) => {
      const from = fromUserId === "me" ? dbProfile?.id ?? "" : fromUserId;
      const to = toUserId === "me" ? dbProfile?.id ?? "" : toUserId;
      const hit = dbKudos.find(
        (k) =>
          k.game_id === gameId &&
          k.from_user_id === from &&
          k.to_user_id === to &&
          k.kind === kind,
      );
      return hit?.id ?? null;
    },
    [dbKudos, dbProfile],
  );

  const doGiveKudo: RallyState["giveKudoAction"] = async ({ gameId, toUserId, kind }) => {
    if (!userId || !dbProfile) return;
    const to = toUserId === "me" ? dbProfile.id : toUserId;
    if (to === userId) return;
    // Optimistic
    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: DbKudo = {
      id: tempId,
      game_id: gameId,
      from_user_id: userId,
      to_user_id: to,
      kind,
      pool: dbProfile.pool,
      created_at: new Date().toISOString(),
    };
    setDbKudos((prev) => [...prev, optimistic]);
    try {
      await giveKudoRow({ gameId, fromUserId: userId, toUserId: to, kind });
      const fresh = await fetchKudos();
      setDbKudos(fresh);
    } catch (e) {
      setDbKudos((prev) => prev.filter((k) => k.id !== tempId));
      throw e;
    }
  };

  const doRevokeKudo: RallyState["revokeKudoAction"] = async (kudoId) => {
    setDbKudos((prev) => prev.filter((k) => k.id !== kudoId));
    try {
      await revokeKudoRow(kudoId);
    } catch (e) {
      await refresh();
      throw e;
    }
  };




  const value: RallyState = {
    auth: { status: authStatus, userId: userId || null },
    me,
    profile,
    games,
    pastGames,
    buddies,
    joinedIds,
    gameRoster,
    dismissedInviteIds,
    messages,
    activity,
    refresh,
    setProfile: doSetProfile,
    updatePrivacyAction: doUpdatePrivacy,
    uploadAvatarAction: doUploadAvatar,
    removeAvatarAction: doRemoveAvatar,
    uploadChatPhotoAction: doUploadChatPhoto,
    discoverablePeople,
    addGame: doAddGame,
    joinGame: doJoin,
    leaveGame: doLeave,
    cancelGame: doCancel,
    removePlayer: doRemovePlayer,
    dismissInvite: (id) =>
      setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id])),
    addBuddy: doAddBuddy,
    removeBuddy: doRemoveBuddy,
    incomingRequests,
    outgoingRequests,
    friendshipStatus,
    acceptFriendRequest: doAcceptRequest,
    declineFriendRequest: doDeclineRequest,
    cancelFriendRequest: doCancelRequest,
    sendMessage: doSendMessage,
    playerById,
    groups,
    groupMembersOf,
    groupGamesOf,
    groupRequestsOf,
    saveContactInfo: doSaveContact,
    createGroupAction: doCreateGroup,
    updateGroupAction: doUpdateGroup,
    deleteGroupAction: doDeleteGroup,
    requestJoinGroupAction: doRequestJoin,
    decideGroupRequest: doDecideRequest,
    leaveGroupAction: doLeaveGroup,
    removeGroupMemberAction: doRemoveMember,
    promoteAction: doPromote,
    createInviteAction: doCreateInvite,
    consumeInviteAction: doConsumeInvite,
    blockedUsers,
    isBlocked,
    blockUser: doBlockUser,
    unblockUser: doUnblockUser,
    reportItem: doReport,
    endGame: doEndGame,
    isActiveGame,
    unreadCount,
    unreadTotal,
    markThreadReadAction: doMarkThreadRead,
    kudosCountByUser,
    kudosBreakdownByUser,
    kudosGivenBy,
    giveKudoAction: doGiveKudo,
    revokeKudoAction: doRevokeKudo,
    kudoIdOf,
    logout: doLogout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRally() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRally must be inside RallyProvider");
  return c;
}
