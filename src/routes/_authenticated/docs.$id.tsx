import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ArrowLeft, Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, ShieldCheck, Link as LinkIcon, Loader2, Copy, Check } from "lucide-react";
import { getDoc, saveDoc, setShare, logEvent } from "@/lib/docs.functions";

export const Route = createFileRoute("/_authenticated/docs/$id")({
  component: DocEditor,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="font-display text-2xl">Doc not found</h1>
      <Link to="/docs" className="mt-4 inline-block text-primary underline">← Back</Link>
    </div>
  ),
});

interface Doc { id: string; title: string; content_html: string; word_count: number; paste_count: number; edit_seconds: number; share_token: string | null }

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
  const pasteCountRef = useRef(0);
  const keystrokesRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const editSecondsRef = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSavedHtml = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing… (autosaves)" }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      keystrokesRef.current += 1;
      scheduleSave(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: { class: "prose prose-base dark:prose-invert max-w-none focus:outline-none min-h-[60vh] py-4" },
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
          id,
          title: title || "Untitled",
          content_html: html,
          word_count: words,
          paste_count: pasteCountRef.current,
          edit_seconds: editSecondsRef.current,
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
    // periodic keystroke flush (every 30s, summarised)
    const flush = setInterval(() => {
      if (keystrokesRef.current > 0) {
        eventFn({ data: { doc_id: id, kind: "keystroke", chars: keystrokesRef.current } }).catch(() => {});
        keystrokesRef.current = 0;
      }
    }, 30000);
    return () => { clearInterval(flush); eventFn({ data: { doc_id: id, kind: "session_end", chars: 0 } }).catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editor]);

  async function toggleShare() {
    if (!doc) return;
    const enabled = !doc.share_token;
    const r: any = await shareFn({ data: { id, enabled } });
    setDoc(r.doc);
  }

  function shareUrl() {
    if (!doc?.share_token || typeof window === "undefined") return "";
    return `${window.location.origin}/docs/share/${doc.share_token}`;
  }

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

  const url = shareUrl();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/docs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All docs
        </Link>
        <div className="text-[10px] text-muted-foreground">{saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Idle"}</div>
      </div>

      <input
        value={title}
        onChange={(e) => { setTitle(e.target.value); scheduleSave(editor?.getHTML() ?? "", editor?.getText() ?? ""); }}
        className="w-full bg-transparent font-display text-3xl md:text-4xl font-semibold tracking-tight focus:outline-none"
        placeholder="Untitled"
      />

      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-1 rounded-full border border-border bg-background/80 backdrop-blur p-1.5">
        <TBtn active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></TBtn>
        <TBtn active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></TBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <TBtn active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-3.5 w-3.5" /></TBtn>
        <TBtn active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5" /></TBtn>
        <span className="mx-1 h-4 w-px bg-border" />
        <TBtn active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></TBtn>
        <TBtn active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></TBtn>
        <TBtn active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></TBtn>
        <span className="ml-auto" />
        <button onClick={toggleShare} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${doc.share_token ? "bg-primary/10 text-primary" : "border border-border"}`}>
          <ShieldCheck className="h-3.5 w-3.5" /> {doc.share_token ? "Sharing" : "Share + authorship"}
        </button>
      </div>

      {doc.share_token && url && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs flex items-center gap-2">
          <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <input readOnly value={url} className="flex-1 bg-transparent text-xs font-mono truncate" onClick={(e) => (e.target as HTMLInputElement).select()} />
          <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] text-primary-foreground">
            {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </motion.div>
  );
}

function TBtn({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-full p-1.5 ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
      {children}
    </button>
  );
}
