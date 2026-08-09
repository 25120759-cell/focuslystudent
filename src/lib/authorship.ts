export interface AuthorshipEvent {
  kind: "keystroke" | "paste" | "session_start" | "session_end";
  chars: number;
  created_at: string;
}

export type AuthorshipLevel = "typed" | "mostly-typed" | "mixed" | "pasted" | "unsure" | "insufficient";

/** How much we trust the underlying telemetry, independent of the score itself. */
export type ConfidenceBand = "high" | "moderate" | "low";

export interface EvidenceItem {
  /** stable id, useful for tests */
  id: string;
  label: string;
  /** the measured value, formatted for display */
  value: string;
  /** plain-language explanation of what this signal means */
  detail: string;
  /** signed points this signal contributed to the final score */
  impact: number;
  direction: "positive" | "negative" | "neutral";
}

export interface AuthorshipInputs {
  textLength: number;
  typedChars: number;
  pasteChars: number;
  pasteEvents: number;
  burstPastes: number;
  largestPaste: number;
  sessions: number;
  minutes: number;
  editSeconds: number;
  firstEventAt: string | null;
  lastEventAt: string | null;
  spanMinutes: number;
  typedCoverage: number;
  pasteShare: number;
  unaccounted: number;
  charsPerMinute: number;
  burstScore: number;
}

export interface AuthorshipSignals extends AuthorshipInputs {
  score: number;
  level: AuthorshipLevel;
  label: string;
  summary: string;
  confidence: ConfidenceBand;
  confidenceReason: string;
  evidence: EvidenceItem[];
  flags: string[];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Calibration notes (tuned against real Focusly Docs samples):
 * - Keystroke counts include corrections/deletions, so a genuinely hand-written
 *   document usually records MORE keystrokes than final characters. Coverage of
 *   ~75% or above is therefore treated as fully accounted for, and short docs
 *   (< 400 chars) get a wider tolerance because a few autocompletions or
 *   formatting inserts skew small samples.
 * - Observed sample: 810-word doc with only 87 recorded keystrokes and no paste
 *   events => ~99% unaccounted, which must land firmly in "largely pasted".
 * - A doc with a handful of small pastes (quotes/citations) under 15% share must
 *   still read as human-written.
 */
const FULL_COVERAGE_RATIO = 0.75;
const SHORT_DOC_CHARS = 400;
const MIN_ANALYSABLE_CHARS = 120;

export function analyseAuthorship(
  doc: { content_html: string; word_count: number; paste_count: number; edit_seconds: number },
  events: AuthorshipEvent[],
): AuthorshipSignals {
  const text = stripHtml(doc.content_html || "");
  const textLength = text.length;
  const keystrokeEvents = events.filter((e) => e.kind === "keystroke");
  const pasteEventList = events.filter((e) => e.kind === "paste");
  const typedChars = keystrokeEvents.reduce((a, b) => a + (b.chars || 0), 0);
  const pasteChars = pasteEventList.reduce((a, b) => a + (b.chars || 0), 0);
  const largestPaste = pasteEventList.reduce((a, b) => Math.max(a, b.chars || 0), 0);
  const pasteEvents = Math.max(doc.paste_count || 0, pasteEventList.length);
  const burstPastes = pasteEventList.filter((e) => (e.chars || 0) >= 200).length;
  const sessions = Math.max(1, events.filter((e) => e.kind === "session_start").length);
  const editSeconds = Math.max(0, doc.edit_seconds || 0);
  const minutes = Math.max(0, Math.round(editSeconds / 60));

  const sorted = [...events].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const firstEventAt = sorted[0]?.created_at ?? null;
  const lastEventAt = sorted[sorted.length - 1]?.created_at ?? null;
  const spanMinutes =
    firstEventAt && lastEventAt
      ? Math.max(0, Math.round((+new Date(lastEventAt) - +new Date(firstEventAt)) / 60000))
      : 0;

  const recorded = typedChars + pasteChars;
  const tolerance = textLength < SHORT_DOC_CHARS ? 0.6 : FULL_COVERAGE_RATIO;
  const rawCoverage = textLength > 0 ? typedChars / textLength : 0;
  const typedCoverage = pct((rawCoverage / tolerance) * 100);
  const pasteShare = recorded > 0 ? pct((pasteChars / recorded) * 100) : 0;
  const unaccounted = textLength > 0 ? pct(((textLength - recorded) / textLength) * 100) : 0;
  const charsPerMinute = editSeconds > 0 ? Math.round(typedChars / Math.max(1, editSeconds / 60)) : 0;
  const burstScore = textLength > 0 ? pct((largestPaste / textLength) * 100) : 0;

  const inputs: AuthorshipInputs = {
    textLength, typedChars, pasteChars, pasteEvents, burstPastes, largestPaste, sessions,
    minutes, editSeconds, firstEventAt, lastEventAt, spanMinutes,
    typedCoverage, pasteShare, unaccounted, charsPerMinute, burstScore,
  };

  if (textLength < MIN_ANALYSABLE_CHARS || (recorded === 0 && textLength > 0)) {
    const tooShort = textLength < MIN_ANALYSABLE_CHARS;
    return {
      ...inputs,
      score: 0,
      level: "insufficient",
      label: "Not enough evidence",
      confidence: "low",
      confidenceReason: tooShort
        ? `Only ${textLength} characters of text — below the ${MIN_ANALYSABLE_CHARS}-character minimum for analysis.`
        : "No typing or paste activity was recorded at all, so nothing can be measured.",
      summary: tooShort
        ? "This document is too short for a meaningful authorship analysis."
        : "No editing activity was recorded for this document, so its origin cannot be verified. The text may have been added outside Focusly Docs.",
      evidence: [
        {
          id: "text-length",
          label: "Document length",
          value: `${textLength.toLocaleString()} characters`,
          detail: tooShort ? "Too short to produce a reliable signal." : "Text exists but has no recorded origin.",
          impact: 0,
          direction: "neutral",
        },
      ],
      flags: recorded === 0 && !tooShort ? ["No typing or paste activity recorded"] : [],
    };
  }

  const evidence: EvidenceItem[] = [];
  const flags: string[] = [];

  // Base: how much of the final text the recorded keystrokes explain.
  let score = typedCoverage;
  evidence.push({
    id: "typed-coverage",
    label: "Typed coverage",
    value: `${typedCoverage}%`,
    detail: `${typedChars.toLocaleString()} recorded keystrokes against ${textLength.toLocaleString()} final characters. This sets the starting score.`,
    impact: typedCoverage,
    direction: typedCoverage >= 70 ? "positive" : "negative",
  });

  const add = (item: Omit<EvidenceItem, "direction"> & { direction?: EvidenceItem["direction"] }) => {
    evidence.push({ ...item, direction: item.direction ?? (item.impact < 0 ? "negative" : item.impact > 0 ? "positive" : "neutral") });
    score += item.impact;
  };

  if (unaccounted > 15) {
    const impact = -Math.min(45, (unaccounted - 15) * 0.55);
    add({
      id: "unaccounted",
      label: "Unaccounted text",
      value: `${unaccounted}%`,
      detail: "Text that appeared without a matching keystroke or paste event — typically inserted from outside the editor.",
      impact: Math.round(impact),
    });
    flags.push(`${unaccounted}% of the text has no recorded typing or paste origin`);
  } else {
    evidence.push({
      id: "unaccounted",
      label: "Unaccounted text",
      value: `${unaccounted}%`,
      detail: "Almost all of the final text is explained by recorded activity.",
      impact: 0,
      direction: "positive",
    });
  }

  if (pasteShare > 15) {
    const impact = -Math.min(50, (pasteShare - 15) * 0.4);
    add({
      id: "paste-share",
      label: "Paste share",
      value: `${pasteShare}%`,
      detail: `${pasteChars.toLocaleString()} of ${recorded.toLocaleString()} recorded characters arrived by paste.`,
      impact: Math.round(impact),
    });
    flags.push(`${pasteShare}% of recorded input arrived by paste`);
  } else {
    evidence.push({
      id: "paste-share",
      label: "Paste share",
      value: `${pasteShare}%`,
      detail: pasteEvents > 0
        ? `${pasteEvents} paste${pasteEvents === 1 ? "" : "s"} detected, small enough to look like quotes or citations.`
        : "No paste activity recorded.",
      impact: 0,
      direction: "positive",
    });
  }

  if (burstScore >= 20) {
    const impact = -Math.min(30, burstScore * 0.45);
    add({
      id: "burst-paste",
      label: "Largest single paste",
      value: `${largestPaste.toLocaleString()} chars (${burstScore}%)`,
      detail: "One paste supplied a large share of the document in a single action.",
      impact: Math.round(impact),
    });
    flags.push(`A single paste supplied ${burstScore}% of the document (${largestPaste.toLocaleString()} characters)`);
  } else {
    evidence.push({
      id: "burst-paste",
      label: "Largest single paste",
      value: largestPaste > 0 ? `${largestPaste.toLocaleString()} chars (${burstScore}%)` : "None",
      detail: "No single paste dominates the document.",
      impact: 0,
      direction: "positive",
    });
  }

  if (burstPastes >= 3) {
    add({
      id: "burst-count",
      label: "Large pastes (200+ chars)",
      value: String(burstPastes),
      detail: "Repeated bulk inserts suggest content assembled from elsewhere.",
      impact: -Math.min(15, burstPastes * 3),
    });
    flags.push(`${burstPastes} large pastes of 200+ characters`);
  } else {
    evidence.push({
      id: "burst-count",
      label: "Large pastes (200+ chars)",
      value: String(burstPastes),
      detail: "Bulk inserts are rare or absent.",
      impact: 0,
      direction: burstPastes === 0 ? "positive" : "neutral",
    });
  }

  if (charsPerMinute > 900) {
    add({
      id: "typing-speed",
      label: "Typing speed",
      value: `${charsPerMinute.toLocaleString()} chars/min`,
      detail: "Far above sustained human typing speed (~250–450 chars/min), which points to machine or bulk input.",
      impact: -20,
    });
    flags.push(`Unusually fast input: ~${charsPerMinute.toLocaleString()} characters per minute`);
  } else {
    evidence.push({
      id: "typing-speed",
      label: "Typing speed",
      value: `${charsPerMinute.toLocaleString()} chars/min`,
      detail: "Within a plausible human typing range.",
      impact: 0,
      direction: "positive",
    });
  }

  if (minutes <= 1 && textLength > 1500) {
    add({
      id: "timing",
      label: "Time on task",
      value: `${minutes} min for ${textLength.toLocaleString()} chars`,
      detail: "A long document appeared within a minute of recorded editing time.",
      impact: -20,
    });
    flags.push("A long document appeared in under a minute of editing time");
  } else {
    evidence.push({
      id: "timing",
      label: "Time on task",
      value: `${minutes} min across ${sessions} session${sessions === 1 ? "" : "s"}`,
      detail: spanMinutes > minutes
        ? `Work spread over roughly ${spanMinutes} min from first to last recorded event.`
        : "Editing time is consistent with the amount of text produced.",
      impact: 0,
      direction: "positive",
    });
  }

  if (pasteEvents > 0 && flags.length === 0) {
    flags.push(`${pasteEvents} small paste${pasteEvents === 1 ? "" : "s"} detected (quotes or citations)`);
  }

  score = pct(score);

  // Telemetry confidence — how much the evidence itself can be relied on.
  let confidence: ConfidenceBand = "high";
  let confidenceReason = "Plenty of recorded activity across the whole document.";
  if (textLength < 600 || editSeconds < 60) {
    confidence = "moderate";
    confidenceReason = "The document is short or was edited briefly, so a few events swing the result.";
  }
  if (textLength < 300 || editSeconds < 20 || (typedChars === 0 && pasteChars === 0)) {
    confidence = "low";
    confidenceReason = "Very little telemetry was captured, so the result is indicative only.";
  }

  const borderline = score >= 52 && score <= 68;
  let level: AuthorshipLevel;
  let label: string;
  let summary: string;

  if (confidence === "low" || borderline) {
    level = "unsure";
    label = "Unsure — evidence is weak";
    summary = borderline
      ? `The signals point both ways: ${typedCoverage}% of the text is explained by recorded typing while ${Math.max(pasteShare, unaccounted)}% is pasted or unaccounted. This is too close to call either way.`
      : `${confidenceReason} Treat the ${score}% score as indicative rather than conclusive.`;
  } else if (score >= 82) {
    level = "typed";
    label = "Consistent with original typing";
    summary = `Recorded keystrokes account for the finished text (${typedCoverage}% coverage) over ${minutes} min across ${sessions} session${sessions === 1 ? "" : "s"}.`;
  } else if (score >= 69) {
    level = "mostly-typed";
    label = "Mostly typed, some inserted text";
    summary = `Most of the text was typed live, but about ${Math.max(pasteShare, unaccounted)}% arrived by paste or without recorded keystrokes.`;
  } else if (score >= 35) {
    level = "mixed";
    label = "Mixed typing and pasted content";
    summary = `A substantial part of this document was not typed in the editor. Pasted or unaccounted text makes up roughly ${Math.max(pasteShare, unaccounted)}% of the final text.`;
  } else {
    level = "pasted";
    label = "Largely pasted or externally written";
    summary = `Recorded typing explains only ${typedCoverage}% of the final text. The bulk of this document appears to have been pasted in or written outside Focusly Docs, which is consistent with AI-generated or copied material.`;
  }

  return { ...inputs, score, level, label, summary, confidence, confidenceReason, evidence, flags };
}
