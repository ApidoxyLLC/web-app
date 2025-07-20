"use client";

import React from "react";
import { useToolbar } from "@/components/toolbars/toolbar-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Text } from "lucide-react";

const FONT_SIZES = [12, 14, 16, 18, 24, 32];

const FontSizeToolbar = () => {
  const { editor } = useToolbar();

  const handleSetFontSize = (size) => {
    editor?.chain().focus().setFontSize(size).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Text className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {FONT_SIZES.map((size) => (
          <DropdownMenuItem key={size} onClick={() => handleSetFontSize(size)}>
            {size}px
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { FontSizeToolbar };
