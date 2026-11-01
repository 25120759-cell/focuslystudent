import { RouteError, SkeletonGrid, EmptyState, ErrorState } from "@/components/app/States";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Plus, Trash2, ShieldCheck, Loader2, Clock, Users } from "lucide-react";
import { listDocs, createDoc, deleteDoc } from "@/lib/docs.functions";
import { listSharedWithMe } from "@/lib/doc-collab.functions";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/docs/")({
  errorComponent: RouteError,
  component: DocsList,
  head: () => ({ meta: [{ title: "Cogni Docs — Cogni" }] }),
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
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const filtered = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase())).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  async function load() {
    setLoadErr(null);
    try {
      const [r, s]: any = await Promise.all([listFn(), sharedFn()]);
      setDocs(r.docs); setShared(s.docs ?? []);
    } catch (e: any) {
      setLoadErr(e?.message ?? "Failed to load your docs");
    } finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  async function makeNew() {
    setCreating(true);
    try {
      const r: any = await createFn({ data: { title: "Untitled doc" } });
      await navigate({ to: "/docs/$id", params: { id: r.doc.id } });
    } finally { setCreating(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this doc? This cannot be undone.")) return;
    await deleteFn({ data: { id } });
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <div className="workspace space-y-8">
      <header className="workspace-overview">
        <div><p className="workspace-kicker mb-3">Your writing workspace</p><h1 className="workspace-heading">Cogni Docs.</h1><p className="mt-3 text-sm text-muted-foreground">{docs.length} documents · {shared.length} shared with you</p></div>
        <Button onClick={makeNew} disabled={creating}>{creating ? <Loader2 className="animate-spin" /> : <Plus />} New doc</Button>
      </header>
      <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="font-display text-xl">Your documents</h2><label className="flex gap-2 items-center border border-input bg-card rounded-md px-3 py-2"><Search className="h-4 w-4 text-muted-foreground" /><input aria-label="Search documents" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents" className="w-44 bg-transparent text-sm outline-none" /></label></div>
      {!loaded ? (
        <SkeletonGrid items={4} lines={2} />
      ) : loadErr ? (
        <ErrorState title="We couldn't load your docs" message={loadErr} onRetry={() => { setLoaded(false); load(); }} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No docs yet"
          description="Start a doc and Cogni tracks your writing so you can prove the work is yours."
          action={
            <Button onClick={makeNew} disabled={creating}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              <Plus className="h-4 w-4" /> New doc
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {filtered.map((d) => (
              <motion.article key={d.id} layout exit={{ opacity: 0 }} className="workspace-surface group overflow-hidden">
                <Link to="/docs/$id" params={{ id: d.id }} className="block p-6 pb-4">
                  <div className="flex justify-between items-start mb-8"><FileText className="h-9 w-9 text-primary" strokeWidth={1} /><ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></div>
                  <h3 className="font-display text-xl font-medium break-words">{d.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{d.word_count} words {d.share_token && "· Shared"}</p>
                </Link>
                <div className="mx-6 border-t border-border py-3 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span><Button variant="ghost" size="icon" onClick={() => remove(d.id)} aria-label={`Delete ${d.title}`} title="Delete document"><Trash2 className="h-4 w-4" /></Button></div>
              </motion.article>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6">No matching documents.</p>}
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
                className="workspace-surface p-5 transition hover:border-primary">
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
