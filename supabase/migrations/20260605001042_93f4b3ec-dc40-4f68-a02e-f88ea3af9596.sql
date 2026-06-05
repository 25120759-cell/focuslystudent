REVOKE EXECUTE ON FUNCTION public.redeem_plan_code(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code(text) TO service_role;