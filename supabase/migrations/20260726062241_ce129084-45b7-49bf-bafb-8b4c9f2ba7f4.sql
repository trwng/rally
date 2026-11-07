
-- =========================================
-- BLOCKS
-- =========================================
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocks_not_self CHECK (blocker_user_id <> blocked_user_id),
  UNIQUE (blocker_user_id, blocked_user_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Only the blocker sees their own block rows. Blocked users must not
-- be able to enumerate who blocked them.
CREATE POLICY "blocks_select_own"
  ON public.blocks FOR SELECT
  TO authenticated
  USING (blocker_user_id = auth.uid());

CREATE POLICY "blocks_insert_own"
  ON public.blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON public.blocks FOR DELETE
  TO authenticated
  USING (blocker_user_id = auth.uid());

-- Pool guard + auto-decline pending friend requests between the pair.
CREATE OR REPLACE FUNCTION public.blocks_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE other_pool public.app_pool;
BEGIN
  SELECT pool INTO other_pool FROM public.profiles WHERE id = NEW.blocked_user_id;
  IF other_pool IS NULL OR other_pool <> public.my_pool() THEN
    RAISE EXCEPTION 'cross-pool block blocked';
  END IF;
  NEW.pool := other_pool;
  RETURN NEW;
END $$;

CREATE TRIGGER blocks_before_insert
BEFORE INSERT ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.blocks_before_insert();

CREATE OR REPLACE FUNCTION public.blocks_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.friend_requests
     SET status = 'declined', responded_at = now()
   WHERE status = 'pending'
     AND (
       (from_user_id = NEW.blocker_user_id AND to_user_id = NEW.blocked_user_id) OR
       (from_user_id = NEW.blocked_user_id AND to_user_id = NEW.blocker_user_id)
     );
  RETURN NEW;
END $$;

CREATE TRIGGER blocks_after_insert
AFTER INSERT ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.blocks_after_insert();

-- =========================================
-- REPORTS
-- =========================================
CREATE TYPE public.report_target AS ENUM ('user','message','game','group');
CREATE TYPE public.report_reason AS ENUM (
  'harassment','hate_speech','spam','inappropriate','safety','impersonation','other'
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason public.report_reason NOT NULL,
  details text,
  pool public.app_pool NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

-- Fill pool from the reporter.
CREATE OR REPLACE FUNCTION public.reports_set_pool()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.pool := public.my_pool();
  RETURN NEW;
END $$;

CREATE TRIGGER reports_set_pool
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.reports_set_pool();

-- =========================================
-- REALTIME
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buddies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
