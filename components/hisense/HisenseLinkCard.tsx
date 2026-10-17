import { Surface, SurfaceBody } from "@/components/ui/surface";

export function HisenseLinkCard() {
  return (
    <Surface level="raised">
      <SurfaceBody className="space-y-3 text-caption leading-relaxed text-surface-muted">
        <p>
          De WD5I1245BBRH/BLX heeft wifi, maar geen API op het thuisnetwerk. Status
          en bediening lopen via ConnectLife in de cloud. Koppelen gebeurt met het
          ConnectLife-account. Er staan hier nog geen inloggegevens.
        </p>
        <p>
          Was-droogcombinaties vallen onder apparaattype 025. De featurecode van
          deze machine volgt uit het account en bepaalt welke programma’s, fasen
          en opties de app kan tonen.
        </p>
      </SurfaceBody>
    </Surface>
  );
}
