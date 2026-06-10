GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code_for_user(uuid, text) TO authenticated, service_role;