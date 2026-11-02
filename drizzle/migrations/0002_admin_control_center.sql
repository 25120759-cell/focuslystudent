CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = _user_id
      AND lower(u.email) IN ('afhaigh76@gmail.com','25120759@sunwayeducation.info'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated, service_role;

CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'Cogni is getting a quick tune-up. We''ll be back shortly.',
  banner_message text NOT NULL DEFAULT '',
  banner_tone text NOT NULL DEFAULT 'info' CHECK (banner_tone IN ('info','warning','success')),
  ai_enabled boolean NOT NULL DEFAULT true,
  packs_enabled boolean NOT NULL DEFAULT true,
  trading_enabled boolean NOT NULL DEFAULT true,
  social_posting_enabled boolean NOT NULL DEFAULT true,
  doc_sharing_enabled boolean NOT NULL DEFAULT true,
  free_daily_ai_limit integer CHECK (free_daily_ai_limit IS NULL OR free_daily_ai_limit BETWEEN 0 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.app_settings (id) VALUES (1);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads app settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update app settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));

CREATE TABLE public.account_suspensions (
  user_id uuid PRIMARY KEY,
  reason text NOT NULL DEFAULT '',
  suspended_until timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_suspensions TO authenticated;
GRANT ALL ON public.account_suspensions TO service_role;
ALTER TABLE public.account_suspensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own suspension" ON public.account_suspensions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_admin(auth.uid()));
CREATE POLICY "Admins insert suspensions" ON public.account_suspensions FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()) AND user_id <> auth.uid());
CREATE POLICY "Admins update suspensions" ON public.account_suspensions FOR UPDATE TO authenticated
  USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete suspensions" ON public.account_suspensions FOR DELETE TO authenticated
  USING (public.is_app_admin(auth.uid()));

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));
CREATE POLICY "Admins write audit log" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin(auth.uid()) AND admin_id = auth.uid());

-- Blocked = maintenance (non-admin) or actively suspended
CREATE OR REPLACE FUNCTION public.app_blocked(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT public.is_app_admin(_user_id) AND (
    COALESCE((SELECT maintenance_mode FROM public.app_settings WHERE id = 1), false)
    OR EXISTS (SELECT 1 FROM public.account_suspensions s WHERE s.user_id = _user_id AND s.suspended_until > now()))
$$;
REVOKE EXECUTE ON FUNCTION public.app_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_blocked(uuid) TO authenticated, service_role;

-- Privacy-safe aggregate counts only
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_app_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'new_users_week', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'pro', (SELECT count(*) FROM public.profiles WHERE plan = 'pro'),
    'max', (SELECT count(*) FROM public.profiles WHERE plan = 'max'),
    'ai_today', (SELECT count(*) FROM public.ai_usage WHERE day = current_date),
    'ai_month', (SELECT count(*) FROM public.ai_usage WHERE month = to_char(now(),'YYYY-MM')),
    'assignments', (SELECT count(*) FROM public.assignments),
    'docs', (SELECT count(*) FROM public.docs),
    'classrooms', (SELECT count(*) FROM public.classrooms),
    'posts_week', (SELECT count(*) FROM public.feed_posts WHERE created_at > now() - interval '7 days'),
    'suspended', (SELECT count(*) FROM public.account_suspensions WHERE suspended_until > now())
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated, service_role;

-- Database-level blocks for writes by blocked users
CREATE POLICY "Blocked users cannot post" ON public.feed_posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()) AND COALESCE((SELECT social_posting_enabled FROM public.app_settings WHERE id = 1), true) OR public.is_app_admin(auth.uid()));
CREATE POLICY "Blocked users cannot message" ON public.conversation_messages AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()));
CREATE POLICY "Blocked users cannot comment" ON public.announcement_comments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()));
CREATE POLICY "Blocked users cannot add assignments" ON public.assignments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()));
CREATE POLICY "Blocked users cannot create docs" ON public.docs AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()));
CREATE POLICY "Blocked users cannot share docs" ON public.doc_shares AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.app_blocked(auth.uid()) AND COALESCE((SELECT doc_sharing_enabled FROM public.app_settings WHERE id = 1), true));