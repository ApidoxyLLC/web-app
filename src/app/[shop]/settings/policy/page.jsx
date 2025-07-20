"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { UndoToolbar, RedoToolbar,
  BoldToolbar,
  ItalicToolbar,
  StrikeThroughToolbar,
  BulletListToolbar,
  OrderedListToolbar,
  CodeToolbar,
  CodeBlockToolbar,
  HorizontalRuleToolbar,
  BlockquoteToolbar,
  HardBreakToolbar,
  ToolbarProvider, } from "@/components/toolbars/undo";

export default function ShopUpdatePage() {
  const { slug } = useParams();
  const router = useRouter();
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
    immediatelyRender: false, // ✅ This solves the SSR hydration issue

  });

  const handleSubmit = async () => {
    if (!editor) return;
    setLoading(true);
    setError("");

    try {
      const content = editor.getHTML();
      const res = await fetch(`/api/shops/${slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content, // assuming `patchShopSchema` accepts content
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      alert("Shop updated successfully!");
      router.push("/dashboard"); // or any redirect
    } catch (err) {
      setError(err.message || "Error updating shop");
    } finally {
      setLoading(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-4">
      <Card>
        <CardContent className="sticky top-0 bg-white z-10 border-b flex items-center justify-between py-2">
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

        <CardContent className="mt-4 min-h-[300px] cursor-text bg-background">
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
