import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { createEmptyFormScheduleCSnapshot } from "./form-schedule-c-model";
import { FormScheduleCPreview } from "./form-schedule-c-preview";

interface FormScheduleCSectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleC"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function FormScheduleCSection(props: FormScheduleCSectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;

  return (
    <FormScheduleCPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={null}
      footerNote={copy.footerWeb}
      isLoaded={true}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      sectionEyebrow={copy.webPreviewLabel}
      snapshot={createEmptyFormScheduleCSnapshot()}
    />
  );
}
