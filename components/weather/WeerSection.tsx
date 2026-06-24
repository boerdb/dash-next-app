import { cn } from "@/lib/utils";

interface WeerSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function WeerSection({
  title,
  subtitle,
  children,
  className,
}: WeerSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <header>
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
