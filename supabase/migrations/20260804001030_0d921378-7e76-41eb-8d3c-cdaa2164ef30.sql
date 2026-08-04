CREATE TABLE public.ai_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_threads TO authenticated;
GRANT ALL ON public.ai_threads TO service_role;
ALTER TABLE public.ai_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads select" ON public.ai_threads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own threads insert" ON public.ai_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own threads update" ON public.ai_threads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own threads delete" ON public.ai_threads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER ai_threads_set_updated_at BEFORE UPDATE ON public.ai_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_thread_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.ai_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_thread_messages_thread_idx ON public.ai_thread_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_thread_messages TO authenticated;
GRANT ALL ON public.ai_thread_messages TO service_role;
ALTER TABLE public.ai_thread_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msgs select" ON public.ai_thread_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own msgs insert" ON public.ai_thread_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own msgs delete" ON public.ai_thread_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);