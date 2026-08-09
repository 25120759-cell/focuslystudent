export interface AuthorshipEvent {
  kind: "keystroke" | "paste" | "session_start" | "session_end";
  chars: number;
  created_at: string;
}

export type AuthorshipLevel = "typed" | "mostly-typed" | "mixed" | "pasted" | "insufficient";

export interface AuthorshipSignals {
  textLength: number;
  typedChars: number;
  pasteChars: number;
  pasteEvents: number;
  largestPaste: number;
  sessions: number;
  minutes: number;
  typedCoverage: number; // % of final text accounted for by recorded typing
  pasteShare: number; // % of recorded input that was pasted
  unaccounted: number; // % of final text with no recorded origin
  charsPerMinute: number;
  burstScore: number; // % of text arriving in single large pastes
  score: number; // 0-100, higher = more likely human-typed
  level: AuthorshipLevel;
  label: string;
  summary: string;
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
  const sessions = Math.max(1, events.filter((e) => e.kind === "session_start").length);
  const minutes = Math.max(0, Math.round((doc.edit_seconds || 0) / 60));

  const recorded = typedChars + pasteChars;
  const typedCoverage = textLength > 0 ? pct((typedChars / textLength) * 100) : 0;
  const pasteShare = recorded > 0 ? pct((pasteChars / recorded) * 100) : 0;
  const unaccounted = textLength > 0 ? pct(((textLength - recorded) / textLength) * 100) : 0;
  const charsPerMinute = doc.edit_seconds > 0 ? Math.round(typedChars / Math.max(1, doc.edit_seconds / 60)) : 0;
  const burstScore = textLength > 0 ? pct((largestPaste / textLength) * 100) : 0;

  const flags: string[] = [];

  // Not enough signal to judge at all.
  if (textLength < 120 || (recorded === 0 && textLength > 0)) {
    return {
      textLength, typedChars, pasteChars, pasteEvents, largestPaste, sessions, minutes,
      typedCoverage, pasteShare, unaccounted, charsPerMinute, burstScore,
      score: 0,
      level: "insufficient",
      label: "Not enough evidence",
      summary:
        textLength < 120
          ? "This document is too short for a meaningful authorship analysis."
          : "No editing activity was recorded for this document, so its origin cannot be verified. The text may have been added outside Focusly Docs.",
      flags: recorded === 0 && textLength >= 120 ? ["No typing or paste activity recorded"] : [],
    };
  }

  // Start from typing coverage, then subtract for each suspicious signal.
  let score = Math.min(100, typedCoverage);

  if (unaccounted > 15) {
    score -= Math.min(45, unaccounted * 0.6);
    flags.push(`${unaccounted}% of the text has no recorded typing or paste origin`);
  }
  if (pasteShare > 10) {
    score -= Math.min(50, pasteShare * 0.6);
    flags.push(`${pasteShare}% of recorded input arrived by paste`);
  }
  if (burstScore >= 20) {
    score -= Math.min(30, burstScore * 0.5);
    flags.push(`A single paste supplied ${burstScore}% of the document (${largestPaste.toLocaleString()} characters)`);
  }
  if (charsPerMinute > 900) {
    score -= 20;
    flags.push(`Unusually fast input: ~${charsPerMinute.toLocaleString()} characters per minute`);
  }
  if (minutes <= 1 && textLength > 1500) {
    score -= 20;
    flags.push("A long document appeared in under a minute of editing time");
  }
  if (sessions === 1 && textLength > 4000) {
    score -= 5;
    flags.push("Written entirely in a single editing session");
  }
  if (pasteEvents > 0 && flags.length === 0) {
    flags.push(`${pasteEvents} small paste${pasteEvents === 1 ? "" : "s"} detected (quotes or citations)`);
  }

  score = pct(score);

  let level: AuthorshipLevel;
  let label: string;
  let summary: string;
  if (score >= 85) {
    level = "typed";
    label = "Consistent with original typing";
    summary = `Nearly all of this document (${typedCoverage}%) matches keystroke-by-keystroke typing recorded over ${minutes} min across ${sessions} session${sessions === 1 ? "" : "s"}.`;
  } else if (score >= 65) {
    level = "mostly-typed";
    label = "Mostly typed, some inserted text";
    summary = `Most of the text was typed live, but ${Math.max(pasteShare, unaccounted)}% arrived by paste or without recorded keystrokes.`;
  } else if (score >= 40) {
    level = "mixed";
    label = "Mixed typing and pasted content";
    summary = `A substantial part of this document was not typed in the editor. Pasted or unaccounted text makes up roughly ${Math.max(pasteShare, unaccounted)}% of what was recorded.`;
  } else {
    level = "pasted";
    label = "Largely pasted or externally written";
    summary = `Recorded typing accounts for only ${typedCoverage}% of the final text. The bulk of this document appears to have been pasted in or written outside Focusly Docs, which is consistent with AI-generated or copied material.`;
  }

  return {
    textLength, typedChars, pasteChars, pasteEvents, largestPaste, sessions, minutes,
    typedCoverage, pasteShare, unaccounted, charsPerMinute, burstScore,
    score, level, label, summary, flags,
  };
}
