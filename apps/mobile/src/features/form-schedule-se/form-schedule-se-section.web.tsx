import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { FormScheduleSEPreview } from "./form-schedule-se-preview";
import { createEmptyFormScheduleSESnapshot } from "./form-schedule-se-model";

interface FormScheduleSESectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleSE"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function FormScheduleSESection(props: FormScheduleSESectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;

  return (
    <FormScheduleSEPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={null}
      footerNote={copy.footerWeb}
      isLoaded={true}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      sectionEyebrow={copy.webPreviewLabel}
      snapshot={createEmptyFormScheduleSESnapshot()}
    />
  );
}
