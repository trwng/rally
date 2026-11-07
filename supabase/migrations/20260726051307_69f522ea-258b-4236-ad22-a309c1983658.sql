
DELETE FROM public.messages;
DELETE FROM public.threads;
DELETE FROM public.game_players;
DELETE FROM public.games;
DELETE FROM public.buddies;

DROP POLICY IF EXISTS "read own thread" ON public.threads;

DROP TABLE IF EXISTS public.demo_players CASCADE;
ALTER TABLE public.game_players DROP COLUMN IF EXISTS demo_player_id;
ALTER TABLE public.games DROP COLUMN IF EXISTS host_demo_id;
ALTER TABLE public.threads DROP COLUMN IF EXISTS peer_demo_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS author_demo_id;
ALTER TABLE public.buddies DROP COLUMN IF EXISTS buddy_demo_id;

ALTER TABLE public.games ALTER COLUMN host_user_id SET NOT NULL;
ALTER TABLE public.messages ALTER COLUMN author_user_id SET NOT NULL;
ALTER TABLE public.buddies ALTER COLUMN buddy_user_id SET NOT NULL;

CREATE POLICY "read own thread" ON public.threads FOR SELECT TO authenticated
USING (
  pool = public.my_pool() AND (
    (kind = 'dm' AND (owner_user_id = auth.uid() OR peer_user_id = auth.uid()))
    OR (kind = 'game' AND EXISTS (SELECT 1 FROM public.game_players gp WHERE gp.game_id = threads.game_id AND gp.user_id = auth.uid()))
    OR (kind = 'game' AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = threads.game_id AND g.host_user_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "host removes player" ON public.game_players;
CREATE POLICY "host removes player" ON public.game_players FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.games g WHERE g.id = game_id AND g.host_user_id = auth.uid()));
