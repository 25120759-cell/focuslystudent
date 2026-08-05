import { createFileRoute } from "@tanstack/react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";

export const Route = createFileRoute("/__docs-probe")({
  component: Probe,
});

function Probe() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: {} }),
      Placeholder.configure({ placeholder: "probe" }),
      Underline,
      LinkExt.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Typography,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p>hello probe</p>",
  });
  return (
    <div data-probe-mounted={editor ? "yes" : "no"}>
      <EditorContent editor={editor} />
    </div>
  );
}
