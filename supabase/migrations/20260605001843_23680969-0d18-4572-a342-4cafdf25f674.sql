CREATE OR REPLACE FUNCTION public.redeem_plan_code_for_user(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_row public.plan_codes%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user';
  END IF;

  SELECT * INTO _code_row
  FROM public.plan_codes
  WHERE upper(code) = upper(trim(_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid code';
  END IF;
  IF NOT _code_row.active THEN
    RAISE EXCEPTION 'This code is inactive';
  END IF;
  IF _code_row.expires_at IS NOT NULL AND _code_row.expires_at <= now() THEN
    RAISE EXCEPTION 'This code has expired';
  END IF;
  IF _code_row.redeemed_count >= _code_row.max_redemptions THEN
    RAISE EXCEPTION 'This code has already been fully redeemed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.plan_code_redemptions WHERE code_id = _code_row.id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'You already redeemed this code';
  END IF;

  INSERT INTO public.plan_code_redemptions (code_id, user_id)
  VALUES (_code_row.id, _user_id);

  UPDATE public.plan_codes
  SET redeemed_count = redeemed_count + 1
  WHERE id = _code_row.id;

  UPDATE public.profiles
  SET plan = _code_row.plan,
      monthly_credit_override = _code_row.monthly_credit_override
  WHERE id = _user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'plan', _code_row.plan,
    'monthly_credit_override', _code_row.monthly_credit_override
  );
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_plan_code_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code_for_user(uuid, text) TO service_role;