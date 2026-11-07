-- ============ thread_reads ============
CREATE TABLE public.thread_reads (
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_reads TO authenticated;
GRANT ALL ON public.thread_reads TO service_role;
ALTER TABLE public.thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own reads" ON public.thread_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert own reads" ON public.thread_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_thread_participant(thread_id));
CREATE POLICY "update own reads" ON public.thread_reads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own reads" ON public.thread_reads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ kudos ============
CREATE TYPE public.kudo_type AS ENUM (
  'good_sport','skilled','friendly','on_time','great_teammate'
);

CREATE TABLE public.kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.kudo_type NOT NULL,
  pool public.app_pool NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, from_user_id, to_user_id, kind),
  CHECK (from_user_id <> to_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.kudos TO authenticated;
GRANT ALL ON public.kudos TO service_role;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.kudos_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g_pool public.app_pool; recip_pool public.app_pool; g_host uuid;
BEGIN
  SELECT pool, host_user_id INTO g_pool, g_host FROM public.games WHERE id = NEW.game_id;
  IF g_pool IS NULL THEN RAISE EXCEPTION 'game not found'; END IF;
  IF g_pool <> public.my_pool() THEN RAISE EXCEPTION 'cross-pool kudos blocked'; END IF;
  SELECT pool INTO recip_pool FROM public.profiles WHERE id = NEW.to_user_id;
  IF recip_pool IS NULL OR recip_pool <> g_pool THEN
    RAISE EXCEPTION 'cross-pool kudos blocked';
  END IF;
  IF NEW.from_user_id <> g_host AND NOT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = NEW.game_id AND user_id = NEW.from_user_id
  ) THEN
    RAISE EXCEPTION 'must have played this game to give kudos';
  END IF;
  IF NEW.to_user_id <> g_host AND NOT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = NEW.game_id AND user_id = NEW.to_user_id
  ) THEN
    RAISE EXCEPTION 'recipient did not play this game';
  END IF;
  NEW.pool := g_pool;
  RETURN NEW;
END $$;

CREATE TRIGGER kudos_set_pool
BEFORE INSERT ON public.kudos
FOR EACH ROW EXECUTE FUNCTION public.kudos_before_insert();

CREATE POLICY "read pool kudos" ON public.kudos
  FOR SELECT TO authenticated USING (pool = public.my_pool());
CREATE POLICY "give kudos" ON public.kudos
  FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "revoke own kudos" ON public.kudos
  FOR DELETE TO authenticated USING (from_user_id = auth.uid());
