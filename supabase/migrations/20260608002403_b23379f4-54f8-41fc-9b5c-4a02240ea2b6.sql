
-- Lock participant columns on conversations
CREATE OR REPLACE FUNCTION public.prevent_conversation_participant_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_a IS DISTINCT FROM OLD.user_a OR NEW.user_b IS DISTINCT FROM OLD.user_b THEN
    RAISE EXCEPTION 'Conversation participants cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_lock_participants ON public.conversations;
CREATE TRIGGER conversations_lock_participants
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.prevent_conversation_participant_change();

-- Tighten the update policy with an explicit WITH CHECK
DROP POLICY IF EXISTS "Members update conversation" ON public.conversations;
CREATE POLICY "Members update conversation"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
