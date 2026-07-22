
-- DOCS
CREATE TABLE IF NOT EXISTS public.docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_html TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  paste_count INTEGER NOT NULL DEFAULT 0,
  edit_seconds INTEGER NOT NULL DEFAULT 0,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docs TO authenticated;
GRANT ALL ON public.docs TO service_role;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own docs"
  ON public.docs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER docs_set_updated_at BEFORE UPDATE ON public.docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DOC EVENTS (keystroke telemetry)
CREATE TABLE IF NOT EXISTS public.doc_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('keystroke','paste','session_start','session_end')),
  chars INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_events TO authenticated;
GRANT ALL ON public.doc_events TO service_role;
ALTER TABLE public.doc_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own doc events"
  ON public.doc_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS doc_events_doc_idx ON public.doc_events(doc_id, created_at);

-- DOC SHARES (per-email roles)
CREATE TABLE IF NOT EXISTS public.doc_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer','commenter','editor')),
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_id, shared_with_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_shares TO authenticated;
GRANT ALL ON public.doc_shares TO service_role;
ALTER TABLE public.doc_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their doc shares"
  ON public.doc_shares FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Invitees read their shares"
  ON public.doc_shares FOR SELECT
  USING (lower(shared_with_email) = lower(coalesce((auth.jwt() ->> 'email'),'')));

CREATE OR REPLACE FUNCTION public.doc_role_for(_doc_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.doc_shares
  WHERE doc_id = _doc_id
    AND lower(shared_with_email) = lower(coalesce((SELECT email FROM auth.users WHERE id = _user_id), ''))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.doc_role_for(uuid,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.doc_role_for(uuid,uuid) TO authenticated;

CREATE POLICY "Invitees can read shared docs"
  ON public.docs FOR SELECT
  USING (public.doc_role_for(id, auth.uid()) IN ('viewer','commenter','editor'));

CREATE POLICY "Editors can update shared docs"
  ON public.docs FOR UPDATE
  USING (public.doc_role_for(id, auth.uid()) = 'editor');

-- DOC COMMENTS
CREATE TABLE IF NOT EXISTS public.doc_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id UUID NOT NULL REFERENCES public.docs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doc_comments TO authenticated;
GRANT ALL ON public.doc_comments TO service_role;
ALTER TABLE public.doc_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doc participants read comments"
  ON public.doc_comments FOR SELECT
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.docs d WHERE d.id = doc_id AND d.user_id = auth.uid())
    OR public.doc_role_for(doc_id, auth.uid()) IN ('viewer','commenter','editor')
  );

CREATE POLICY "Doc commenters and editors add comments"
  ON public.doc_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND (
      EXISTS (SELECT 1 FROM public.docs d WHERE d.id = doc_id AND d.user_id = auth.uid())
      OR public.doc_role_for(doc_id, auth.uid()) IN ('commenter','editor')
    )
  );

CREATE POLICY "Authors edit own comments"
  ON public.doc_comments FOR UPDATE
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or doc owners delete comments"
  ON public.doc_comments FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.docs d WHERE d.id = doc_id AND d.user_id = auth.uid())
  );

-- USER FILES (existing table referenced in code; create if missing)
CREATE TABLE IF NOT EXISTS public.user_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_files TO authenticated;
GRANT ALL ON public.user_files TO service_role;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own files" ON public.user_files;
CREATE POLICY "Users manage their own files"
  ON public.user_files FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_files_set_updated_at ON public.user_files;
CREATE TRIGGER user_files_set_updated_at BEFORE UPDATE ON public.user_files
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS ai_artifacts_kind_idx ON public.ai_artifacts (user_id, kind);
