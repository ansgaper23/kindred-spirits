-- Fix: Add RLS policy for user_roles
create policy "Users can view their own roles" on public.user_roles for select using (auth.uid() = user_id);

-- Fix: Revoke public execute on has_role to prevent anon usage
revoke execute on function public.has_role(uuid, app_role) from public;
revoke execute on function public.has_role(uuid, app_role) from anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.has_role(uuid, app_role) to service_role;
