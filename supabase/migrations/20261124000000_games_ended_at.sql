-- When the host ended the game. "Time played" on share cards = ended_at - when_at.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS ended_at timestamptz;
