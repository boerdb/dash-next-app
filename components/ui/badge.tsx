import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-caption font-semibold",
  {
    variants: {
      variant: {
        default: "bg-surface-subtle text-surface-muted",
        weather: "bg-accent-weather-soft text-accent-weather",
        energy: "bg-accent-energy-soft text-accent-energy",
        export: "bg-accent-export-soft text-accent-export",
        danger: "bg-accent-danger/12 text-accent-danger",
        violet: "bg-accent-violet-soft text-accent-violet",
        amber: "bg-accent-amber-soft text-accent-amber",
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
