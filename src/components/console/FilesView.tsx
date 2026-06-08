import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, FileText, Save, Loader2 } from "lucide-react";
import { createFile, deleteFile, listFiles, updateFile } from "@/lib/files.functions";

interface FileRow { id: string; name: string; content: string; updated_at: string }

export function FilesView() {
  const listFn = useServerFn(listFiles);
  const createFn = useServerFn(createFile);
  const updateFn = useServerFn(updateFile);
  const deleteFn = useServerFn(deleteFile);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [active, setActive] = useState<FileRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    try { const r: any = await listFn(); setFiles(r.files); }
    finally { setLoaded(true); }
  }
  useEffect(() => { load(); }, []);

  async function makeNew() {
    const r: any = await createFn({ data: { name: `Untitled ${files.length + 1}`, content: "" } });
    setFiles((f) => [r.file, ...f]);
    setActive(r.file);
    setDirty(false);
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      const r: any = await updateFn({ data: { id: active.id, patch: { name: active.name, content: active.content } } });
      setFiles((f) => f.map((x) => x.id === r.file.id ? r.file : x));
      setActive(r.file);
      setDirty(false);
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this file?")) return;
    await deleteFn({ data: { id } });
    setFiles((f) => f.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  }

  if (!loaded) return <div className="rounded-3xl glass p-16 text-center text-sm text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading files…</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[260px,1fr]">
      <div className="rounded-3xl glass p-4 space-y-2">
        <button onClick={makeNew} className="w-full inline-flex items-center justify-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <Plus className="h-3 w-3" /> New file
        </button>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {files.map((f) => (
              <motion.button
                key={f.id}
                layout
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onClick={() => { setActive(f); setDirty(false); }}
                className={`group w-full rounded-xl px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${active?.id === f.id ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="flex-1 truncate">{f.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); remove(f.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); remove(f.id); } }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive cursor-pointer"
                  aria-label="Delete file"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
          {files.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">No files yet.</p>}
        </div>
      </div>

      <div className="rounded-3xl glass p-4">
        {active ? (
          <div className="flex h-[450px] flex-col">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={active.name}
                onChange={(e) => { setActive({ ...active, name: e.target.value }); setDirty(true); }}
                className="flex-1 rounded-full border border-input bg-background px-4 py-1.5 text-sm font-medium"
              />
              <button onClick={save} disabled={!dirty || saving} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
            </div>
            <textarea
              value={active.content}
              onChange={(e) => { setActive({ ...active, content: e.target.value }); setDirty(true); }}
              placeholder="Start typing notes..."
              className="flex-1 rounded-2xl border border-input bg-background p-4 text-sm font-mono leading-relaxed resize-none"
            />
            <div className="mt-2 text-[10px] text-muted-foreground text-right">{active.content.length} chars · last saved {new Date(active.updated_at).toLocaleString()}</div>
          </div>
        ) : (
          <div className="flex h-[450px] items-center justify-center text-center text-sm text-muted-foreground">
            <div>
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Select or create a file to get started.
              <p className="mt-2 text-xs">For long-form writing with formatting, try <strong>Focusly Docs</strong>.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
