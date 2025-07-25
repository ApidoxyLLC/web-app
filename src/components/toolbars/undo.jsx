"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToolbar } from "@/components/toolbars/toolbar-provider";
import { CornerUpLeft } from "lucide-react";
import React from "react";

const UndoToolbar = React.forwardRef((props, ref) => {
  const { className, onClick, children, ...rest } = props;
  const { editor } = useToolbar();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", className)}
          onClick={(e) => {
            editor?.chain().focus().undo().run();
            if (onClick) onClick(e);
          }}
          disabled={!editor?.can().chain().focus().undo().run()}
          ref={ref}
          {...rest}
        >
          {children || <CornerUpLeft className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>Undo</span>
      </TooltipContent>
    </Tooltip>
  );
});

UndoToolbar.displayName = "UndoToolbar";

export { UndoToolbar };
