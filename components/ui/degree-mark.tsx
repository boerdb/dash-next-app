import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Graadteken in hero-typografie (superscript °C) of inline (° na het cijfer). */
export function DegreeMark({
  children = "°",
  className,
  mode = "inline",
}: {
  children?: ReactNode;
  className?: string;
  mode?: "inline" | "sup";
}) {
  if (mode === "sup") {
    return (
      <sup className={cn("ml-1 text-2xl font-normal leading-none", className)}>
        {children}
      </sup>
    );
  }

  return <span className={className}>{children}</span>;
}
