
-- 1. profiles: plan + credit override
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_credit_override integer;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','pro','max'));

-- Allow admins to read & update any profile (for plan management)
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. posts: slug + summary
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS summary text;

-- Backfill slugs from titles
UPDATE public.posts
SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT posts_slug_unique UNIQUE (slug);

-- 3. assignments table
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due timestamptz,
  status text NOT NULL DEFAULT 'Opened' CHECK (status IN ('Opened','Completed','Late')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  tags text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own assignments"
  ON public.assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own assignments"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own assignments"
  ON public.assignments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users delete own assignments"
  ON public.assignments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX assignments_user_due_idx ON public.assignments(user_id, due);

-- 4. support_usage table
CREATE TABLE public.support_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_usage TO authenticated;
GRANT ALL ON public.support_usage TO service_role;

ALTER TABLE public.support_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own support usage"
  ON public.support_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own support usage"
  ON public.support_usage FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX support_usage_user_day_idx ON public.support_usage(user_id, day);

-- 5. Grant admin role to specified emails (if those users exist)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN ('afhaigh76@gmail.com', '25120759@sunwayeducation.info')
ON CONFLICT (user_id, role) DO NOTHING;
