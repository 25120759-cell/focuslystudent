
-- profiles parity columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS avatar_color text NOT NULL DEFAULT 'blue',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  grade_level text NOT NULL DEFAULT '',
  banner_color text NOT NULL DEFAULT 'blue',
  join_code text NOT NULL UNIQUE,
  room text NOT NULL DEFAULT '',
  period text NOT NULL DEFAULT '',
  ai_helper_enabled boolean NOT NULL DEFAULT true,
  ai_socratic_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO authenticated;
GRANT ALL ON public.classrooms TO service_role;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, classroom_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_enrolled(_classroom_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments WHERE classroom_id = _classroom_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.classrooms WHERE id = _classroom_id AND owner_id = _user_id
  )
$$;
REVOKE ALL ON FUNCTION public.is_enrolled(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.owns_classroom(_classroom_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classrooms WHERE id = _classroom_id AND owner_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.owns_classroom(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_classroom(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.teaches_student(_student_id uuid, _teacher_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.classrooms c ON c.id = e.classroom_id
    WHERE e.user_id = _student_id AND c.owner_id = _teacher_id
  )
$$;
REVOKE ALL ON FUNCTION public.teaches_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teaches_student(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "classrooms_select_members" ON public.classrooms FOR SELECT TO authenticated
  USING (public.is_enrolled(id, auth.uid()));
CREATE POLICY "classrooms_owner_insert" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "classrooms_owner_update" ON public.classrooms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "classrooms_owner_delete" ON public.classrooms FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "enrollments_select_self_or_teacher" ON public.enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "enrollments_insert_self_student" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'student');
CREATE POLICY "enrollments_delete_self_or_teacher" ON public.enrollments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.owns_classroom(classroom_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  scheduled_for timestamptz,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_members" ON public.announcements FOR SELECT TO authenticated
  USING (
    public.is_enrolled(classroom_id, auth.uid())
    AND (public.owns_classroom(classroom_id, auth.uid()) OR scheduled_for IS NULL OR scheduled_for <= now())
  );
CREATE POLICY "announcements_teacher_write" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.owns_classroom(classroom_id, auth.uid()) AND author_id = auth.uid());
CREATE POLICY "announcements_teacher_update" ON public.announcements FOR UPDATE TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid())) WITH CHECK (public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "announcements_teacher_delete" ON public.announcements FOR DELETE TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT ALL ON public.announcement_comments TO service_role;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_members" ON public.announcement_comments FOR SELECT TO authenticated
  USING (public.is_enrolled(classroom_id, auth.uid()));
CREATE POLICY "comments_insert_members" ON public.announcement_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_enrolled(classroom_id, auth.uid()));
CREATE POLICY "comments_delete_own_or_teacher" ON public.announcement_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.owns_classroom(classroom_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  module text NOT NULL DEFAULT 'General',
  kind text NOT NULL DEFAULT 'assignment',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  rubric_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date timestamptz,
  points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_assignments TO authenticated;
GRANT ALL ON public.class_assignments TO service_role;
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_assignments_select_published" ON public.class_assignments FOR SELECT TO authenticated
  USING (
    public.owns_classroom(classroom_id, auth.uid())
    OR (public.is_enrolled(classroom_id, auth.uid()) AND status = 'published')
  );
CREATE POLICY "class_assignments_teacher_insert" ON public.class_assignments FOR INSERT TO authenticated
  WITH CHECK (public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "class_assignments_teacher_update" ON public.class_assignments FOR UPDATE TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid())) WITH CHECK (public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "class_assignments_teacher_delete" ON public.class_assignments FOR DELETE TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  submitted_at timestamptz,
  score numeric,
  criteria_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_feedback_draft text,
  teacher_feedback text,
  grade_status text NOT NULL DEFAULT 'unsubmitted',
  returned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.submissions TO authenticated;
GRANT ALL ON public.submissions TO service_role;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assignment_classroom(_assignment_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT classroom_id FROM public.class_assignments WHERE id = _assignment_id
$$;
REVOKE ALL ON FUNCTION public.assignment_classroom(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assignment_classroom(uuid) TO authenticated, service_role;

CREATE POLICY "submissions_select_own_or_teacher" ON public.submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.owns_classroom(public.assignment_classroom(assignment_id), auth.uid()));
CREATE POLICY "submissions_insert_own" ON public.submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.is_enrolled(public.assignment_classroom(assignment_id), auth.uid()));
CREATE POLICY "submissions_update_own_or_teacher" ON public.submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.owns_classroom(public.assignment_classroom(assignment_id), auth.uid()))
  WITH CHECK (student_id = auth.uid() OR public.owns_classroom(public.assignment_classroom(assignment_id), auth.uid()));

-- students may not silently change their own grade fields
CREATE OR REPLACE FUNCTION public.protect_submission_grade_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.student_id = auth.uid() AND NOT public.owns_classroom(public.assignment_classroom(NEW.assignment_id), auth.uid()) THEN
    IF NEW.score IS DISTINCT FROM OLD.score
       OR NEW.criteria_scores IS DISTINCT FROM OLD.criteria_scores
       OR NEW.teacher_feedback IS DISTINCT FROM OLD.teacher_feedback
       OR NEW.ai_feedback_draft IS DISTINCT FROM OLD.ai_feedback_draft THEN
      RAISE EXCEPTION 'Cannot modify grading fields';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS submissions_protect_grades ON public.submissions;
CREATE TRIGGER submissions_protect_grades BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_submission_grade_fields();

CREATE TABLE IF NOT EXISTS public.student_metrics (
  student_id uuid PRIMARY KEY,
  focus_score integer NOT NULL DEFAULT 0,
  study_minutes integer NOT NULL DEFAULT 0,
  goal_completion_pct integer NOT NULL DEFAULT 0,
  ai_chats_week integer NOT NULL DEFAULT 0,
  trend text NOT NULL DEFAULT 'steady',
  focus_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_metrics TO authenticated;
GRANT ALL ON public.student_metrics TO service_role;
ALTER TABLE public.student_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_metrics_select_own_or_teacher" ON public.student_metrics FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.teaches_student(student_id, auth.uid()));
CREATE POLICY "student_metrics_insert_own" ON public.student_metrics FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "student_metrics_update_own" ON public.student_metrics FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP TRIGGER IF EXISTS student_metrics_set_updated_at ON public.student_metrics;
CREATE TRIGGER student_metrics_set_updated_at BEFORE UPDATE ON public.student_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  severity_level text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  recommendation_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_insights_teacher_only_select" ON public.ai_insights FOR SELECT TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "ai_insights_teacher_insert" ON public.ai_insights FOR INSERT TO authenticated
  WITH CHECK (public.owns_classroom(classroom_id, auth.uid()));
CREATE POLICY "ai_insights_teacher_delete" ON public.ai_insights FOR DELETE TO authenticated
  USING (public.owns_classroom(classroom_id, auth.uid()));

-- safe join-by-code helper (students cannot read classrooms they are not in)
CREATE OR REPLACE FUNCTION public.join_classroom(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _class_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _class_id FROM public.classrooms WHERE upper(join_code) = upper(trim(_code));
  IF _class_id IS NULL THEN RAISE EXCEPTION 'That class code does not match any class'; END IF;
  INSERT INTO public.enrollments (user_id, classroom_id, role)
  VALUES (_uid, _class_id, 'student')
  ON CONFLICT (user_id, classroom_id) DO NOTHING;
  RETURN _class_id;
END;
$$;
REVOKE ALL ON FUNCTION public.join_classroom(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_classroom(text) TO authenticated, service_role;

DROP TRIGGER IF EXISTS classrooms_set_updated_at ON public.classrooms;
CREATE TRIGGER classrooms_set_updated_at BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS class_assignments_set_updated_at ON public.class_assignments;
CREATE TRIGGER class_assignments_set_updated_at BEFORE UPDATE ON public.class_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS announcements_class_idx ON public.announcements(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS class_assignments_class_idx ON public.class_assignments(classroom_id, "order");
CREATE INDEX IF NOT EXISTS submissions_student_idx ON public.submissions(student_id);
