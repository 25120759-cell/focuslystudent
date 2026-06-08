import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Clock, User, AlertTriangle, FileText, Sparkles } from "lucide-react";
import { getSharedDoc } from "@/lib/docs.functions";
import { PublicHeader } from "@/components/PublicHeader";

export const Route = createFileRoute("/docs/share/$token")({
  ssr: false,
  component: SharedDoc,
  head: () => ({ meta: [{ title: "Authorship report — Focusly Docs" }] }),
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

  const totalKeystrokes = events.filter((e) => e.kind === "keystroke").reduce((a, b) => a + b.chars, 0);
  const totalPasteChars = events.filter((e) => e.kind === "paste").reduce((a, b) => a + b.chars, 0);
  const pasteRatio = doc.word_count > 0 ? Math.min(100, Math.round((totalPasteChars / Math.max(1, doc.word_count * 6)) * 100)) : 0;
  const sessions = events.filter((e) => e.kind === "session_start").length;
  const minutes = Math.max(1, Math.round(doc.edit_seconds / 60));
  const verdict =
    pasteRatio > 60 ? { label: "Heavy paste activity", color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle } :
    doc.paste_count > 10 ? { label: "Some pasted content", color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle } :
    { label: "Authored by hand", color: "text-emerald-600 dark:text-emerald-400", icon: ShieldCheck };
  const Icon = verdict.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ${verdict.color}`}><Icon className="h-6 w-6" /></div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Focusly Authorship Report</p>
              <h2 className={`font-display text-xl font-semibold ${verdict.color}`}>{verdict.label}</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <Stat label="Author" value={author ?? "Unknown"} icon={User} />
            <Stat label="Word count" value={String(doc.word_count)} icon={FileText} />
            <Stat label="Total edit time" value={`${minutes} min`} icon={Clock} />
            <Stat label="Edit sessions" value={String(sessions || 1)} icon={Clock} />
            <Stat label="Paste events" value={String(doc.paste_count)} icon={AlertTriangle} />
            <Stat label="Recorded keystrokes" value={totalKeystrokes.toLocaleString()} icon={FileText} />
          </div>
          <p className="mt-6 text-[11px] text-muted-foreground">
            This report is generated from edit telemetry captured by Focusly Docs while the author was writing. It does NOT prove the author wrote every word from scratch — only that the captured edit pattern is consistent with original authorship. Heavy paste activity may indicate AI or external sources were used.
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
