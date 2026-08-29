import { cn } from "@/lib/utils";
import { Surface, SurfaceBody } from "@/components/ui/surface";

export function StationCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Surface level="raised" className={className}>
      <SurfaceBody className={cn(title && "pt-3", bodyClassName)}>
        {title ? (
          <p className="text-label mb-3 text-center font-medium tracking-wide text-surface-muted">
            {title}
          </p>
        ) : null}
        {children}
      </SurfaceBody>
    </Surface>
  );
}

export function StationSplit({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 divide-x divide-border-subtle", className)}>
      {children}
    </div>
  );
}

export function StationCol({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-4 odd:pl-0 even:pr-0", className)}>{children}</div>
  );
}

export function DerivedMetric({
  label,
  value,
  unit,
  tone = "amber",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "amber" | "export" | "muted";
}) {
  const tones = {
    amber: "text-accent-amber",
    export: "text-accent-export",
    muted: "text-surface-muted",
  } as const;

  return (
    <p className="text-caption mt-1.5">
      <span className="text-surface-muted">{label} </span>
      <span className={cn("font-semibold tabular-nums", tones[tone])}>
        {value}
        {unit ? <span className="ml-0.5 font-normal">{unit}</span> : null}
      </span>
    </p>
  );
}

export function RainList({
  rows,
  className,
}: {
  rows: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("space-y-1.5", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-caption text-surface-muted">{row.label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-accent-export">
            {row.value}
            <span className="ml-1 font-normal text-surface-muted">mm</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
