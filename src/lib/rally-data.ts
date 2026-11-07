export type SportKey =
  | "volleyball"
  | "soccer"
  | "tennis"
  | "pickleball"
  | "basketball"
  | "badminton"
  | "running"
  | "cycling";

export type Skill = "Beginner" | "Intermediate" | "Advanced";

export interface Sport {
  key: SportKey;
  name: string;
  emoji: string;
  /** hex tint used across cards/pins */
  tint: string;
}

export const SPORTS: Sport[] = [
  { key: "volleyball", name: "Volleyball", emoji: "🏐", tint: "#f59e0b" },
  { key: "soccer", name: "Soccer", emoji: "⚽", tint: "#16a34a" },
  { key: "tennis", name: "Tennis", emoji: "🎾", tint: "#84cc16" },
  { key: "pickleball", name: "Pickleball", emoji: "🥒", tint: "#0ea5e9" },
  { key: "basketball", name: "Basketball", emoji: "🏀", tint: "#f97316" },
  { key: "badminton", name: "Badminton", emoji: "🏸", tint: "#8b5cf6" },
  { key: "running", name: "Running", emoji: "🏃", tint: "#ef4444" },
  { key: "cycling", name: "Cycling", emoji: "🚴", tint: "#14b8a6" },
];

export const sportByKey = (k: SportKey) =>
  SPORTS.find((s) => s.key === k) ?? SPORTS[0];

export interface GamePhoto {
  url: string;
  caption: string;
  sport: SportKey;
}

export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  /** Storage path (e.g. `<uid>/avatar-123.jpg`) in the `avatars` bucket, or null */
  avatarPath?: string | null;
  age?: number;
  city?: string;
  bio?: string;
  memberSince?: string;
  favoriteSports?: SportKey[];
  gamesPlayed?: number;
  photos?: GamePhoto[];
}

export interface Game {
  id: string;
  sport: SportKey;
  host: Player;
  skill: Skill;
  location: string;
  when: string;
  whenAt?: number;
  spotsTotal: number;
  spotsTaken: number;
  note?: string;
  createdAt: number;
  /** Normalized map coord 0..1 for the neighborhood map (legacy) */
  coord: { x: number; y: number };
  /** Real geo coordinates when known */
  lat?: number;
  lng?: number;
  /** Rough distance label */
  distance: string;
}


export interface PastGame {
  id: string;
  sport: SportKey;
  date: string;
  time?: string;
  playedAt: number;
  location: string;
  note?: string;
  players: Player[];
}

