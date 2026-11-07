
-- ============ GROUPS FEATURE + CONTACT SHARING ============

-- 1) Profiles: private contact fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS snapchat text,
  ADD COLUMN IF NOT EXISTS other_social text;

-- Restrict profile SELECT to only expose contact fields to the owner. Because
-- Postgres row-level policies are row-scoped (not column-scoped), the app must
-- avoid selecting contact columns for non-owners. We rely on client discipline
-- via a helper view for pool profile browsing.
CREATE OR REPLACE VIEW public.pool_profiles_public AS
  SELECT id, full_name, dob, pool, city, lat, lng, sports, avatar_seed, bio, created_at
  FROM public.profiles;

GRANT SELECT ON public.pool_profiles_public TO authenticated;

-- 2) Messages: contact-share support
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_kind_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_kind_check CHECK (kind IN ('text','contact'));

-- 3) GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool public.app_pool NOT NULL,
  name text NOT NULL,
  description text,
  sports jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_url text,
  city text,
  lat double precision,
  lng double precision,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_join_requests TO authenticated;
GRANT ALL ON public.group_join_requests TO service_role;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invites TO authenticated;
GRANT ALL ON public.group_invites TO service_role;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- 4) Games + threads: group linkage
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_kind_check;
ALTER TABLE public.threads
  ADD CONSTRAINT threads_kind_check CHECK (kind IN ('game','dm','group'));

-- 5) Helpers
CREATE OR REPLACE FUNCTION public.is_group_member(_gid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.group_members
    WHERE group_id = _gid AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_gid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.group_members
    WHERE group_id = _gid AND user_id = auth.uid() AND role = 'admin');
$$;

-- 6) Triggers: pool inheritance
CREATE OR REPLACE FUNCTION public.groups_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.pool := public.my_pool();
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  ELSE
    NEW.pool := OLD.pool;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_groups_pool ON public.groups;
CREATE TRIGGER trg_groups_pool BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.groups_set_pool();

-- Auto-add creator as admin
CREATE OR REPLACE FUNCTION public.groups_add_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members(group_id, user_id, pool, role)
    VALUES(NEW.id, NEW.created_by, NEW.pool, 'admin')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_groups_add_creator ON public.groups;
CREATE TRIGGER trg_groups_add_creator AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.groups_add_creator();

CREATE OR REPLACE FUNCTION public.group_members_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g_pool public.app_pool;
BEGIN
  SELECT pool INTO g_pool FROM public.groups WHERE id = NEW.group_id;
  IF g_pool IS NULL OR g_pool <> public.my_pool() THEN
    -- Allow SECURITY DEFINER triggers (like groups_add_creator) to bypass check
    -- by verifying via the creator's pool at the group row.
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND pool = g_pool) THEN
      RAISE EXCEPTION 'cross-pool group membership blocked';
    END IF;
  END IF;
  NEW.pool := g_pool;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_group_members_pool ON public.group_members;
CREATE TRIGGER trg_group_members_pool BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.group_members_set_pool();

CREATE OR REPLACE FUNCTION public.group_join_requests_process()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g_pool public.app_pool;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT pool INTO g_pool FROM public.groups WHERE id = NEW.group_id;
    IF g_pool IS NULL OR g_pool <> public.my_pool() THEN
      RAISE EXCEPTION 'cross-pool request blocked';
    END IF;
    NEW.pool := g_pool;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      INSERT INTO public.group_members(group_id, user_id, pool, role)
        VALUES(NEW.group_id, NEW.user_id, NEW.pool, 'member')
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gjr_process ON public.group_join_requests;
CREATE TRIGGER trg_gjr_process BEFORE INSERT OR UPDATE ON public.group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.group_join_requests_process();

CREATE OR REPLACE FUNCTION public.group_invites_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g_pool public.app_pool;
BEGIN
  SELECT pool INTO g_pool FROM public.groups WHERE id = NEW.group_id;
  NEW.pool := g_pool;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gi_pool ON public.group_invites;
CREATE TRIGGER trg_gi_pool BEFORE INSERT ON public.group_invites
  FOR EACH ROW EXECUTE FUNCTION public.group_invites_set_pool();

-- Update games_set_pool to honor group linkage
CREATE OR REPLACE FUNCTION public.games_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g_pool public.app_pool;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.host_user_id IS NOT NULL THEN
    NEW.pool := public.my_pool();
    IF NEW.group_id IS NOT NULL THEN
      SELECT pool INTO g_pool FROM public.groups WHERE id = NEW.group_id;
      IF g_pool IS NULL OR g_pool <> NEW.pool THEN
        RAISE EXCEPTION 'cross-pool group game blocked';
      END IF;
      IF NOT public.is_group_member(NEW.group_id) THEN
        RAISE EXCEPTION 'must be a group member to post a group game';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.pool := OLD.pool;
  END IF;
  RETURN NEW;
END $$;

-- 7) POLICIES

-- groups
DROP POLICY IF EXISTS "read visible groups" ON public.groups;
CREATE POLICY "read visible groups" ON public.groups FOR SELECT TO authenticated
  USING (pool = public.my_pool() AND (is_public OR public.is_group_member(id)));

DROP POLICY IF EXISTS "insert own group" ON public.groups;
CREATE POLICY "insert own group" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "admin edits group" ON public.groups;
CREATE POLICY "admin edits group" ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(id)) WITH CHECK (public.is_group_admin(id));

DROP POLICY IF EXISTS "admin deletes group" ON public.groups;
CREATE POLICY "admin deletes group" ON public.groups FOR DELETE TO authenticated
  USING (public.is_group_admin(id));

-- group_members
DROP POLICY IF EXISTS "read group members" ON public.group_members;
CREATE POLICY "read group members" ON public.group_members FOR SELECT TO authenticated
  USING (pool = public.my_pool() AND (
    user_id = auth.uid()
    OR public.is_group_member(group_id)
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.is_public)
  ));

-- Admin adds a member directly (invite by admin action); or a self-add
-- immediately after an approved request (handled by trigger too).
DROP POLICY IF EXISTS "admin adds member" ON public.group_members;
CREATE POLICY "admin adds member" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_group_admin(group_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "admin updates member" ON public.group_members;
CREATE POLICY "admin updates member" ON public.group_members FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id)) WITH CHECK (public.is_group_admin(group_id));

DROP POLICY IF EXISTS "leave or kick member" ON public.group_members;
CREATE POLICY "leave or kick member" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- group_join_requests
DROP POLICY IF EXISTS "read own or admin requests" ON public.group_join_requests;
CREATE POLICY "read own or admin requests" ON public.group_join_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

DROP POLICY IF EXISTS "insert own request" ON public.group_join_requests;
CREATE POLICY "insert own request" ON public.group_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin updates request" ON public.group_join_requests;
CREATE POLICY "admin updates request" ON public.group_join_requests FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id)) WITH CHECK (public.is_group_admin(group_id));

DROP POLICY IF EXISTS "delete own or admin request" ON public.group_join_requests;
CREATE POLICY "delete own or admin request" ON public.group_join_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id));

-- group_invites
DROP POLICY IF EXISTS "admin reads invites" ON public.group_invites;
CREATE POLICY "admin reads invites" ON public.group_invites FOR SELECT TO authenticated
  USING (public.is_group_admin(group_id));

DROP POLICY IF EXISTS "admin creates invite" ON public.group_invites;
CREATE POLICY "admin creates invite" ON public.group_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_group_admin(group_id));

DROP POLICY IF EXISTS "admin deletes invite" ON public.group_invites;
CREATE POLICY "admin deletes invite" ON public.group_invites FOR DELETE TO authenticated
  USING (public.is_group_admin(group_id));

-- games: replace "read pool games" to add group membership requirement
DROP POLICY IF EXISTS "read pool games" ON public.games;
CREATE POLICY "read pool games" ON public.games FOR SELECT TO authenticated
  USING (pool = public.my_pool() AND (group_id IS NULL OR public.is_group_member(group_id)));

-- threads: allow group kind
DROP POLICY IF EXISTS "read own thread" ON public.threads;
CREATE POLICY "read own thread" ON public.threads FOR SELECT TO authenticated
  USING (pool = public.my_pool() AND (
    (kind = 'dm' AND (owner_user_id = auth.uid() OR peer_user_id = auth.uid()))
    OR (kind = 'game' AND EXISTS (
      SELECT 1 FROM public.game_players gp WHERE gp.game_id = threads.game_id AND gp.user_id = auth.uid()
    ))
    OR (kind = 'game' AND EXISTS (
      SELECT 1 FROM public.games g WHERE g.id = threads.game_id AND g.host_user_id = auth.uid()
    ))
    OR (kind = 'group' AND group_id IS NOT NULL AND public.is_group_member(group_id))
  ));

DROP POLICY IF EXISTS "insert own thread" ON public.threads;
CREATE POLICY "insert own thread" ON public.threads FOR INSERT TO authenticated
  WITH CHECK (
    pool = public.my_pool() AND owner_user_id = auth.uid()
    AND (kind <> 'group' OR (group_id IS NOT NULL AND public.is_group_member(group_id)))
  );

-- 8) RPC: consume invite
CREATE OR REPLACE FUNCTION public.consume_group_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv record;
BEGIN
  SELECT * INTO inv FROM public.group_invites WHERE code = _code;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid invite'; END IF;
  IF inv.pool <> public.my_pool() THEN RAISE EXCEPTION 'cross-pool invite blocked'; END IF;
  INSERT INTO public.group_members(group_id, user_id, pool, role)
    VALUES(inv.group_id, auth.uid(), inv.pool, 'member')
    ON CONFLICT DO NOTHING;
  RETURN inv.group_id;
END $$;
GRANT EXECUTE ON FUNCTION public.consume_group_invite(text) TO authenticated;
