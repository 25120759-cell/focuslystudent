import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Clock, User, AlertTriangle, FileText, Sparkles, HelpCircle, Download } from "lucide-react";
import { getSharedDoc } from "@/lib/docs.functions";
import { analyseAuthorship } from "@/lib/authorship";
import { exportAuthorshipPdf } from "@/lib/authorship-pdf";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PublicHeader } from "@/components/PublicHeader";


export const Route = createFileRoute("/docs/share/$token")({
  ssr: false,
  component: SharedDoc,
  head: ({ params }) => ({
    meta: [
      { title: "Authorship report — Focusly Docs" },
      { name: "description", content: "A verified Focusly Docs authorship report showing writing time, edits, and paste activity for this document." },
      { property: "og:title", content: "Authorship report — Focusly Docs" },
      { property: "og:description", content: "Verified proof of how this document was written: writing time, edit history, and paste activity." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://focuslystudent.lovable.app/docs/share/${params.token}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Authorship report — Focusly Docs" },
      { name: "twitter:description", content: "Verified proof of how this document was written." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://focuslystudent.lovable.app/docs/share/${params.token}` }],
  }),
});

interface DocData { id: string; title: string; content_html: string; word_count: number; paste_count: number; edit_seconds: number; created_at: string; updated_at: string }
interface DocEvent { kind: "keystroke" | "paste" | "session_start" | "session_end"; chars: number; created_at: string }

function SharedDoc() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getSharedDoc);
  const [doc, setDoc] = useState<DocData | null>(null);
  const [events, setEvents] = useState<DocEvent[]>([]);
  const [author, setAuthor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getFn({ data: { token } }).then((r: any) => {
      setDoc(r.doc); setEvents(r.events ?? []); setAuthor(r.author);
    }).catch(console.error).finally(() => setLoaded(true));
  }, [token]);

  if (!loaded) return (
    <div className="min-h-screen bg-background"><PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
    </div>
  );
  if (!doc) return (
    <div className="min-h-screen bg-background"><PublicHeader />
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Shared link not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The author may have turned sharing off.</p>
      </div>
    </div>
  );

  const a = analyseAuthorship(doc, events as any);
  const effectiveLevel = unsure ? "unsure" : a.level;
  const style =
    effectiveLevel === "typed" ? { color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", icon: ShieldCheck } :
    effectiveLevel === "mostly-typed" ? { color: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", icon: ShieldCheck } :
    effectiveLevel === "mixed" ? { color: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", icon: AlertTriangle } :
    effectiveLevel === "pasted" ? { color: "text-red-600 dark:text-red-400", bar: "bg-red-500", icon: AlertTriangle } :
    { color: "text-muted-foreground", bar: "bg-muted-foreground", icon: HelpCircle };
  const Icon = style.icon;
  const confStyle =
    a.confidence === "high" ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" :
    a.confidence === "moderate" ? "border-amber-500/40 text-amber-600 dark:text-amber-400" :
    "border-border text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ${style.color}`}><Icon className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Focusly Authorship Report</p>
              <h2 className={`font-display text-xl font-semibold ${style.color}`}>{unsure ? "Unsure — marked for review" : a.label}</h2>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={onExport} disabled={exporting}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> {exporting ? "Preparing…" : "Export PDF"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${confStyle}`}>
              Telemetry confidence: {a.confidence}
            </span>
            <button
              onClick={() => setUnsure((v) => !v)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${unsure ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {unsure ? "Unsure label on — click to clear" : "Mark this report as unsure"}
            </button>
          </div>

          {a.level !== "insufficient" && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Original-typing score</span>
                <span className={`font-semibold ${style.color}`}>{a.score}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${a.score}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${style.bar}`}
                />
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">{unsure ? "A reviewer has marked this report as unsure, so the automatic label below should be read as indicative only." : a.summary}</p>
          <p className="mt-2 text-xs text-muted-foreground">{a.confidenceReason}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <Stat label="Author" value={author ?? "Unknown"} icon={User} />
            <Stat label="Word count" value={String(doc.word_count)} icon={FileText} />
            <Stat label="Total edit time" value={`${a.minutes} min`} icon={Clock} />
            <Stat label="Edit sessions" value={String(a.sessions)} icon={Clock} />
            <Stat label="Typed coverage" value={`${a.typedCoverage}%`} icon={FileText} />
            <Stat label="Pasted share" value={`${a.pasteShare}%`} icon={AlertTriangle} />
            <Stat label="Unaccounted text" value={`${a.unaccounted}%`} icon={HelpCircle} />
            <Stat label="Paste events" value={String(a.pasteEvents)} icon={AlertTriangle} />
            <Stat label="Large pastes (200+)" value={String(a.burstPastes)} icon={AlertTriangle} />
            <Stat label="Largest paste" value={`${a.largestPaste.toLocaleString()} chars`} icon={AlertTriangle} />
            <Stat label="Recorded keystrokes" value={a.typedChars.toLocaleString()} icon={FileText} />
            <Stat label="Typing speed" value={`${a.charsPerMinute.toLocaleString()}/min`} icon={Clock} />
          </div>

          {a.firstEventAt && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Activity window: {new Date(a.firstEventAt).toLocaleString()} → {a.lastEventAt ? new Date(a.lastEventAt).toLocaleString() : "—"} ({a.spanMinutes} min span)
            </p>
          )}

          <div className="mt-5 rounded-2xl border border-border bg-background p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence breakdown</div>
            <div className="mt-3 space-y-3">
              {a.evidence.map((e) => (
                <div key={e.id} className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">{e.label}</span>
                      <span className="text-xs text-muted-foreground">{e.value}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{e.detail}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${e.direction === "negative" ? "text-red-600 dark:text-red-400" : e.direction === "positive" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {e.impact > 0 ? `+${e.impact}` : e.impact} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {a.flags.length > 0 && (
            <div className="mt-5 rounded-2xl border border-border bg-background p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observations</div>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {a.flags.map((f: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className={style.color}>•</span><span>{f}</span></li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-[11px] text-muted-foreground">
            This report is generated from edit telemetry captured by Focusly Docs while the author was writing. A high score means the recorded keystrokes account for the finished text; it cannot prove the wording was not dictated or copied by hand. Where telemetry confidence is low, or a reviewer has marked the report unsure, treat the result as indicative rather than conclusive.
          </p>
        </div>



        <article className="mt-8 rounded-3xl border border-border bg-card p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{doc.title}</h1>
          <div className="text-[11px] text-muted-foreground mt-1">Last edited {new Date(doc.updated_at).toLocaleString()}</div>
          <div
            className="prose prose-base dark:prose-invert max-w-none mt-6"
            dangerouslySetInnerHTML={{ __html: doc.content_html || "<em>(empty)</em>" }}
          />
        </article>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Created with <Link to="/landing" className="underline">Focusly Docs</Link>
        </p>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-1 font-display text-lg font-semibold">{value}</div>
    </div>
  );
}
