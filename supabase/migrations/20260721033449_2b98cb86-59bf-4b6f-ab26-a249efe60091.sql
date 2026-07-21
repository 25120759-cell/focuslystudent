
-- 1) Profiles: block self-edits of sensitive fields via trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF auth.uid() = OLD.id THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.coins IS DISTINCT FROM OLD.coins
       OR NEW.monthly_credit_override IS DISTINCT FROM OLD.monthly_credit_override
       OR NEW.pack_opens_today IS DISTINCT FROM OLD.pack_opens_today
       OR NEW.accepted_terms_at IS DISTINCT FROM OLD.accepted_terms_at
       OR NEW.accepted_privacy_at IS DISTINCT FROM OLD.accepted_privacy_at
       OR NEW.accepted_content_policy_at IS DISTINCT FROM OLD.accepted_content_policy_at
       OR NEW.legal_version IS DISTINCT FROM OLD.legal_version THEN
      RAISE EXCEPTION 'Cannot modify protected profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_sensitive_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_sensitive_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_self_update();

-- 2) ai_usage: remove client insert policy (server writes only via service role)
DROP POLICY IF EXISTS "Users insert own usage" ON public.ai_usage;

-- 3) support_usage: remove client insert policy
DROP POLICY IF EXISTS "Users insert own support usage" ON public.support_usage;

-- 4) conversations: restrict update to only last_message_at changes
CREATE OR REPLACE FUNCTION public.enforce_conversation_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_a IS DISTINCT FROM OLD.user_a
     OR NEW.user_b IS DISTINCT FROM OLD.user_b
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only last_message_at may be updated on conversations';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_conversation_update_scope ON public.conversations;
CREATE TRIGGER trg_enforce_conversation_update_scope
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_update_scope();

-- 5) Revoke public/anon execute on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_plan_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_plan_code_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
