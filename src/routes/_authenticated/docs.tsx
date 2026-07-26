import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Plus, Trash2, ShieldCheck, Loader2, Clock, Users } from "lucide-react";
import { listDocs, createDoc, deleteDoc } from "@/lib/docs.functions";
import { listSharedWithMe } from "@/lib/doc-collab.functions";
import { PageHeader } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_authenticated/docs")({
  component: DocsList,
  head: () => ({ meta: [{ title: "Focusly Docs — Focusly" }] }),
});

interface DocRow { id: string; title: string; word_count: number; paste_count: number; edit_seconds: number; share_token: string | null; updated_at: string; created_at: string }
interface SharedDoc { id: string; title: string; updated_at: string; role: string }

function DocsList() {
  const listFn = useServerFn(listDocs);
  const sharedFn = useServerFn(listSharedWithMe);
  const createFn = useServerFn(createDoc);
  const deleteFn = useServerFn(deleteDoc);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [shared, setShared] = useState<SharedDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const [r, s]: any = await Promise.all([listFn(), sharedFn()]);
      setDocs(r.docs); setShared(s.docs ?? []);
    } finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  async function makeNew() {
    setCreating(true);
    try {
      const r: any = await createFn({ data: { title: "Untitled doc" } });
      window.location.href = `/docs/${r.doc.id}`;
    } finally { setCreating(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this doc? This cannot be undone.")) return;
    await deleteFn({ data: { id } });
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 rise-in">
      <PageHeader
        eyebrow="Write & prove it"
        icon={FileText}
        title="Focusly"
        accent="Docs"
        description="A calm writing surface with built-in authorship verification, sharing, and live collaboration."
        actions={
          <motion.button whileTap={{ scale: 0.96 }} onClick={makeNew} disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New doc
          </motion.button>
        }
      />

      {!loaded ? (
        <div className="paper-raised p-16 text-center text-sm text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading…</div>
      ) : docs.length === 0 ? (
        <div className="paper-raised p-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No docs yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {docs.map((d, i) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                className="paper p-5 flex flex-col gap-2 group"
              >
                <Link to="/docs/$id" params={{ id: d.id }} className="flex-1">
                  <h3 className="font-display text-lg font-semibold truncate">{d.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{d.word_count} words</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.max(1, Math.round(d.edit_seconds / 60))} min</span>
                    {d.share_token && <span className="inline-flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" /> Shared</span>}
                  </div>
                </Link>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Updated {new Date(d.updated_at).toLocaleDateString()}</span>
                  <button onClick={() => remove(d.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {shared.length > 0 && (
        <div className="pt-6">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" /> Shared with me
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {shared.map((d) => (
              <Link key={d.id} to="/docs/$id" params={{ id: d.id }}
                className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold truncate">{d.title}</h3>
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] capitalize">{d.role}</span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">Updated {new Date(d.updated_at).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
