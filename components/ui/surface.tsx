import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("rounded-[var(--radius-lg)] border transition-colors duration-300", {
  variants: {
    level: {
      flat: "border-border-subtle bg-surface",
      raised: "border-border bg-surface-raised shadow-[var(--elevation-shadow)]",
      inset: "border-border-subtle bg-surface-subtle",
    },
  },
  defaultVariants: {
    level: "raised",
  },
});

export function Surface({
  className,
  level,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof surfaceVariants>) {
  return (
    <div className={cn(surfaceVariants({ level }), className)} {...props}>
      {children}
    </div>
  );
}

export function SurfaceBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}
