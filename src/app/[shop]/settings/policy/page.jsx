"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { UndoToolbar,  } from "@/components/toolbars/undo";
import { RedoToolbar } from "@/components/toolbars/redo";
import { Separator } from "@/components/ui/separator";
import { BoldToolbar } from "@/components/toolbars/bold";
import { ItalicToolbar } from "@/components/toolbars/italic";
import { StrikeThroughToolbar } from "@/components/toolbars/strikethrough";
import { BulletListToolbar } from "@/components/toolbars/bullet-list";
import { OrderedListToolbar } from "@/components/toolbars/ordered-list";
import { CodeToolbar } from "@/components/toolbars/code";
import { CodeBlockToolbar } from "@/components/toolbars/code-block";
import { HorizontalRuleToolbar } from "@/components/toolbars/horizontal-rule";
import { BlockquoteToolbar } from "@/components/toolbars/blockquote";
import { HardBreakToolbar } from "@/components/toolbars/hard-break";
import { ToolbarProvider } from "@/components/toolbars/toolbar-provider";

export default function ShopUpdatePage() {
  const  params  = useParams();
  const slug = params.shop
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        orderedList: { HTMLAttributes: { class: "list-decimal" } },
        bulletList: { HTMLAttributes: { class: "list-disc" } },
        code: { HTMLAttributes: { class: "bg-accent rounded-md p-1" } },
        codeBlock: {
          HTMLAttributes: {
            class: "bg-primary text-primary-foreground p-2 text-sm rounded-md",
          },
        },
        horizontalRule: { HTMLAttributes: { class: "my-2" } },
        heading: {
          levels: [1, 2, 3, 4],
          HTMLAttributes: { class: "tiptap-heading" },
        },
      }),
    ],
    content: "<h2 class='tiptap-heading'>Hello world 🌍</h2>",
    immediatelyRender: false,

  });

  const handleSubmit = async () => {
    if (!editor) return;
    setLoading(true);
    setError("");

    try {
      const policies = editor.getHTML();
      const parser = new DOMParser();
    const doc = parser.parseFromString(policies, 'text/html');
    const plainText = doc.body.textContent || doc.body.innerText;
      console.log(plainText)
      const res = await fetch(`/api/v1/shops/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          policies:plainText, 
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      alert("Shop updated successfully!");
    } catch (err) {
      setError(err.message || "Error updating shop");
    } finally {
      setLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="w-full mx-auto p-6">
      <Card className="pt-0 pb-6">
        <CardContent className="sticky top-0 -muted/100 z-10 border-b flex items-center justify-between py-2">
          <ToolbarProvider editor={editor}>
            <div className="flex items-center gap-2">
              <UndoToolbar />
              <RedoToolbar />
              <Separator orientation="vertical" className="h-7" />
              <BoldToolbar />
              <ItalicToolbar />
              <StrikeThroughToolbar />
              <BulletListToolbar />
              <OrderedListToolbar />
              <CodeToolbar />
              <CodeBlockToolbar />
              <HorizontalRuleToolbar />
              <BlockquoteToolbar />
              <HardBreakToolbar />
            </div>
          </ToolbarProvider>
        </CardContent>

        <CardContent className=" min-h-[300px] cursor-text bg-background -mt-2">
          <EditorContent editor={editor} />
        </CardContent>

        <CardContent className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Shop"}
          </Button>
        </CardContent>

        {error && (
          <CardContent>
            <p className="text-red-500 text-sm">{error}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
