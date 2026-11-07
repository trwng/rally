
REVOKE EXECUTE ON FUNCTION public.my_pool() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_pool(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pool() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_pool(date) TO authenticated;
