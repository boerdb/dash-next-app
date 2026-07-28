import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-label font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-subtle text-surface-muted",
        weather: "border-accent-weather/30 text-accent-weather",
        energy: "border-accent-energy/30 text-accent-energy",
        export: "border-accent-export/30 text-accent-export",
        danger: "border-accent-danger/30 text-accent-danger",
        violet: "border-accent-violet/30 text-accent-violet",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({
  className,
  variant,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}
