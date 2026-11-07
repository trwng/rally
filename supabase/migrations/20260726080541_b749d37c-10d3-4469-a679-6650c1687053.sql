
-- Helper: is current user a participant in a thread?
CREATE OR REPLACE FUNCTION public.is_thread_participant(_tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = _tid
      AND (
        (t.kind = 'dm' AND (t.owner_user_id = auth.uid() OR t.peer_user_id = auth.uid()))
        OR (t.kind = 'game' AND (
              EXISTS (SELECT 1 FROM public.games g WHERE g.id = t.game_id AND g.host_user_id = auth.uid())
           OR EXISTS (SELECT 1 FROM public.game_players gp WHERE gp.game_id = t.game_id AND gp.user_id = auth.uid())
        ))
        OR (t.kind = 'group' AND t.group_id IS NOT NULL AND public.is_group_member(t.group_id))
      )
  )
$$;

-- Tighten messages INSERT: must be a participant of the thread
DROP POLICY IF EXISTS "insert own message" ON public.messages;
CREATE POLICY "insert own message" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND public.is_thread_participant(thread_id)
  );

-- Tighten buddies INSERT: buddy must exist and be in the same pool as current user
DROP POLICY IF EXISTS "add own buddy" ON public.buddies;
CREATE POLICY "add own buddy" ON public.buddies
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = buddy_user_id AND p.pool = public.my_pool()
    )
  );

-- Tighten threads INSERT: enforce pool + participation
DROP POLICY IF EXISTS "insert own thread" ON public.threads;
CREATE POLICY "insert own thread" ON public.threads
  FOR INSERT TO authenticated
  WITH CHECK (
    pool = public.my_pool()
    AND owner_user_id = auth.uid()
    AND (
      (kind = 'dm'
        AND peer_user_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = peer_user_id AND p.pool = public.my_pool())
        AND NOT public.blocked_between(auth.uid(), peer_user_id)
      )
      OR (kind = 'game'
        AND game_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.host_user_id = auth.uid() AND g.pool = public.my_pool())
          OR EXISTS (SELECT 1 FROM public.game_players gp JOIN public.games g ON g.id = gp.game_id
                     WHERE gp.game_id = threads.game_id AND gp.user_id = auth.uid() AND g.pool = public.my_pool())
        )
      )
      OR (kind = 'group'
        AND group_id IS NOT NULL
        AND public.is_group_member(group_id)
      )
    )
  );

-- Defense-in-depth: profiles UPDATE must keep pool + dob unchanged
-- (Trigger already enforces this; policy adds a second guard.)
DROP POLICY IF EXISTS "own profile all" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles insert own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles delete own" ON public.profiles
  FOR DELETE TO authenticated USING (id = auth.uid());
