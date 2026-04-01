import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { Form1040Preview } from "./form-1040-preview";
import { createEmptyForm1040Snapshot } from "./form-1040-model";

interface Form1040SectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["form1040"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function Form1040Section(props: Form1040SectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;

  return (
    <Form1040Preview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={null}
      footerNote={copy.footerWeb}
      isLoaded={true}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      sectionEyebrow={copy.webPreviewLabel}
      snapshot={createEmptyForm1040Snapshot()}
    />
  );
}
