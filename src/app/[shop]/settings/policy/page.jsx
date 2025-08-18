"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UndoToolbar } from "@/components/toolbars/undo";
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
import { LoaderIcon } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { toast } from "sonner";

export default function ShopUpdatePage() {
  const params = useParams();
  const slug = params.shop;
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState("");
  
  const { data, loading } = useFetch(`/${slug}`);
  const policy = data?.policy;

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
    content: "",
    immediatelyRender: false,
  });

  // Load policy into editor after fetch
  useEffect(() => {
    if (editor && policy) {
      editor.commands.setContent(`<h2 class='tiptap-heading'>${policy}</h2>`);
    }
  }, [editor, policy]);

  const handleSubmit = async () => {
    if (!editor) return;
    setLoadingState(true);
    setError("");

    try {
      const policies = editor.getHTML();
      const res = await fetch(`/api/v1/settings/policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policies, // keep HTML
          shop: slug,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Something went wrong");

      toast.success("Shop updated successfully!");
    } catch (err) {
      setError(err.message || "Error updating shop");
    } finally {
      setLoadingState(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="w-full mx-auto p-6">
      <Card className="pt-0 pb-6">
        <CardContent className="sticky top-0 z-10 border-b flex items-center justify-between py-2">
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

        <CardContent className="min-h-[300px] cursor-text bg-background -mt-2">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoaderIcon className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </CardContent>

        <CardContent className="mt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={loadingState}>
            {loadingState ? "Updating..." : "Update Shop"}
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
