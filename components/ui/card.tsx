import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border shadow-[var(--elevation-shadow)]",
  {
    variants: {
      variant: {
        default: "border-card-border bg-card",
        weather: "border-accent-weather/20 bg-accent-weather-soft",
        energy: "border-accent-energy/20 bg-accent-energy-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type CardVariant = NonNullable<VariantProps<typeof cardVariants>["variant"]>;

export function Card({
  className,
  variant = "default",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props}>
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
