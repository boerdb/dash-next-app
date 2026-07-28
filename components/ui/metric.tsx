import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  size?: "sm" | "md" | "lg";
  accent?: "weather" | "energy" | "export" | "danger" | "violet" | "default";
  className?: string;
}

const accentClasses = {
  default: "text-foreground",
  weather: "text-accent-weather",
  energy: "text-accent-energy",
  export: "text-accent-export",
  danger: "text-accent-danger",
  violet: "text-accent-violet",
} as const;

export function Metric({
  label,
  value,
  unit,
  size = "md",
  accent = "default",
  className,
}: MetricProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-label text-surface-muted">{label}</p>
      <p
        className={cn(
          "mt-1 font-bold tabular-nums leading-none",
          size === "sm" && "text-lg",
          size === "md" && "text-metric",
          size === "lg" && "text-metric-lg",
          accentClasses[accent]
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-surface-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

interface MetricRowProps {
  children: React.ReactNode;
  className?: string;
}

export function MetricRow({ children, className }: MetricRowProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

interface MetricTableProps {
  children: React.ReactNode;
  className?: string;
}

export function MetricTable({ children, className }: MetricTableProps) {
  return (
    <div className={cn("divide-y divide-border-subtle", className)}>{children}</div>
  );
}

export function MetricTableRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3", className)}>
      <p className="text-label pt-1 text-surface-muted">{label}</p>
      <div className="text-right">{children}</div>
    </div>
  );
}

export function MetricTrend({
  children,
  direction = "neutral",
  className,
}: {
  children: React.ReactNode;
  direction?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-caption mt-1 inline-flex items-center gap-1 font-medium tabular-nums",
        direction === "up" && "text-accent-energy",
        direction === "down" && "text-accent-weather",
        direction === "neutral" && "text-surface-muted",
        className
      )}
    >
      {children}
    </p>
  );
}
