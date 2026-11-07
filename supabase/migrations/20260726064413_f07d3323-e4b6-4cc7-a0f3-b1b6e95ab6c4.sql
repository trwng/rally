DROP POLICY IF EXISTS "delete own game" ON public.games;
DROP POLICY IF EXISTS "update own game" ON public.games;
DROP POLICY IF EXISTS "leave own" ON public.game_players;
DROP POLICY IF EXISTS "host removes player" ON public.game_players;

CREATE POLICY "hosts can update own pool games"
ON public.games
FOR UPDATE
TO authenticated
USING (
  host_user_id = auth.uid()
  AND pool = public.my_pool()
)
WITH CHECK (
  host_user_id = auth.uid()
  AND pool = public.my_pool()
);

CREATE POLICY "hosts can delete own pool games"
ON public.games
FOR DELETE
TO authenticated
USING (
  host_user_id = auth.uid()
  AND pool = public.my_pool()
);

CREATE POLICY "players can leave own pool games"
ON public.game_players
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND pool = public.my_pool()
);

CREATE POLICY "hosts can remove players from own pool games"
ON public.game_players
FOR DELETE
TO authenticated
USING (
  pool = public.my_pool()
  AND EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = game_players.game_id
      AND g.host_user_id = auth.uid()
      AND g.pool = public.my_pool()
  )
);