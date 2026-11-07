
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discoverable   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_location  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_sports    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_skill     boolean NOT NULL DEFAULT false;
