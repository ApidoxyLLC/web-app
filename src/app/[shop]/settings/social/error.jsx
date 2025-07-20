"use client";

import { Button } from "@/components/ui/button";
import { HeadsetIcon, Redo2 } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }) {
  const reLoadPage = () => {
    return location.reload();
  };

  return (
    <div className="flex-1 flex justify-center items-center">
      <div className="flex flex-col gap-4 items-center">
        <h2>Something went wrong</h2>
        <div className="flex flex-row gap-4">
          <Button variant="outline" asChild>
            <Link href="../support">
              <HeadsetIcon /> Support
            </Link>
          </Button>
          <Button variant="secondary" onClick={() => reLoadPage()}>
            <Redo2 /> Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
