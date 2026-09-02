import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Shared data model with Focusly Teacher.
 * Field names match the teacher app exactly (classrooms, enrollments, announcements,
 * class_assignments, submissions, student_metrics, ai_insights).
 */

const CLASS_FIELDS =
  "id, title, subject, grade_level, banner_color, join_code, room, period, ai_helper_enabled, ai_socratic_only, owner_id";

const ASSIGNMENT_FIELDS =
  'id, classroom_id, module, kind, title, description, rubric_json, due_date, points, status, "order"';

/** All classes the signed-in student is enrolled in, with teacher name. */
export const listMyClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("classroom_id, role, created_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (enrollments ?? []).map((e: any) => e.classroom_id);
    if (ids.length === 0) return { classes: [] };
    const { data: classes, error: cErr } = await supabase
      .from("classrooms")
      .select(CLASS_FIELDS)
      .in("id", ids)
      .order("title", { ascending: true });
    if (cErr) throw new Error(cErr.message);
    const ownerIds = Array.from(new Set((classes ?? []).map((c: any) => c.owner_id)));
    const { data: teachers } = await supabase
      .from("profiles")
      .select("id, full_name, display_name, avatar_color")
      .in("id", ownerIds.length ? ownerIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameOf = new Map<string, string>((teachers ?? []).map((t: any) => [t.id, t.full_name || t.display_name || "Your teacher"]));
    return {
      classes: (classes ?? []).map((c: any) => ({
        ...c,
        teacher_name: nameOf.get(c.owner_id) ?? "Your teacher",
      })),
    };
  });

export const joinClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ join_code: z.string().trim().min(4).max(12) }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase: any = (context as any).supabase;
    const { data: classroomId, error } = await supabase.rpc("join_classroom", { _code: data.join_code });
    if (error) throw new Error(error.message.replace(/^.*?:\s*/, "") || "Could not join that class");
    return { classroom_id: classroomId as string };
  });

export const leaveClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ classroom_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("user_id", userId)
      .eq("classroom_id", data.classroom_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Class detail: classroom, stream (pinned first), classwork (published only), grades. */
export const getClassroom = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ classroom_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;

    const { data: classroom, error } = await supabase
      .from("classrooms")
      .select(CLASS_FIELDS)
      .eq("id", data.classroom_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!classroom) return { classroom: null, announcements: [], assignments: [], submissions: [], people: [] };

    const [{ data: announcements }, { data: assignments }, { data: people }] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, classroom_id, author_id, content, created_at, pinned, scheduled_for, attachments")
        .eq("classroom_id", data.classroom_id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("class_assignments")
        .select(ASSIGNMENT_FIELDS)
        .eq("classroom_id", data.classroom_id)
        .eq("status", "published")
        .order("module", { ascending: true })
        .order("order", { ascending: true }),
      supabase.from("profiles").select("id, full_name, display_name, avatar_color").limit(200),
    ]);

    const annIds = (announcements ?? []).map((a: any) => a.id);
    const { data: comments } = annIds.length
      ? await supabase
          .from("announcement_comments")
          .select("id, announcement_id, author_id, content, created_at")
          .in("announcement_id", annIds)
          .order("created_at", { ascending: true })
      : { data: [] as any[] };

    const assignmentIds = (assignments ?? []).map((a: any) => a.id);
    const { data: submissions } = assignmentIds.length
      ? await supabase
          .from("submissions")
          .select(
            "id, assignment_id, student_id, content, submitted_at, score, criteria_scores, teacher_feedback, grade_status, returned_at",
          )
          .eq("student_id", userId)
          .in("assignment_id", assignmentIds)
      : { data: [] as any[] };

    const nameOf = new Map<string, { name: string; color: string }>(
      (people ?? []).map((p: any) => [p.id, { name: p.full_name || p.display_name || "Member", color: p.avatar_color }]),
    );

    return {
      classroom: {
        ...classroom,
        teacher_name: nameOf.get(classroom.owner_id)?.name ?? "Your teacher",
      },
      announcements: (announcements ?? []).map((a: any) => ({
        ...a,
        author_name: nameOf.get(a.author_id)?.name ?? "Teacher",
        comments: (comments ?? [])
          .filter((c: any) => c.announcement_id === a.id)
          .map((c: any) => ({ ...c, author_name: nameOf.get(c.author_id)?.name ?? "Classmate" })),
      })),
      assignments: assignments ?? [],
      // teacher_feedback is exposed; ai_feedback_draft is never selected for students
      submissions: submissions ?? [],
    };
  });

export const addAnnouncementComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        announcement_id: z.string().uuid(),
        classroom_id: z.string().uuid(),
        content: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: row, error } = await supabase
      .from("announcement_comments")
      .insert({ ...data, author_id: userId })
      .select("id, announcement_id, author_id, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { comment: row };
  });

/** Submit work → submission with grade_status "needs-review". */
export const submitWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ assignment_id: z.string().uuid(), content: z.string().trim().min(1).max(50000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const payload = {
      assignment_id: data.assignment_id,
      student_id: userId,
      content: data.content,
      submitted_at: new Date().toISOString(),
      grade_status: "needs-review",
    };
    const { data: row, error } = await supabase
      .from("submissions")
      .upsert(payload, { onConflict: "assignment_id,student_id" })
      .select("id, assignment_id, student_id, content, submitted_at, score, criteria_scores, teacher_feedback, grade_status")
      .single();
    if (error) throw new Error(error.message);
    return { submission: row };
  });

export const unsubmitWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ assignment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase
      .from("submissions")
      .update({ submitted_at: null, grade_status: "unsubmitted" })
      .eq("assignment_id", data.assignment_id)
      .eq("student_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Grades across every joined class. */
export const listGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data: submissions, error } = await supabase
      .from("submissions")
      .select(
        "id, assignment_id, score, criteria_scores, teacher_feedback, grade_status, submitted_at, returned_at",
      )
      .eq("student_id", userId)
      .order("returned_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    const ids = (submissions ?? []).map((s: any) => s.assignment_id);
    const { data: assignments } = ids.length
      ? await supabase.from("class_assignments").select(ASSIGNMENT_FIELDS).in("id", ids)
      : { data: [] as any[] };
    const classIds = Array.from(new Set((assignments ?? []).map((a: any) => a.classroom_id)));
    const { data: classes } = classIds.length
      ? await supabase.from("classrooms").select("id, title, banner_color, subject").in("id", classIds)
      : { data: [] as any[] };
    const aOf = new Map<string, any>((assignments ?? []).map((a: any) => [a.id, a]));
    const cOf = new Map<string, any>((classes ?? []).map((c: any) => [c.id, c]));
    return {
      grades: (submissions ?? []).map((s: any) => {
        const assignment = aOf.get(s.assignment_id) ?? null;
        return {
          ...s,
          assignment,
          classroom: assignment ? cOf.get(assignment.classroom_id) ?? null : null,
        };
      }),
    };
  });

/** Focus tracking — writes the daily shape the teacher AI Insights page reads. */
export const logFocusSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        minutes: z.number().int().min(1).max(720),
        distractions: z.number().int().min(0).max(500).optional().default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const day = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("student_metrics")
      .select("student_id, focus_logs, study_minutes, goal_completion_pct, ai_chats_week")
      .eq("student_id", userId)
      .maybeSingle();

    const logs: any[] = Array.isArray(existing?.focus_logs) ? [...existing.focus_logs] : [];
    const idx = logs.findIndex((l) => l.day === day);
    const minutes = (idx >= 0 ? Number(logs[idx].minutes) || 0 : 0) + data.minutes;
    const distractions = (idx >= 0 ? Number(logs[idx].distractions) || 0 : 0) + data.distractions;
    const focus_score = scoreFor(minutes, distractions);
    const entry = { day, minutes, distractions, focus_score };
    if (idx >= 0) logs[idx] = entry;
    else logs.push(entry);
    logs.sort((a, b) => String(a.day).localeCompare(String(b.day)));
    const recent = logs.slice(-30);

    const last7 = recent.slice(-7);
    const prev7 = recent.slice(-14, -7);
    const avg = (arr: any[]) => (arr.length ? arr.reduce((s, l) => s + (Number(l.focus_score) || 0), 0) / arr.length : 0);
    const trend = !prev7.length ? "steady" : avg(last7) > avg(prev7) + 3 ? "up" : avg(last7) < avg(prev7) - 3 ? "down" : "steady";

    const row = {
      student_id: userId,
      focus_logs: recent,
      focus_score: Math.round(avg(last7)),
      study_minutes: recent.reduce((s, l) => s + (Number(l.minutes) || 0), 0),
      trend,
    };
    const { data: saved, error } = await supabase
      .from("student_metrics")
      .upsert(row, { onConflict: "student_id" })
      .select("student_id, focus_score, study_minutes, goal_completion_pct, ai_chats_week, trend, focus_logs, strengths, weaknesses")
      .single();
    if (error) throw new Error(error.message);
    return { metrics: saved };
  });

function scoreFor(minutes: number, distractions: number) {
  const base = Math.min(100, Math.round((minutes / 90) * 100));
  return Math.max(0, Math.min(100, base - distractions * 4));
}

export const getMyMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { data, error } = await supabase
      .from("student_metrics")
      .select("student_id, focus_score, study_minutes, goal_completion_pct, ai_chats_week, trend, focus_logs, strengths, weaknesses")
      .eq("student_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { metrics: data ?? null };
  });

export const updateGoalCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ goal_completion_pct: z.number().int().min(0).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const { error } = await supabase
      .from("student_metrics")
      .upsert({ student_id: userId, goal_completion_pct: data.goal_completion_pct }, { onConflict: "student_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Notifications: new announcements, newly published classwork, returned grades. */
export const classNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ since: z.string().datetime().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { userId } = context as any;
    const supabase: any = (context as any).supabase;
    const since = data.since ?? new Date(Date.now() - 7 * 86400000).toISOString();

    const { data: enrollments } = await supabase.from("enrollments").select("classroom_id").eq("user_id", userId);
    const ids = (enrollments ?? []).map((e: any) => e.classroom_id);
    if (!ids.length) return { notifications: [] };

    const [{ data: announcements }, { data: assignments }, { data: graded }] = await Promise.all([
      supabase
        .from("announcements")
        .select("id, classroom_id, content, created_at")
        .in("classroom_id", ids)
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("class_assignments")
        .select("id, classroom_id, title, updated_at, due_date")
        .in("classroom_id", ids)
        .eq("status", "published")
        .gt("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("submissions")
        .select("id, assignment_id, score, grade_status, returned_at")
        .eq("student_id", userId)
        .eq("grade_status", "graded")
        .gt("returned_at", since)
        .order("returned_at", { ascending: false })
        .limit(20),
    ]);

    const { data: classes } = await supabase.from("classrooms").select("id, title, banner_color").in("id", ids);
    const cOf = new Map<string, any>((classes ?? []).map((c: any) => [c.id, c]));
    const gradedIds = (graded ?? []).map((g: any) => g.assignment_id);
    const { data: gradedAssignments } = gradedIds.length
      ? await supabase.from("class_assignments").select("id, title, classroom_id, points").in("id", gradedIds)
      : { data: [] as any[] };
    const gaOf = new Map<string, any>((gradedAssignments ?? []).map((a: any) => [a.id, a]));

    const notifications = [
      ...(announcements ?? []).map((a: any) => ({
        id: `ann-${a.id}`,
        kind: "announcement" as const,
        classroom_id: a.classroom_id,
        classroom_title: cOf.get(a.classroom_id)?.title ?? "Class",
        title: "New announcement",
        body: String(a.content).slice(0, 140),
        at: a.created_at,
      })),
      ...(assignments ?? []).map((a: any) => ({
        id: `asg-${a.id}`,
        kind: "assignment" as const,
        classroom_id: a.classroom_id,
        classroom_title: cOf.get(a.classroom_id)?.title ?? "Class",
        title: "New classwork published",
        body: a.title,
        at: a.updated_at,
      })),
      ...(graded ?? []).map((g: any) => ({
        id: `grade-${g.id}`,
        kind: "grade" as const,
        classroom_id: gaOf.get(g.assignment_id)?.classroom_id ?? null,
        classroom_title: cOf.get(gaOf.get(g.assignment_id)?.classroom_id)?.title ?? "Class",
        title: "Grade returned",
        body: `${gaOf.get(g.assignment_id)?.title ?? "Assignment"} — ${g.score ?? 0}/${gaOf.get(g.assignment_id)?.points ?? 0}`,
        at: g.returned_at,
      })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));

    return { notifications };
  });
