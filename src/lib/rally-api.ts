import { supabase } from "@/integrations/supabase/client";
import type { Game, Player, Skill, SportKey } from "./rally-data";

// ============ Types ============

export type Pool = "minor" | "adult";

export interface DbProfile {
  id: string;
  full_name: string;
  dob: string;
  pool: Pool;
  city: string | null;
  lat: number | null;
  lng: number | null;
  sports: Record<string, Skill>;
  avatar_seed: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  discoverable?: boolean;
  show_activity?: boolean;
  show_location?: boolean;
  show_sports?: boolean;
  show_skill?: boolean;
}

export interface DbGame {
  id: string;
  pool: Pool;
  sport: string;
  host_user_id: string;
  host_name: string;
  host_avatar_seed: string;
  when_label: string;
  when_at: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  spots_total: number;
  spots_taken: number;
  skill: string | null;
  notes: string | null;
  is_past: boolean;
  created_at: string;
}

export interface DbGamePlayer {
  game_id: string;
  user_id: string;
  pool: Pool;
  joined_at: string;
}

export interface DbThread {
  id: string;
  pool: Pool;
  kind: "game" | "dm";
  game_id: string | null;
  owner_user_id: string | null;
  peer_user_id: string | null;
  title: string | null;
  created_at: string;
}

export interface DbMessage {
  id: string;
  thread_id: string;
  pool: Pool;
  author_user_id: string;
  author_name: string;
  text: string;
  ts: string;
  kind: "text" | "contact";
  payload: Record<string, unknown> | null;
  attachments: string[] | null;
}

export interface DbBuddy {
  user_id: string;
  buddy_user_id: string;
  pool: Pool;
  created_at: string;
}

export interface DbFriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  pool: Pool;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
}

export async function fetchFriendRequests(): Promise<DbFriendRequest[]> {
  const { data, error } = await supabase
    .from("friend_requests" as never)
    .select("*")
    .eq("status", "pending");
  if (error) throw error;
  return (data ?? []) as unknown as DbFriendRequest[];
}

export async function sendFriendRequestRow(fromUserId: string, toUserId: string) {
  const { error } = await supabase
    .from("friend_requests" as never)
    .insert({ from_user_id: fromUserId, to_user_id: toUserId } as never);
  if (error) throw error;
}

export async function respondFriendRequestRow(
  reqId: string,
  status: "accepted" | "declined",
) {
  const { error } = await supabase
    .from("friend_requests" as never)
    .update({ status } as never)
    .eq("id", reqId);
  if (error) throw error;
}

export async function cancelFriendRequestRow(reqId: string) {
  const { error } = await supabase
    .from("friend_requests" as never)
    .delete()
    .eq("id", reqId);
  if (error) throw error;
}

export interface DbGroup {
  id: string;
  pool: Pool;
  name: string;
  description: string | null;
  sports: string[];
  photo_url: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface DbGroupMember {
  group_id: string;
  user_id: string;
  pool: Pool;
  role: "admin" | "member";
  joined_at: string;
}

export interface DbGroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  pool: Pool;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

export interface DbGroupInvite {
  id: string;
  group_id: string;
  code: string;
  created_by: string;
  pool: Pool;
  created_at: string;
}

// ============ Helpers ============

const AVATAR_COLORS = [
  "#16a34a", "#0ea5e9", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export function colorFromSeed(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function haversineMi(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// ============ Mappers ============

export function profileToPlayer(p: DbProfile, meId: string): Player {
  return {
    id: p.id === meId ? "me" : p.id,
    name: p.full_name,
    initials: initialsOf(p.full_name),
    avatarColor: colorFromSeed(p.avatar_seed || p.id),
    avatarPath: p.avatar_url ?? null,
    age: ageFromDob(p.dob),
    city: p.city ?? undefined,
    bio: p.bio ?? undefined,
    memberSince: new Date(p.created_at).toLocaleString("en", {
      month: "long",
      year: "numeric",
    }),
    favoriteSports: Object.keys(p.sports || {}) as SportKey[],
    gamesPlayed: undefined,
    photos: [],
  };
}

const SKILL_SET = new Set<Skill>(["Beginner", "Intermediate", "Advanced"]);

export function gameToGame(
  g: DbGame,
  meId: string,
  viewer: { lat: number; lng: number } | null,
): Game {
  const isMeHost = g.host_user_id === meId;
  const hostId = isMeHost ? "me" : g.host_user_id;
  const host: Player = {
    id: hostId,
    name: g.host_name,
    initials: initialsOf(g.host_name),
    avatarColor: colorFromSeed(g.host_avatar_seed || hostId),
  };

  let distance = "—";
  let coord = { x: 0.5, y: 0.5 };
  if (g.lat != null && g.lng != null) {
    if (viewer) {
      distance = `${haversineMi(viewer, { lat: g.lat, lng: g.lng }).toFixed(1)} mi`;
      const dx = (g.lng - viewer.lng) * 60;
      const dy = (viewer.lat - g.lat) * 60;
      coord = {
        x: Math.max(0.08, Math.min(0.92, 0.5 + dx)),
        y: Math.max(0.08, Math.min(0.92, 0.5 + dy)),
      };
    } else {
      let h = 0;
      for (const c of g.id) h = (h * 31 + c.charCodeAt(0)) | 0;
      coord = {
        x: 0.15 + (Math.abs(h) % 700) / 1000,
        y: 0.15 + (Math.abs(h >> 8) % 700) / 1000,
      };
    }
  }

  const skill =
    g.skill && SKILL_SET.has(g.skill as Skill)
      ? (g.skill as Skill)
      : ("Intermediate" as Skill);

  return {
    id: g.id,
    sport: g.sport as SportKey,
    host,
    skill,
    location: g.location,
    when: g.when_label,
    whenAt: g.when_at ? new Date(g.when_at).getTime() : undefined,
    spotsTotal: g.spots_total,
    spotsTaken: g.spots_taken,
    note: g.notes ?? undefined,
    createdAt: new Date(g.created_at).getTime(),
    coord,
    lat: g.lat ?? undefined,
    lng: g.lng ?? undefined,
    distance,
  };
}


// ============ Fetchers ============

export async function fetchMyProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as DbProfile | null;
}

export async function fetchPoolProfiles(): Promise<DbProfile[]> {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return (data ?? []) as DbProfile[];
}

export async function fetchGames(): Promise<DbGame[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbGame[];
}

export async function fetchGamePlayers(): Promise<DbGamePlayer[]> {
  const { data, error } = await supabase.from("game_players").select("*");
  if (error) throw error;
  return (data ?? []) as DbGamePlayer[];
}

export async function fetchThreads(): Promise<DbThread[]> {
  const { data, error } = await supabase.from("threads").select("*");
  if (error) throw error;
  return (data ?? []) as DbThread[];
}

export async function fetchMessages(): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("ts", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbMessage[];
}

export async function fetchBuddies(userId: string): Promise<DbBuddy[]> {
  const { data, error } = await supabase
    .from("buddies")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as DbBuddy[];
}

// ============ Mutations ============

export async function completeOnboarding(input: {
  userId: string;
  full_name: string;
  dob: string;
  city: string;
  lat: number;
  lng: number;
  sports: Record<string, Skill>;
  avatar_seed: string;
}) {
  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    full_name: input.full_name,
    dob: input.dob,
    pool: "adult", // trigger overrides with compute_pool(dob)
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    sports: input.sports,
    avatar_seed: input.avatar_seed,
  });
  if (error) throw error;
}

export async function joinGameRow(gameId: string, userId: string, pool: Pool) {
  const { error } = await supabase
    .from("game_players")
    .insert({ game_id: gameId, user_id: userId, pool });
  if (error) throw error;
}

export async function leaveGameRow(gameId: string, userId: string) {
  const { error, count } = await supabase
    .from("game_players")
    .delete({ count: "exact" })
    .eq("game_id", gameId)
    .eq("user_id", userId);
  if (error) throw error;
  if (count !== 1) {
    throw new Error("Couldn't leave this game. Your spot was not removed.");
  }
}

/** Host removes a specific joined player. */
export async function removeGamePlayer(gameId: string, userId: string) {
  const { error, count } = await supabase
    .from("game_players")
    .delete({ count: "exact" })
    .eq("game_id", gameId)
    .eq("user_id", userId);
  if (error) throw error;
  if (count !== 1) {
    throw new Error("Couldn't remove that player. The roster was not changed.");
  }
}

/** Host cancels (deletes) their own game. Cascades to game_players/threads/messages. */
export async function cancelGameRow(gameId: string) {
  const { error, count } = await supabase
    .from("games")
    .delete({ count: "exact" })
    .eq("id", gameId);
  if (error) throw error;
  if (count !== 1) {
    throw new Error("Couldn't cancel this game. Only the host can cancel it.");
  }
}

/** Host ends the game — marks it complete so it becomes a past/activity entry. */
export async function endGameRow(gameId: string) {
  const { error, count } = await supabase
    .from("games")
    .update({ is_past: true } as never, { count: "exact" })
    .eq("id", gameId);
  if (error) throw error;
  if (count !== 1) {
    throw new Error("Couldn't end this game. Only the host can end it.");
  }
}

export async function createGameRow(input: {
  userId: string;
  userName: string;
  userAvatarSeed: string;
  pool: Pool;
  sport: SportKey;
  when_label: string;
  when_at?: string;
  location: string;
  lat: number | null;
  lng: number | null;
  spots_total: number;
  skill: Skill;
  notes?: string;
  group_id?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("games")
    .insert({
      pool: input.pool,
      sport: input.sport,
      host_user_id: input.userId,
      host_name: input.userName,
      host_avatar_seed: input.userAvatarSeed,
      when_label: input.when_label,
      when_at: input.when_at,
      location: input.location,
      lat: input.lat,
      lng: input.lng,
      spots_total: input.spots_total,
      spots_taken: 1,
      skill: input.skill,
      notes: input.notes,
      is_past: false,
      group_id: input.group_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  await supabase.from("threads").insert({
    pool: input.pool,
    kind: "game",
    game_id: data.id,
    owner_user_id: input.userId,
    title: input.location,
  });
  return data.id;
}

export async function addBuddyRow(
  userId: string,
  buddyUserId: string,
  pool: Pool,
) {
  const { error } = await supabase.from("buddies").insert({
    user_id: userId,
    buddy_user_id: buddyUserId,
    pool,
  });
  if (error) throw error;
}


export async function removeBuddyRow(userId: string, buddyUserId: string) {
  const { error } = await supabase
    .from("buddies")
    .delete()
    .eq("user_id", userId)
    .eq("buddy_user_id", buddyUserId);
  if (error) throw error;
}

export async function ensureGameThread(
  gameId: string,
  userId: string,
  pool: Pool,
  title: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("kind", "game")
    .eq("game_id", gameId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("threads")
    .insert({
      pool,
      kind: "game",
      game_id: gameId,
      owner_user_id: userId,
      title,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function ensureDmThread(
  userId: string,
  peerUserId: string,
  pool: Pool,
  title: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("kind", "dm")
    .eq("owner_user_id", userId)
    .eq("peer_user_id", peerUserId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("threads")
    .insert({
      pool,
      kind: "dm",
      owner_user_id: userId,
      peer_user_id: peerUserId,
      title,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function sendMessageRow(
  threadId: string,
  userId: string,
  authorName: string,
  text: string,
  pool: Pool,
  opts?: {
    kind?: "text" | "contact";
    payload?: Record<string, unknown>;
    attachments?: string[];
  },
) {
  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    author_user_id: userId,
    author_name: authorName,
    text,
    pool,
    kind: opts?.kind ?? "text",
    payload: (opts?.payload ?? null) as never,
    attachments: (opts?.attachments ?? null) as never,
  });
  if (error) throw error;
}

const chatSignedCache = new Map<string, { url: string; exp: number }>();

/** Upload a chat photo to private storage. Returns the file path. */
export async function uploadChatPhoto(userId: string, threadId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${threadId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("chat_photos").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

/** Returns a signed URL for a chat photo path, cached in-memory for ~50 minutes. */
export async function signChatPhoto(path: string): Promise<string | null> {
  const now = Date.now();
  const hit = chatSignedCache.get(path);
  if (hit && hit.exp > now + 60_000) return hit.url;
  const { data, error } = await supabase.storage
    .from("chat_photos")
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  chatSignedCache.set(path, { url: data.signedUrl, exp: now + 60 * 60 * 1000 });
  return data.signedUrl;
}

// ============ GROUPS ============

export async function fetchGroups(): Promise<DbGroup[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g) => ({
    ...g,
    sports: (Array.isArray(g.sports) ? g.sports : []) as string[],
  })) as DbGroup[];
}

export async function fetchGroupMembers(): Promise<DbGroupMember[]> {
  const { data, error } = await supabase.from("group_members").select("*");
  if (error) throw error;
  return (data ?? []) as DbGroupMember[];
}

export async function fetchGroupJoinRequests(): Promise<DbGroupJoinRequest[]> {
  const { data, error } = await supabase
    .from("group_join_requests")
    .select("*");
  if (error) throw error;
  return (data ?? []) as DbGroupJoinRequest[];
}

export async function fetchGroupInvites(
  groupId: string,
): Promise<DbGroupInvite[]> {
  const { data, error } = await supabase
    .from("group_invites")
    .select("*")
    .eq("group_id", groupId);
  if (error) throw error;
  return (data ?? []) as DbGroupInvite[];
}

export async function createGroup(input: {
  name: string;
  description?: string;
  sports: string[];
  city?: string;
  lat?: number | null;
  lng?: number | null;
  is_public: boolean;
  photo_url?: string | null;
  userId: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      // pool set by trigger
      pool: "adult",
      name: input.name,
      description: input.description ?? null,
      sports: input.sports as never,
      city: input.city ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      is_public: input.is_public,
      photo_url: input.photo_url ?? null,
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<
    Pick<
      DbGroup,
      "name" | "description" | "sports" | "city" | "lat" | "lng" | "is_public" | "photo_url"
    >
  >,
) {
  const { error } = await supabase
    .from("groups")
    .update(patch as never)
    .eq("id", groupId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}

export async function requestJoinGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_join_requests")
    .insert({ group_id: groupId, user_id: userId, pool: "adult", status: "pending" });
  if (error) throw error;
}

export async function decideJoinRequest(
  requestId: string,
  status: "approved" | "denied",
) {
  const { error } = await supabase
    .from("group_join_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function promoteToAdmin(groupId: string, userId: string) {
  const { error } = await supabase
    .from("group_members")
    .update({ role: "admin" })
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createGroupInvite(
  groupId: string,
  userId: string,
): Promise<string> {
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  const { error } = await supabase
    .from("group_invites")
    .insert({ group_id: groupId, code, created_by: userId, pool: "adult" });
  if (error) throw error;
  return code;
}

export async function consumeInviteCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("consume_group_invite", {
    _code: code,
  });
  if (error) throw error;
  return data as string;
}

export async function ensureGroupThread(
  groupId: string,
  userId: string,
  pool: Pool,
  title: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("threads")
    .select("id")
    .eq("kind", "group")
    .eq("group_id", groupId)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("threads")
    .insert({
      pool,
      kind: "group",
      group_id: groupId,
      owner_user_id: userId,
      title,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateContactInfo(
  userId: string,
  patch: { phone?: string | null; instagram?: string | null; snapchat?: string | null; other_social?: string | null },
) {
  const { error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", userId);
  if (error) throw error;
}

export async function updatePrivacy(
  userId: string,
  patch: Partial<{
    discoverable: boolean;
    show_activity: boolean;
    show_location: boolean;
    show_sports: boolean;
    show_skill: boolean;
  }>,
) {
  const { error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", userId);
  if (error) throw error;
}

// ============ Avatar upload ============

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { error: upErr } = await supabase
    .from("profiles")
    .update({ avatar_url: path } as never)
    .eq("id", userId);
  if (upErr) throw upErr;
  return path;
}

export async function removeAvatar(userId: string, path: string | null | undefined) {
  if (path) {
    await supabase.storage.from("avatars").remove([path]);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null } as never)
    .eq("id", userId);
  if (error) throw error;
}

const signedCache = new Map<string, { url: string; exp: number }>();

/** Returns a signed URL for the avatar path, cached in-memory for ~50 minutes. */
export async function signAvatar(path: string): Promise<string | null> {
  const now = Date.now();
  const hit = signedCache.get(path);
  if (hit && hit.exp > now + 60_000) return hit.url;
  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  signedCache.set(path, { url: data.signedUrl, exp: now + 60 * 60 * 1000 });
  return data.signedUrl;
}


// ============ Blocks ============

export interface DbBlock {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  pool: Pool;
  created_at: string;
}

export async function fetchBlocks(): Promise<DbBlock[]> {
  const { data, error } = await supabase
    .from("blocks" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbBlock[];
}

export async function blockUserRow(blockedUserId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("blocks" as never)
    .insert({ blocker_user_id: uid, blocked_user_id: blockedUserId } as never);
  if (error && !String(error.message || "").toLowerCase().includes("duplicate")) throw error;
}

export async function unblockUserRow(blockedUserId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("blocks" as never)
    .delete()
    .eq("blocker_user_id", uid)
    .eq("blocked_user_id", blockedUserId);
  if (error) throw error;
}

// ============ Reports ============

export type ReportTarget = "user" | "message" | "game" | "group";
export type ReportReason =
  | "harassment"
  | "hate_speech"
  | "spam"
  | "inappropriate"
  | "safety"
  | "impersonation"
  | "other";

export async function createReportRow(input: {
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("reports" as never).insert({
    reporter_user_id: uid,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  } as never);
  if (error) throw error;
}

// ============ Thread reads ============

export interface DbThreadRead {
  thread_id: string;
  user_id: string;
  last_read_at: string;
}

export async function fetchThreadReads(userId: string): Promise<DbThreadRead[]> {
  const { data, error } = await supabase
    .from("thread_reads" as never)
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as DbThreadRead[];
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("thread_reads" as never)
    .upsert(
      { thread_id: threadId, user_id: userId, last_read_at: nowIso } as never,
      { onConflict: "thread_id,user_id" } as never,
    );
  if (error) throw error;
}

// ============ Kudos ============

export type KudoKind =
  | "good_sport"
  | "skilled"
  | "friendly"
  | "on_time"
  | "great_teammate";

export const KUDO_LABELS: Record<KudoKind, { label: string; emoji: string }> = {
  good_sport: { label: "Good sport", emoji: "🤝" },
  skilled: { label: "Skilled", emoji: "⭐" },
  friendly: { label: "Friendly", emoji: "😊" },
  on_time: { label: "On time", emoji: "⏱️" },
  great_teammate: { label: "Great teammate", emoji: "🙌" },
};

export interface DbKudo {
  id: string;
  game_id: string;
  from_user_id: string;
  to_user_id: string;
  kind: KudoKind;
  pool: Pool;
  created_at: string;
}

export async function fetchKudos(): Promise<DbKudo[]> {
  const { data, error } = await supabase.from("kudos" as never).select("*");
  if (error) throw error;
  return (data ?? []) as unknown as DbKudo[];
}

export async function giveKudoRow(input: {
  gameId: string;
  fromUserId: string;
  toUserId: string;
  kind: KudoKind;
}): Promise<void> {
  const { error } = await supabase.from("kudos" as never).insert({
    game_id: input.gameId,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    kind: input.kind,
    pool: "adult", // trigger overrides
  } as never);
  if (error) throw error;
}

export async function revokeKudoRow(kudoId: string): Promise<void> {
  const { error } = await supabase.from("kudos" as never).delete().eq("id", kudoId);
  if (error) throw error;
}

