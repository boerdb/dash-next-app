import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-primary px-4 py-2 text-white",
        ghost: "px-3 py-2 text-surface-muted hover:bg-surface-subtle hover:text-foreground",
        outline: "border border-border px-4 py-2 text-foreground hover:bg-surface-subtle",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export function IconButton({
  className,
  variant = "ghost",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  Pick<VariantProps<typeof buttonVariants>, "variant">) {
  return (
    <button
      className={cn(buttonVariants({ variant, size: "icon" }), className)}
      {...props}
    />
  );
}

export function ChartNavButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <IconButton
      variant="ghost"
      className={cn("text-surface-muted hover:text-foreground", className)}
      {...props}
    />
  );
}
