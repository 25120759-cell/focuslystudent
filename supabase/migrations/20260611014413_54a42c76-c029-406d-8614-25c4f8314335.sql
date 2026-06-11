
-- Add kind column to ai_usage to log what each generation was for
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'chat';
ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS plan text;
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON public.ai_usage(user_id, created_at DESC);

-- Create ai_artifacts table for cloud backup of generated AI artifacts
CREATE TABLE IF NOT EXISTS public.ai_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('breakdown','notes')),
  ref_id text,
  title text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_artifacts TO authenticated;
GRANT ALL ON public.ai_artifacts TO service_role;

ALTER TABLE public.ai_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own artifacts" ON public.ai_artifacts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own artifacts" ON public.ai_artifacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own artifacts" ON public.ai_artifacts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own artifacts" ON public.ai_artifacts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_artifacts_user_kind_idx ON public.ai_artifacts(user_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_artifacts_user_ref_idx ON public.ai_artifacts(user_id, kind, ref_id);

CREATE TRIGGER ai_artifacts_set_updated_at
  BEFORE UPDATE ON public.ai_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
