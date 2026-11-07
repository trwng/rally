
CREATE OR REPLACE FUNCTION public.games_bump_spots()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.games SET spots_taken = spots_taken + 1 WHERE id = NEW.game_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.games SET spots_taken = greatest(0, spots_taken - 1) WHERE id = OLD.game_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE EXECUTE ON FUNCTION public.games_bump_spots() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_gp_bump AFTER INSERT OR DELETE ON public.game_players
FOR EACH ROW EXECUTE FUNCTION public.games_bump_spots();

-- Tighten thread inserts: user must be the owner
DROP POLICY IF EXISTS "insert thread own pool" ON public.threads;
CREATE POLICY "insert own thread" ON public.threads FOR INSERT TO authenticated
  WITH CHECK (pool = public.my_pool() AND owner_user_id = auth.uid());
