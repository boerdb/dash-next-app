import { Badge } from "@/components/ui/badge";
import { Metric, MetricRow } from "@/components/ui/metric";
import { Surface, SurfaceBody } from "@/components/ui/surface";
import { WD5I1245BBRH } from "@/lib/hisense/profile";

export function HisenseMachineCard() {
  const machine = WD5I1245BBRH;

  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{machine.model}</h3>
          <p className="text-caption mt-0.5 text-surface-muted">
            {machine.brand} {machine.kind} · {machine.color} · {machine.dryerType}
          </p>
        </div>

        <MetricRow>
          <Metric label="Wassen" value={machine.washCapacityKg} unit="kg" size="sm" />
          <Metric label="Drogen" value={machine.dryCapacityKg} unit="kg" size="sm" />
          <Metric label="Centrifuge" value={machine.spinRpm} unit="tpm" size="sm" />
          <Metric label="Aansluiting" value={machine.powerW} unit="W" size="sm" />
        </MetricRow>

        <p className="text-caption text-surface-muted">
          Energieklasse wassen {machine.energyClassWash}, drogen {machine.energyClassDry}.
        </p>

        <div className="flex flex-wrap gap-2">
          {machine.features.map((feature) => (
            <Badge key={feature} variant="teal">
              {feature}
            </Badge>
          ))}
        </div>
      </SurfaceBody>
    </Surface>
  );
}
