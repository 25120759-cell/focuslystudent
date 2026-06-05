CREATE TABLE IF NOT EXISTS public.plan_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan IN ('free','pro','max')),
  monthly_credit_override integer CHECK (monthly_credit_override IS NULL OR monthly_credit_override >= 0),
  max_redemptions integer NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_codes TO authenticated;
GRANT ALL ON public.plan_codes TO service_role;
ALTER TABLE public.plan_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plan codes" ON public.plan_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Users can read active redeemable codes" ON public.plan_codes FOR SELECT TO authenticated
  USING (active = true AND (expires_at IS NULL OR expires_at > now()) AND redeemed_count < max_redemptions);

CREATE TABLE IF NOT EXISTS public.plan_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.plan_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
GRANT SELECT, INSERT ON public.plan_code_redemptions TO authenticated;
GRANT ALL ON public.plan_code_redemptions TO service_role;
ALTER TABLE public.plan_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all plan redemptions" ON public.plan_code_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own plan redemptions" ON public.plan_code_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER plan_codes_updated_at
  BEFORE UPDATE ON public.plan_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.redeem_plan_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _code_row public.plan_codes%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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
REVOKE ALL ON FUNCTION public.redeem_plan_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_plan_code(text) TO service_role;