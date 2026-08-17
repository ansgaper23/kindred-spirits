-- Address linter warning 0029_authenticated_security_definer_function_executable
-- Revoke default public execute permission from the has_role function
-- to ensure it's only callable via RLS or by specific authorized roles.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
