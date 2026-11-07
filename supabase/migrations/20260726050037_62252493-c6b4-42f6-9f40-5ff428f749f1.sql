
-- ENUM
CREATE TYPE public.app_pool AS ENUM ('minor', 'adult');

-- helper: compute pool from DOB, block <15
CREATE OR REPLACE FUNCTION public.compute_pool(_dob date)
RETURNS public.app_pool
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE _age int;
BEGIN
  _age := extract(year from age(_dob))::int;
  IF _age < 15 THEN
    RAISE EXCEPTION 'AGE_TOO_YOUNG' USING HINT = 'Rally requires users to be at least 15 years old.';
  END IF;
  IF _age < 18 THEN
    RETURN 'minor'::public.app_pool;
  END IF;
  RETURN 'adult'::public.app_pool;
END $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  dob date NOT NULL,
  pool public.app_pool NOT NULL,
  city text,
  lat double precision,
  lng double precision,
  sports jsonb NOT NULL DEFAULT '{}'::jsonb,
  avatar_seed text NOT NULL DEFAULT '',
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- security-definer helper for pool of current user
CREATE OR REPLACE FUNCTION public.my_pool()
RETURNS public.app_pool
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT pool FROM public.profiles WHERE id = auth.uid() $$;

-- trigger: on profile insert compute pool; on update block dob/pool change
CREATE OR REPLACE FUNCTION public.profiles_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.pool := public.compute_pool(NEW.dob);
  ELSE
    IF NEW.dob IS DISTINCT FROM OLD.dob THEN RAISE EXCEPTION 'DOB is immutable'; END IF;
    NEW.pool := OLD.pool;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profiles_pool BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_set_pool();

CREATE POLICY "own profile all" ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "read pool profiles" ON public.profiles FOR SELECT TO authenticated
  USING (pool = public.my_pool());

-- DEMO PLAYERS (seed characters — one row per demo persona, tagged by pool)
CREATE TABLE public.demo_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool public.app_pool NOT NULL,
  name text NOT NULL,
  age int NOT NULL,
  city text,
  bio text,
  avatar_seed text NOT NULL,
  sports jsonb NOT NULL DEFAULT '{}'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.demo_players TO authenticated;
GRANT ALL ON public.demo_players TO service_role;
ALTER TABLE public.demo_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read pool demo_players" ON public.demo_players FOR SELECT TO authenticated
  USING (pool = public.my_pool());

-- GAMES
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool public.app_pool NOT NULL,
  sport text NOT NULL,
  host_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  host_demo_id uuid REFERENCES public.demo_players(id) ON DELETE SET NULL,
  host_name text NOT NULL,
  host_avatar_seed text NOT NULL,
  when_label text NOT NULL,
  when_at timestamptz,
  location text NOT NULL,
  lat double precision,
  lng double precision,
  spots_total int NOT NULL,
  spots_taken int NOT NULL DEFAULT 1,
  skill text,
  notes text,
  is_past boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_user_id IS NOT NULL OR host_demo_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.games_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.host_user_id IS NOT NULL THEN
    NEW.pool := public.my_pool();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.pool := OLD.pool;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_games_pool BEFORE INSERT OR UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION public.games_set_pool();

CREATE POLICY "read pool games" ON public.games FOR SELECT TO authenticated
  USING (pool = public.my_pool());
CREATE POLICY "insert own game" ON public.games FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());
CREATE POLICY "update own game" ON public.games FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid()) WITH CHECK (host_user_id = auth.uid());
CREATE POLICY "delete own game" ON public.games FOR DELETE TO authenticated
  USING (host_user_id = auth.uid());

-- GAME PLAYERS
CREATE TABLE public.game_players (
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_player_id uuid REFERENCES public.demo_players(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR demo_player_id IS NOT NULL)
);
CREATE UNIQUE INDEX gp_user_uniq ON public.game_players (game_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX gp_demo_uniq ON public.game_players (game_id, demo_player_id) WHERE demo_player_id IS NOT NULL;
GRANT SELECT, INSERT, DELETE ON public.game_players TO authenticated;
GRANT ALL ON public.game_players TO service_role;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.game_players_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g_pool public.app_pool;
BEGIN
  SELECT pool INTO g_pool FROM public.games WHERE id = NEW.game_id;
  IF NEW.user_id IS NOT NULL AND g_pool <> public.my_pool() THEN
    RAISE EXCEPTION 'cross-pool join blocked';
  END IF;
  NEW.pool := g_pool;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_gp_pool BEFORE INSERT ON public.game_players
FOR EACH ROW EXECUTE FUNCTION public.game_players_set_pool();

CREATE POLICY "read pool gp" ON public.game_players FOR SELECT TO authenticated
  USING (pool = public.my_pool());
CREATE POLICY "join own" ON public.game_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave own" ON public.game_players FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- THREADS (chat)
CREATE TABLE public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool public.app_pool NOT NULL,
  kind text NOT NULL CHECK (kind IN ('game','dm')),
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- for DM: the real user
  peer_demo_id uuid REFERENCES public.demo_players(id) ON DELETE CASCADE, -- DM peer if demo
  peer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- DM peer if real user
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own thread" ON public.threads FOR SELECT TO authenticated
  USING (
    pool = public.my_pool() AND (
      (kind='dm' AND (owner_user_id = auth.uid() OR peer_user_id = auth.uid()))
      OR (kind='game' AND EXISTS (
        SELECT 1 FROM public.game_players gp WHERE gp.game_id = threads.game_id AND gp.user_id = auth.uid()
      ))
      OR (kind='game' AND EXISTS (
        SELECT 1 FROM public.games g WHERE g.id = threads.game_id AND g.host_user_id = auth.uid()
      ))
      OR (kind='game' AND game_id IN (SELECT id FROM public.games WHERE pool = public.my_pool() AND host_demo_id IS NOT NULL))
    )
  );
CREATE POLICY "insert thread own pool" ON public.threads FOR INSERT TO authenticated
  WITH CHECK (pool = public.my_pool() AND (owner_user_id = auth.uid() OR owner_user_id IS NULL));

-- messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_demo_id uuid REFERENCES public.demo_players(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  text text NOT NULL,
  ts timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.messages_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t_pool public.app_pool;
BEGIN
  SELECT pool INTO t_pool FROM public.threads WHERE id = NEW.thread_id;
  IF t_pool <> public.my_pool() THEN RAISE EXCEPTION 'cross-pool message blocked'; END IF;
  NEW.pool := t_pool;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_msg_pool BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_set_pool();

CREATE POLICY "read pool messages" ON public.messages FOR SELECT TO authenticated
  USING (
    pool = public.my_pool()
    AND thread_id IN (SELECT id FROM public.threads)  -- threads RLS re-applies
  );
CREATE POLICY "insert own message" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid());

-- BUDDIES
CREATE TABLE public.buddies (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy_demo_id uuid REFERENCES public.demo_players(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (buddy_user_id IS NOT NULL OR buddy_demo_id IS NOT NULL)
);
CREATE UNIQUE INDEX buddies_user_uniq ON public.buddies (user_id, buddy_user_id) WHERE buddy_user_id IS NOT NULL;
CREATE UNIQUE INDEX buddies_demo_uniq ON public.buddies (user_id, buddy_demo_id) WHERE buddy_demo_id IS NOT NULL;
GRANT SELECT, INSERT, DELETE ON public.buddies TO authenticated;
GRANT ALL ON public.buddies TO service_role;
ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.buddies_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.pool := public.my_pool();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_buddies_pool BEFORE INSERT ON public.buddies
FOR EACH ROW EXECUTE FUNCTION public.buddies_set_pool();

CREATE POLICY "read own buddies" ON public.buddies FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND pool = public.my_pool());
CREATE POLICY "add own buddy" ON public.buddies FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "remove own buddy" ON public.buddies FOR DELETE TO authenticated
  USING (user_id = auth.uid());
