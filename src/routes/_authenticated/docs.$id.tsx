import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import {
  ArrowLeft, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, ShieldCheck, Link as LinkIcon, Loader2,
  Copy, Check, Code, Image as ImageIcon, TableIcon, CheckSquare,
  AlignLeft, AlignCenter, AlignRight, Users, MessageSquare, Sparkles, Wand2, GraduationCap, Trash2, X,
} from "lucide-react";
import { getDoc, saveDoc, setShare, logEvent } from "@/lib/docs.functions";
import {
  listShares, addShare, removeShare, listComments, addComment, resolveComment, deleteComment,
} from "@/lib/doc-collab.functions";
import { aiRewrite, aiGradeDoc, aiResearchAgent } from "@/lib/ai-max.functions";

export const Route = createFileRoute("/_authenticated/docs/$id")({
  component: DocEditor,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="font-display text-2xl">Doc not found</h1>
      <Link to="/docs" className="mt-4 inline-block text-primary underline">← Back</Link>
    </div>
  ),
});

interface Doc {
  id: string; title: string; content_html: string;
  word_count: number; paste_count: number; edit_seconds: number; share_token: string | null;
}

function DocEditor() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getDoc);
  const saveFn = useServerFn(saveDoc);
  const shareFn = useServerFn(setShare);
  const eventFn = useServerFn(logEvent);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<null | "share" | "comments" | "ai" | "grade">(null);

  const pasteCountRef = useRef(0);
  const keystrokesRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const editSecondsRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSavedHtml = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: {} }),
      Placeholder.configure({ placeholder: "Start writing… (autosaves)" }),
      Underline,
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Typography,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      keystrokesRef.current += 1;
      scheduleSave(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: { class: "prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[60vh] py-6" },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (text.length > 25) {
          pasteCountRef.current += 1;
          eventFn({ data: { doc_id: id, kind: "paste", chars: text.length } }).catch(() => {});
        }
        return false;
      },
    },
  });

  function scheduleSave(html: string, plain: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (html === lastSavedHtml.current) return;
      setSaving(true);
      const words = plain.trim().split(/\s+/).filter(Boolean).length;
      editSecondsRef.current = Math.max(editSecondsRef.current, Math.floor((Date.now() - sessionStartRef.current) / 1000));
      try {
        await saveFn({ data: {
          id, title: title || "Untitled", content_html: html,
          word_count: words, paste_count: pasteCountRef.current, edit_seconds: editSecondsRef.current,
        } });
        lastSavedHtml.current = html;
        setSavedAt(new Date());
      } catch (e) { console.error(e); }
      finally { setSaving(false); }
    }, 800);
  }

  useEffect(() => {
    (async () => {
      try {
        const r: any = await getFn({ data: { id } });
        if (!r.doc) { setLoaded(true); return; }
        setDoc(r.doc); setTitle(r.doc.title);
        pasteCountRef.current = r.doc.paste_count;
        editSecondsRef.current = r.doc.edit_seconds;
        sessionStartRef.current = Date.now();
        editor?.commands.setContent(r.doc.content_html || "");
        lastSavedHtml.current = r.doc.content_html || "";
        eventFn({ data: { doc_id: id, kind: "session_start", chars: 0 } }).catch(() => {});
      } catch (e) { console.error(e); }
      finally { setLoaded(true); }
    })();
    const flush = setInterval(() => {
      if (keystrokesRef.current > 0) {
        eventFn({ data: { doc_id: id, kind: "keystroke", chars: keystrokesRef.current } }).catch(() => {});
        keystrokesRef.current = 0;
      }
    }, 30000);
    return () => { clearInterval(flush); eventFn({ data: { doc_id: id, kind: "session_end", chars: 0 } }).catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editor]);

  async function togglePublicShare() {
    if (!doc) return;
    const enabled = !doc.share_token;
    const r: any = await shareFn({ data: { id, enabled } });
    setDoc(r.doc);
  }
  const publicUrl = doc?.share_token && typeof window !== "undefined" ? `${window.location.origin}/docs/share/${doc.share_token}` : "";

  if (!loaded) {
    return <div className="py-16 text-center text-sm text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading doc…</div>;
  }
  if (!doc) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl">Doc not found</h1>
        <Link to="/docs" className="mt-4 inline-block text-primary underline">← Back to docs</Link>
      </div>
    );
  }

  const wordCount = editor?.getText().trim().split(/\s+/).filter(Boolean).length ?? doc.word_count;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-3 pb-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/docs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All docs
        </Link>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Idle"}</span>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); scheduleSave(editor?.getHTML() ?? "", editor?.getText() ?? ""); }}
        className="w-full bg-transparent font-display text-3xl md:text-5xl font-semibold tracking-tight focus:outline-none"
        placeholder="Untitled"
      />

      {/* Toolbar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card/90 backdrop-blur p-2 shadow-sm">
        <TBtn active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="h-4 w-4" /></TBtn>
        <Sep />
        <TBtn active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()} title="Inline code"><Code className="h-4 w-4" /></TBtn>
        <Sep />
        <TBtn active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="Align left"><AlignLeft className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="Align center"><AlignCenter className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="Align right"><AlignRight className="h-4 w-4" /></TBtn>
        <Sep />
        <TBtn active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bulleted list"><List className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("taskList")} onClick={() => editor?.chain().focus().toggleTaskList().run()} title="Task list"><CheckSquare className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="h-4 w-4" /></TBtn>
        <TBtn active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} title="Code block"><Code className="h-4 w-4" /></TBtn>
        <Sep />
        <TBtn onClick={() => {
          const url = window.prompt("Link URL");
          if (!url) return;
          editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }} title="Insert link"><LinkIcon className="h-4 w-4" /></TBtn>
        <TBtn onClick={() => {
          const url = window.prompt("Image URL");
          if (!url) return;
          editor?.chain().focus().setImage({ src: url }).run();
        }} title="Insert image"><ImageIcon className="h-4 w-4" /></TBtn>
        <TBtn onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><TableIcon className="h-4 w-4" /></TBtn>

        <span className="ml-auto flex items-center gap-1 flex-wrap">
          <PBtn onClick={() => setPanel("ai")} label="AI"><Wand2 className="h-3.5 w-3.5" /></PBtn>
          <PBtn onClick={() => setPanel("grade")} label="Grade"><GraduationCap className="h-3.5 w-3.5" /></PBtn>
          <PBtn onClick={() => setPanel("comments")} label="Comments"><MessageSquare className="h-3.5 w-3.5" /></PBtn>
          <PBtn onClick={() => setPanel("share")} label="Share"><Users className="h-3.5 w-3.5" /></PBtn>
          <button onClick={togglePublicShare} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${doc.share_token ? "bg-primary/10 text-primary" : "border border-border hover:bg-accent"}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {doc.share_token ? "Authorship on" : "Authorship link"}
          </button>
        </span>
      </div>

      {doc.share_token && publicUrl && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center gap-2">
          <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <input readOnly value={publicUrl} className="flex-1 bg-transparent text-xs font-mono truncate" onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button onClick={() => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] text-primary-foreground">
            {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-sm">
        <EditorContent editor={editor} />
      </div>

      <AnimatePresence>
        {panel && (
          <SidePanel onClose={() => setPanel(null)} title={
            panel === "share" ? "Share this doc" :
            panel === "comments" ? "Comments" :
            panel === "ai" ? "AI writing tools" : "Rubric grader"
          }>
            {panel === "share" && <SharePanel docId={id} />}
            {panel === "comments" && <CommentsPanel docId={id} />}
            {panel === "ai" && <AIPanel editor={editor} />}
            {panel === "grade" && <GradePanel editor={editor} />}
          </SidePanel>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Sep() { return <span className="mx-0.5 h-5 w-px bg-border" />; }
function TBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string }) {
  return (
    <button onClick={onClick} title={title} className={`rounded-lg p-1.5 transition ${active ? "bg-primary/15 text-primary" : "text-foreground/70 hover:bg-accent"}`}>
      {children}
    </button>
  );
}
function PBtn({ children, onClick, label }: { children: React.ReactNode; onClick?: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
      {children} {label}
    </button>
  );
}

function SidePanel({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/20 z-40" />
      <motion.aside
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </motion.aside>
    </>
  );
}

function SharePanel({ docId }: { docId: string }) {
  const listFn = useServerFn(listShares);
  const addFn = useServerFn(addShare);
  const rmFn = useServerFn(removeShare);
  const [shares, setShares] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [busy, setBusy] = useState(false);

  async function reload() { const r: any = await listFn({ data: { doc_id: docId } }); setShares(r.shares); }
  useEffect(() => { reload(); }, []); // eslint-disable-line

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try { await addFn({ data: { doc_id: docId, email: email.trim(), role } }); setEmail(""); await reload(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    await rmFn({ data: { id } });
    setShares((s) => s.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground text-xs">Invite people by email to view, comment, or edit this doc. They'll see it under "Shared with me" when they sign in.</p>
      <div className="space-y-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.edu"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value as any)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="viewer">Viewer — read only</option>
            <option value="commenter">Commenter — read + comment</option>
            <option value="editor">Editor — full edit access</option>
          </select>
          <button onClick={invite} disabled={busy || !email}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Invite"}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {shares.length === 0 && <p className="text-xs text-muted-foreground italic">No people invited yet.</p>}
        {shares.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <div>
              <div className="text-xs font-medium">{s.shared_with_email}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{s.role}</div>
            </div>
            <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsPanel({ docId }: { docId: string }) {
  const listFn = useServerFn(listComments);
  const addFn = useServerFn(addComment);
  const resolveFn = useServerFn(resolveComment);
  const delFn = useServerFn(deleteComment);
  const [items, setItems] = useState<any[]>([]);
  const [body, setBody] = useState("");
  async function reload() { const r: any = await listFn({ data: { doc_id: docId } }); setItems(r.comments); }
  useEffect(() => { reload(); }, []); // eslint-disable-line

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment…" rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={async () => { if (!body.trim()) return; await addFn({ data: { doc_id: docId, body } }); setBody(""); reload(); }}
          className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">Add comment</button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground italic">No comments yet.</p>}
        {items.map((c) => (
          <div key={c.id} className={`rounded-xl border border-border p-3 ${c.resolved ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{c.author_name} · {new Date(c.created_at).toLocaleString()}</span>
              <div className="flex gap-1">
                <button onClick={async () => { await resolveFn({ data: { id: c.id, resolved: !c.resolved } }); reload(); }}
                  className="rounded-full px-2 py-0.5 hover:bg-accent">{c.resolved ? "Unresolve" : "Resolve"}</button>
                <button onClick={async () => { await delFn({ data: { id: c.id } }); reload(); }}
                  className="rounded-full px-2 py-0.5 hover:bg-accent text-destructive">Delete</button>
              </div>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIPanel({ editor }: { editor: any }) {
  const rewriteFn = useServerFn(aiRewrite);
  const researchFn = useServerFn(aiResearchAgent);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  async function runRewrite(action: "improve" | "shorten" | "expand" | "formal" | "casual" | "fix_grammar") {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const selection = empty ? editor.getText() : editor.state.doc.textBetween(from, to, "\n");
    if (!selection.trim()) { setMsg("Select some text first (or leave nothing selected to rewrite the whole doc)."); return; }
    setBusy(action); setMsg(null);
    try {
      const r: any = await rewriteFn({ data: { text: selection.slice(0, 8000), action } });
      if (empty) {
        editor.chain().focus().setContent(r.text).run();
      } else {
        editor.chain().focus().insertContentAt({ from, to }, r.text).run();
      }
    } catch (e: any) { setMsg(e.message); } finally { setBusy(null); }
  }

  async function runResearch() {
    if (!topic.trim() || !editor) return;
    setBusy("research"); setMsg(null);
    try {
      const r: any = await researchFn({ data: { topic, depth: "standard" } });
      editor.chain().focus().insertContent(r.html).run();
      setMsg(`Inserted ${r.sections} sections of research.`);
    } catch (e: any) { setMsg(e.message); } finally { setBusy(null); }
  }

  const actions = [
    { key: "improve", label: "Improve writing" },
    { key: "fix_grammar", label: "Fix grammar" },
    { key: "shorten", label: "Make shorter" },
    { key: "expand", label: "Expand" },
    { key: "formal", label: "More formal" },
    { key: "casual", label: "More casual" },
  ] as const;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-medium mb-2 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-primary" /> Rewrite selection</h4>
        <p className="text-xs text-muted-foreground mb-2">Select text in the doc, then pick an action.</p>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button key={a.key} onClick={() => runRewrite(a.key as any)} disabled={!!busy}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 text-left">
              {busy === a.key ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}{a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="font-medium mb-2 flex items-center gap-1"><Wand2 className="h-3.5 w-3.5 text-primary" /> Research agent <span className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5 ml-auto">MAX</span></h4>
        <p className="text-xs text-muted-foreground mb-2">Multi-step research on any topic; results inserted at cursor.</p>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Causes of the French Revolution"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mb-2" />
        <button onClick={runResearch} disabled={!!busy || !topic.trim()}
          className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          {busy === "research" ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : null}Run research
        </button>
      </div>
      {msg && <div className="rounded-xl bg-muted p-2 text-xs">{msg}</div>}
    </div>
  );
}

function GradePanel({ editor }: { editor: any }) {
  const gradeFn = useServerFn(aiGradeDoc);
  const [rubric, setRubric] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!editor) return;
    const text = editor.getText();
    if (text.length < 20) { setErr("Doc is too short to grade."); return; }
    if (rubric.trim().length < 10) { setErr("Add a rubric first."); return; }
    setBusy(true); setErr(null); setResult(null);
    try {
      const r: any = await gradeFn({ data: { doc_text: text.slice(0, 30000), rubric } });
      setResult(r);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs rounded-xl bg-primary/5 border border-primary/20 p-2 text-primary">
        MAX plan feature. Paste the rubric your teacher gave you (or write one) and get graded feedback.
      </div>
      <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={5}
        placeholder="Paste rubric here — e.g.&#10;- Thesis clarity (20 pts)&#10;- Evidence (30 pts)&#10;- Analysis (30 pts)&#10;- Style & mechanics (20 pts)"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono" />
      <button onClick={run} disabled={busy} className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
        {busy ? <><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Grading…</> : "Grade my doc"}
      </button>
      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">{err}</div>}
      {result && (
        <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Overall</div>
              <div className="font-display text-3xl font-semibold">{result.overall_score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
            {result.letter && <div className="rounded-full bg-primary/10 text-primary px-4 py-2 font-display text-2xl font-bold">{result.letter}</div>}
          </div>
          {result.criteria?.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground">Breakdown</div>
              {result.criteria.map((c: any, i: number) => (
                <div key={i} className="rounded-xl border border-border p-2">
                  <div className="flex justify-between text-xs font-medium"><span>{c.name}</span><span>{c.score}/{c.max}</span></div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.feedback}</p>
                </div>
              ))}
            </div>
          )}
          {result.strengths?.length > 0 && (
            <div><div className="text-[10px] uppercase text-muted-foreground">Strengths</div><ul className="text-xs list-disc pl-4 mt-1 space-y-0.5">{result.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {result.improvements?.length > 0 && (
            <div><div className="text-[10px] uppercase text-muted-foreground">Improvements</div><ul className="text-xs list-disc pl-4 mt-1 space-y-0.5">{result.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul></div>
          )}
          {result.revision_notes && (
            <div><div className="text-[10px] uppercase text-muted-foreground">Revision notes</div><p className="text-xs mt-1 whitespace-pre-wrap">{result.revision_notes}</p></div>
          )}
        </div>
      )}
    </div>
  );
}
