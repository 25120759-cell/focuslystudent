import type { AuthorshipSignals } from "./authorship";

export async function exportAuthorshipPdf(opts: {
  title: string;
  author: string;
  url: string;
  updatedAt: string;
  wordCount: number;
  signals: AuthorshipSignals;
  reviewerUnsure?: boolean;
  reviewerNote?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const a = opts.signals;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const nextPage = (needed = 40) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (s: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [30, 30, 30]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(s, W - M * 2) as string[];
    nextPage(lines.length * (size + 3));
    doc.text(lines, M, y);
    y += lines.length * (size + 3);
  };

  text("Focusly Authorship Report", 20, "bold");
  y += 4;
  text(opts.title || "Untitled document", 13, "bold", [90, 90, 90]);
  text(`Author: ${opts.author}   ·   Last edited: ${new Date(opts.updatedAt).toLocaleString()}`, 9, "normal", [120, 120, 120]);
  text(`Report generated ${new Date().toLocaleString()}   ·   ${opts.url}`, 9, "normal", [120, 120, 120]);
  y += 10;

  // Verdict box
  const verdict = opts.reviewerUnsure ? "Marked unsure by reviewer" : a.label;
  doc.setDrawColor(220, 216, 208);
  doc.setFillColor(249, 247, 243);
  nextPage(78);
  doc.roundedRect(M, y, W - M * 2, 68, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text(verdict, M + 14, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Original-typing score: ${a.score}%   ·   Telemetry confidence: ${a.confidence.toUpperCase()}`,
    M + 14,
    y + 44,
  );
  // score bar
  const barW = W - M * 2 - 28;
  doc.setFillColor(226, 222, 214);
  doc.roundedRect(M + 14, y + 52, barW, 6, 3, 3, "F");
  const fill = a.level === "typed" || a.level === "mostly-typed" ? [34, 150, 94] : a.level === "unsure" || a.level === "mixed" ? [200, 145, 30] : [190, 60, 55];
  doc.setFillColor(fill[0], fill[1], fill[2]);
  doc.roundedRect(M + 14, y + 52, Math.max(4, (barW * a.score) / 100), 6, 3, 3, "F");
  y += 82;

  text(a.summary, 10, "normal", [70, 70, 70]);
  y += 6;
  text(`Confidence note: ${a.confidenceReason}`, 9, "normal", [120, 120, 120]);
  if (opts.reviewerNote) {
    y += 4;
    text(`Reviewer note: ${opts.reviewerNote}`, 9, "normal", [120, 120, 120]);
  }
  y += 12;

  text("Scoring inputs", 13, "bold");
  y += 4;
  const rows: [string, string][] = [
    ["Typed coverage", `${a.typedCoverage}%`],
    ["Paste share", `${a.pasteShare}%`],
    ["Unaccounted text", `${a.unaccounted}%`],
    ["Paste events", String(a.pasteEvents)],
    ["Large pastes (200+ chars)", String(a.burstPastes)],
    ["Largest single paste", `${a.largestPaste.toLocaleString()} chars (${a.burstScore}%)`],
    ["Recorded keystrokes", a.typedChars.toLocaleString()],
    ["Pasted characters", a.pasteChars.toLocaleString()],
    ["Final length", `${a.textLength.toLocaleString()} chars / ${opts.wordCount.toLocaleString()} words`],
    ["Typing speed", `${a.charsPerMinute.toLocaleString()} chars/min`],
    ["Edit time", `${a.minutes} min across ${a.sessions} session(s)`],
    ["Activity window", a.firstEventAt ? `${new Date(a.firstEventAt).toLocaleString()} → ${a.lastEventAt ? new Date(a.lastEventAt).toLocaleString() : "—"} (${a.spanMinutes} min)` : "No events recorded"],
  ];
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    nextPage(18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const vLines = doc.splitTextToSize(v, W - M * 2 - 200) as string[];
    doc.text(vLines, M + 200, y);
    y += Math.max(14, vLines.length * 13);
  }
  y += 14;

  text("Evidence breakdown", 13, "bold");
  y += 2;
  for (const e of a.evidence) {
    nextPage(46);
    const sign = e.impact > 0 ? `+${e.impact}` : String(e.impact);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`${e.label} — ${e.value}`, M, y);
    doc.setTextColor(...(e.direction === "negative" ? ([190, 60, 55] as [number, number, number]) : e.direction === "positive" ? ([34, 150, 94] as [number, number, number]) : ([120, 120, 120] as [number, number, number])));
    doc.text(`${sign} pts`, W - M, y, { align: "right" });
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    const lines = doc.splitTextToSize(e.detail, W - M * 2) as string[];
    doc.text(lines, M, y);
    y += lines.length * 12 + 8;
  }

  y += 8;
  text(
    "This report is generated from edit telemetry captured by Focusly Docs while the author was writing. A high score means recorded keystrokes account for the finished text; it cannot prove the wording was not dictated or copied by hand. Where confidence is low or the reviewer has marked the report unsure, the result should be treated as indicative only.",
    8,
    "normal",
    [140, 140, 140],
  );

  const safe = (opts.title || "document").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50);
  doc.save(`authorship-report-${safe}.pdf`);
}
