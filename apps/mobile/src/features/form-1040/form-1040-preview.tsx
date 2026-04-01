import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { ParsedFormCanvas } from "../tax-form-common/parsed-form-canvas";
import { TaxFormPreview } from "../tax-form-common/tax-form-preview";
import type { Form1040DatabaseSnapshot } from "./form-1040-model";
import { buildForm1040Slots, form1040DisclaimerText } from "./form-1040-model";
import { getForm1040LayoutPage } from "./form-1040-layout";

interface Form1040PreviewProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["form1040"];
  error: string | null;
  footerNote: string;
  isLoaded: boolean;
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
  sectionEyebrow: string;
  snapshot: Form1040DatabaseSnapshot;
}

export function Form1040Preview(props: Form1040PreviewProps) {
  const { calculatedBadge, copy, error, footerNote, isLoaded, manualBadge, palette, renderLauncher, sectionEyebrow, snapshot } = props;
  const slots = buildForm1040Slots(snapshot, {
    noInstructionNote: copy.noInstructionNote,
  });

  return (
    <TaxFormPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      disclaimerText={form1040DisclaimerText}
      error={error}
      footerNote={footerNote}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      palette={palette}
      renderCanvas={(canvasProps) => (
        <ParsedFormCanvas
          getLayoutPage={getForm1040LayoutPage}
          {...canvasProps}
        />
      )}
      renderLauncher={renderLauncher}
      sectionEyebrow={sectionEyebrow}
      slots={slots}
    />
  );
}
