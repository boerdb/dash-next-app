import { cn } from "@/lib/utils";

const cardVariants = {
  default: "border-card-border bg-card",
  weather:
    "border-sky-500/20 bg-gradient-to-br from-sky-100/70 via-card to-card dark:from-sky-950/40",
  energy:
    "border-amber-500/20 bg-gradient-to-br from-amber-100/60 via-card to-card dark:from-amber-950/30",
} as const;

export type CardVariant = keyof typeof cardVariants;

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur-xl shadow-lg",
        cardVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


export function CardContent({
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
