export interface StudentSubmission {
  grade_status?: string;
  returned_at?: string | null;
  score?: number | null;
  criteria_scores?: Record<string, unknown>;
  teacher_feedback?: string;
  [key: string]: unknown;
}

export function isReturnedGrade(submission: StudentSubmission | null | undefined) {
  return submission?.grade_status === "graded" && Boolean(submission.returned_at);
}

/** Apply the release rule before data leaves a student-facing server handler. */
export function studentSubmission<T extends StudentSubmission>(submission: T) {
  const { ai_feedback_draft: _privateDraft, ...safe } = submission;
  return isReturnedGrade(submission) ? safe : { ...safe, score: null, criteria_scores: {}, teacher_feedback: "", returned_at: null };
}

export function criterionResults(rubric: unknown, scores: Record<string, unknown> = {}) {
  const criteria = rubric && typeof rubric === "object" && "criteria" in rubric && Array.isArray(rubric.criteria) ? rubric.criteria : [];
  return criteria.map((criterion: { id?: string; name?: string; title?: string; points?: number; max?: number }, index: number) => {
    const id = criterion.id ?? String(index);
    const result = scores[id];
    const value = result && typeof result === "object" && "score" in result ? result.score : result;
    return { id, name: criterion.name ?? criterion.title ?? `Criterion ${index + 1}`, score: value == null ? "—" : String(value), possible: criterion.points ?? criterion.max };
  });
}