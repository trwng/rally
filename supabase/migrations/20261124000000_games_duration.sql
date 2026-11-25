-- How long a game lasts, in minutes. Used for the "time played" on share cards.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS duration_minutes integer;
