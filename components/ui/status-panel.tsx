import { Button } from "@/components/ui/button";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

interface StatusPanelProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function StatusPanel({
  title = "Gegevens niet beschikbaar",
  message,
  onRetry,
  className,
}: StatusPanelProps) {
  return (
    <Surface level="flat" className={cn("border-accent-danger/20", className)}>
      <SurfaceBody className="text-center">
        <p className="font-medium text-foreground">{title}</p>
        {message ? (
          <p className="text-caption mt-1 text-surface-muted">{message}</p>
        ) : null}
        {onRetry ? (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Opnieuw proberen
          </Button>
        ) : null}
      </SurfaceBody>
    </Surface>
  );
}

/** @deprecated Use StatusPanel */
export function DataError(props: StatusPanelProps) {
  return <StatusPanel {...props} />;
}
