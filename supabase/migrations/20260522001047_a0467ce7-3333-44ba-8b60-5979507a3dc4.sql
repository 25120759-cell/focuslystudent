
-- AI usage tracking
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model text NOT NULL,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  month text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc')::date, 'YYYY-MM'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_day_idx ON public.ai_usage (user_id, day);
CREATE INDEX ai_usage_user_month_idx ON public.ai_usage (user_id, month);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Shared lists
CREATE TABLE public.shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_lists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shared_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.shared_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);
ALTER TABLE public.shared_list_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shared_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.shared_lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_list_items ENABLE ROW LEVEL SECURITY;

-- Helper: is the user a member or owner of a list?
CREATE OR REPLACE FUNCTION public.is_list_member(_list_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_lists WHERE id = _list_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.shared_list_members WHERE list_id = _list_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Members read lists" ON public.shared_lists FOR SELECT TO authenticated
  USING (public.is_list_member(id, auth.uid()));
CREATE POLICY "Anyone create list" ON public.shared_lists FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner update list" ON public.shared_lists FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Owner delete list" ON public.shared_lists FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owner manages members" ON public.shared_list_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shared_lists WHERE id = list_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shared_lists WHERE id = list_id AND owner_id = auth.uid()));
CREATE POLICY "Members see own membership" ON public.shared_list_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members read items" ON public.shared_list_items FOR SELECT TO authenticated
  USING (public.is_list_member(list_id, auth.uid()));
CREATE POLICY "Members insert items" ON public.shared_list_items FOR INSERT TO authenticated
  WITH CHECK (public.is_list_member(list_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Members update items" ON public.shared_list_items FOR UPDATE TO authenticated
  USING (public.is_list_member(list_id, auth.uid()));
CREATE POLICY "Members delete items" ON public.shared_list_items FOR DELETE TO authenticated
  USING (public.is_list_member(list_id, auth.uid()));

CREATE TRIGGER shared_lists_updated BEFORE UPDATE ON public.shared_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shared_list_items_updated BEFORE UPDATE ON public.shared_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_lists;
