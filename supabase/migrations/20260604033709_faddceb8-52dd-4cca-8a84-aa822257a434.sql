
-- Profiles: coins + daily pack open tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 200,
  ADD COLUMN IF NOT EXISTS pack_opens_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pack_opens_day date;

-- ===== Social feed =====
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read feed" ON public.feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own posts" ON public.feed_posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.feed_post_likes (
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feed_post_likes TO authenticated;
GRANT ALL ON public.feed_post_likes TO service_role;
ALTER TABLE public.feed_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read likes" ON public.feed_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like" ON public.feed_post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users unlike" ON public.feed_post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== DMs =====
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read conversation" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Anyone create conversation" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (user_a, user_b));
CREATE POLICY "Members update conversation" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() IN (user_a, user_b));

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read messages" ON public.conversation_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));
CREATE POLICY "Members send messages" ON public.conversation_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)));

CREATE INDEX IF NOT EXISTS idx_conv_msg_conv ON public.conversation_messages(conversation_id, created_at DESC);

-- ===== TCG: user cards =====
CREATE TABLE IF NOT EXISTS public.user_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id integer NOT NULL,
  obtained_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_cards_user ON public.user_cards(user_id);
GRANT SELECT, INSERT, DELETE ON public.user_cards TO authenticated;
GRANT ALL ON public.user_cards TO service_role;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own cards" ON public.user_cards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth users read others cards" ON public.user_cards FOR SELECT TO authenticated USING (true);
-- writes happen through server fns with supabaseAdmin (no client insert/delete policy)

CREATE TABLE IF NOT EXISTS public.card_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  offer_user_card_id uuid NOT NULL REFERENCES public.user_cards(id) ON DELETE CASCADE,
  request_card_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_trades_to ON public.card_trades(to_user, status);
CREATE INDEX IF NOT EXISTS idx_trades_from ON public.card_trades(from_user, status);
GRANT SELECT ON public.card_trades TO authenticated;
GRANT ALL ON public.card_trades TO service_role;
ALTER TABLE public.card_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read trades" ON public.card_trades FOR SELECT TO authenticated USING (auth.uid() IN (from_user, to_user));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
