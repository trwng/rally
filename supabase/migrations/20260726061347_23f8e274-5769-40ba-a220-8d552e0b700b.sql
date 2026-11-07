
-- Friend requests: mutual accept flow

CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool public.app_pool NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT no_self_request CHECK (from_user_id <> to_user_id),
  CONSTRAINT unique_pair UNIQUE (from_user_id, to_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.friend_requests_set_pool()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE recip_pool public.app_pool;
BEGIN
  NEW.pool := public.my_pool();
  SELECT pool INTO recip_pool FROM public.profiles WHERE id = NEW.to_user_id;
  IF recip_pool IS NULL OR recip_pool <> NEW.pool THEN
    RAISE EXCEPTION 'cross-pool friend request blocked';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_friend_requests_set_pool
BEFORE INSERT ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.friend_requests_set_pool();

CREATE OR REPLACE FUNCTION public.friend_requests_on_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.buddies(user_id, buddy_user_id, pool)
      VALUES (NEW.from_user_id, NEW.to_user_id, NEW.pool)
      ON CONFLICT DO NOTHING;
    INSERT INTO public.buddies(user_id, buddy_user_id, pool)
      VALUES (NEW.to_user_id, NEW.from_user_id, NEW.pool)
      ON CONFLICT DO NOTHING;
    NEW.responded_at := now();
  ELSIF NEW.status = 'declined' AND OLD.status <> 'declined' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_friend_requests_on_response
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.friend_requests_on_response();

CREATE POLICY "read own requests" ON public.friend_requests
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "send own requests" ON public.friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "recipient responds" ON public.friend_requests
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (to_user_id = auth.uid() AND status IN ('accepted','declined'));

CREATE POLICY "sender cancels" ON public.friend_requests
  FOR DELETE TO authenticated
  USING (from_user_id = auth.uid() AND status = 'pending');
