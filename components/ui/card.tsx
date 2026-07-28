import { Surface, SurfaceBody } from "@/components/ui/surface";

/** @deprecated Use Surface */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) {
  return (
    <Surface level="raised" className={className} {...props}>
      {children}
    </Surface>
  );
}

/** @deprecated Use SurfaceBody */
export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <SurfaceBody className={className} {...props}>
      {children}
    </SurfaceBody>
  );
}

export type CardVariant = "default" | "weather" | "energy";
