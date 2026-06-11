
-- Prevent conversation participant swapping via UPDATE
DROP TRIGGER IF EXISTS prevent_conversation_participant_change_trg ON public.conversations;
CREATE TRIGGER prevent_conversation_participant_change_trg
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.prevent_conversation_participant_change();

-- Tighten feed_post_likes SELECT to only the current user's own likes.
-- Aggregate like counts are exposed via feed_posts.like_count.
DROP POLICY IF EXISTS "Auth users read likes" ON public.feed_post_likes;
CREATE POLICY "Users read own likes"
ON public.feed_post_likes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
