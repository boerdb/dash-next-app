import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        ghost:
          "text-surface-muted hover:bg-surface-subtle hover:text-foreground",
        outline:
          "border border-card-border bg-card text-foreground hover:bg-surface-subtle",
      },
      size: {
        default: "px-4 py-2",
        sm: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
