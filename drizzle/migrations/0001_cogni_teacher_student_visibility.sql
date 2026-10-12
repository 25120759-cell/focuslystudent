CREATE POLICY "Teachers read enrolled student profiles" ON public.profiles FOR SELECT TO authenticated USING (public.teaches_student(id, auth.uid()));
ALTER TABLE public.ai_insights ADD COLUMN IF NOT EXISTS visible_to_student boolean NOT NULL DEFAULT false;
GRANT SELECT, INSERT, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
CREATE POLICY "Students read published own insights" ON public.ai_insights FOR SELECT TO authenticated USING (student_id = auth.uid() AND visible_to_student = true);
COMMENT ON COLUMN public.ai_insights.visible_to_student IS 'Teacher must explicitly publish an insight before the student may read it. Existing insights remain teacher-only.';
REVOKE SELECT ON public.submissions FROM authenticated, anon;
GRANT SELECT (id, assignment_id, student_id, content, submitted_at, score, criteria_scores, teacher_feedback, grade_status, returned_at, created_at, updated_at) ON public.submissions TO authenticated;
REVOKE SELECT (ai_feedback_draft) ON public.submissions FROM authenticated, anon;
CREATE OR REPLACE FUNCTION public.teacher_submission_draft(_submission_id uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT s.ai_feedback_draft INTO result FROM public.submissions s JOIN public.class_assignments a ON a.id = s.assignment_id JOIN public.classrooms c ON c.id = a.classroom_id WHERE s.id = _submission_id AND c.owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission unavailable'; END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.teacher_submission_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_submission_draft(uuid) TO authenticated, service_role;