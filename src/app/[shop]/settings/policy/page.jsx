"use client";

import { Separator } from "@/components/ui/separator";
import { BlockquoteToolbar } from "@/components/toolbars/blockquote";
import { BoldToolbar } from "@/components/toolbars/bold";
import { BulletListToolbar } from "@/components/toolbars/bullet-list";
import { CodeToolbar } from "@/components/toolbars/code";
import { CodeBlockToolbar } from "@/components/toolbars/code-block";
import { HardBreakToolbar } from "@/components/toolbars/hard-break";
import { HorizontalRuleToolbar } from "@/components/toolbars/horizontal-rule";
import { ItalicToolbar } from "@/components/toolbars/italic";
import { OrderedListToolbar } from "@/components/toolbars/ordered-list";
import { RedoToolbar } from "@/components/toolbars/redo";
import { StrikeThroughToolbar } from "@/components/toolbars/strikethrough";
import { ToolbarProvider } from "@/components/toolbars/toolbar-provider";
import { UndoToolbar } from "@/components/toolbars/undo";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card, CardContent } from "@/components/ui/card";
import { FontSizeToolbar } from "@/components/toolbars/fontsize";

const extensions = [
  StarterKit.configure({
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal",
      },
    },
    bulletList: {
      HTMLAttributes: {
        class: "list-disc",
      },
    },
    code: {
      HTMLAttributes: {
        class: "bg-accent rounded-md p-1",
      },
    },
    horizontalRule: {
      HTMLAttributes: {
        class: "my-2",
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class: "bg-primary text-primary-foreground p-2 text-sm rounded-md p-1",
      },
    },
    heading: {
      levels: [1, 2, 3, 4],
      HTMLAttributes: {
        class: "tiptap-heading",
      },
    },
  }),
];

const content = `
<h2 class="tiptap-heading" style="text-align: center">Hello world 🌍</h2>
`;

function StarterKitExample() {
  const editor = useEditor({
    extensions: extensions,
    content,
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="w-full relative  overflow-hidden bg-muted/100 p-6 h-full">
      <Card className="shadow-sm py-0 rounded-lg overflow-hidden">
        <CardContent className="flex w-full items-center py-2 px-2 justify-between border-b sticky top-0 left-0 bg-background z-20">
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
        <CardContent
          onClick={() => {
            editor.chain().focus().run();
          }}
          className="cursor-text min-h-[10rem] bg-background focus:outline-none focus:ring-0 -mt-5 pl-2"
        >
          <EditorContent
            className="outline-none p-0 ring-0 focus:outline-none focus:ring-0 focus:border-transparent"
            editor={editor}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default StarterKitExample;
