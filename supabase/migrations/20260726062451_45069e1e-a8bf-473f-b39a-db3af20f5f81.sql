
CREATE OR REPLACE FUNCTION public.blocked_between(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
     WHERE (blocker_user_id = _a AND blocked_user_id = _b)
        OR (blocker_user_id = _b AND blocked_user_id = _a)
  )
$$;

-- profiles
DROP POLICY IF EXISTS "read pool profiles" ON public.profiles;
CREATE POLICY "read pool profiles"
  ON public.profiles FOR SELECT
  USING (pool = public.my_pool() AND NOT public.blocked_between(auth.uid(), id));

-- games
DROP POLICY IF EXISTS "read pool games" ON public.games;
CREATE POLICY "read pool games"
  ON public.games FOR SELECT
  USING (
    pool = public.my_pool()
    AND (group_id IS NULL OR public.is_group_member(group_id))
    AND NOT public.blocked_between(auth.uid(), host_user_id)
  );

-- game_players
DROP POLICY IF EXISTS "read pool gp" ON public.game_players;
CREATE POLICY "read pool gp"
  ON public.game_players FOR SELECT
  USING (pool = public.my_pool() AND NOT public.blocked_between(auth.uid(), user_id));

-- friend_requests
DROP POLICY IF EXISTS "read own requests" ON public.friend_requests;
CREATE POLICY "read own requests"
  ON public.friend_requests FOR SELECT
  USING (
    (from_user_id = auth.uid() OR to_user_id = auth.uid())
    AND NOT public.blocked_between(from_user_id, to_user_id)
  );

-- buddies
DROP POLICY IF EXISTS "read own buddies" ON public.buddies;
CREATE POLICY "read own buddies"
  ON public.buddies FOR SELECT
  USING (
    user_id = auth.uid()
    AND pool = public.my_pool()
    AND NOT public.blocked_between(auth.uid(), buddy_user_id)
  );

-- messages
DROP POLICY IF EXISTS "read pool messages" ON public.messages;
CREATE POLICY "read pool messages"
  ON public.messages FOR SELECT
  USING (
    pool = public.my_pool()
    AND thread_id IN (SELECT id FROM public.threads)
    AND NOT public.blocked_between(auth.uid(), author_user_id)
  );

-- threads (DM peer)
DROP POLICY IF EXISTS "read own thread" ON public.threads;
CREATE POLICY "read own thread"
  ON public.threads FOR SELECT
  USING (
    pool = public.my_pool()
    AND (
      (kind = 'dm' AND (owner_user_id = auth.uid() OR peer_user_id = auth.uid())
        AND NOT public.blocked_between(coalesce(owner_user_id, auth.uid()), coalesce(peer_user_id, auth.uid())))
      OR (kind = 'game' AND EXISTS (SELECT 1 FROM public.game_players gp WHERE gp.game_id = threads.game_id AND gp.user_id = auth.uid()))
      OR (kind = 'game' AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = threads.game_id AND g.host_user_id = auth.uid()))
      OR (kind = 'group' AND group_id IS NOT NULL AND public.is_group_member(group_id))
    )
  );

-- Prevent sending messages, friend requests, or DMs when blocked either way
CREATE OR REPLACE FUNCTION public.friend_requests_block_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.blocked_between(NEW.from_user_id, NEW.to_user_id) THEN
    RAISE EXCEPTION 'blocked users cannot exchange requests';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS friend_requests_block_guard ON public.friend_requests;
CREATE TRIGGER friend_requests_block_guard
BEFORE INSERT ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.friend_requests_block_guard();

CREATE OR REPLACE FUNCTION public.messages_block_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t record;
BEGIN
  SELECT kind, owner_user_id, peer_user_id INTO t FROM public.threads WHERE id = NEW.thread_id;
  IF t.kind = 'dm' AND t.owner_user_id IS NOT NULL AND t.peer_user_id IS NOT NULL THEN
    IF public.blocked_between(t.owner_user_id, t.peer_user_id) THEN
      RAISE EXCEPTION 'blocked users cannot message';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS messages_block_guard ON public.messages;
CREATE TRIGGER messages_block_guard
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_block_guard();
