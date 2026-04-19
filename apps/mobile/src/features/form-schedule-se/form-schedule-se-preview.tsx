import type { ReactNode } from "react";
import type { SurfaceTokens } from "@ledgerly/ui";

import type { AppCopy } from "../app-shell/copy";
import { ParsedFormCanvas } from "../tax-form-common/parsed-form-canvas";
import { TaxFormPreview } from "../tax-form-common/tax-form-preview";
import type { FormScheduleSEDatabaseSnapshot } from "./form-schedule-se-model";
import { buildFormScheduleSESlots, formScheduleSEDisclaimerText } from "./form-schedule-se-model";
import { getScheduleSELayoutPage } from "./form-schedule-se-layout";

interface FormScheduleSEPreviewProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleSE"];
  error: string | null;
  footerNote: string;
  isLoaded: boolean;
  manualBadge: string;
  onSelectTaxYear?: (taxYear: number) => void;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
  selectedTaxYear?: number;
  sectionEyebrow: string;
  snapshot: FormScheduleSEDatabaseSnapshot;
  taxYearOptions?: readonly number[];
}

export function FormScheduleSEPreview(props: FormScheduleSEPreviewProps) {
  const {
    calculatedBadge,
    copy,
    error,
    footerNote,
    isLoaded,
    manualBadge,
    onSelectTaxYear,
    palette,
    renderLauncher,
    selectedTaxYear,
    sectionEyebrow,
    snapshot,
    taxYearOptions,
  } = props;
  const slots = buildFormScheduleSESlots(snapshot, {
    noInstructionNote: copy.noInstructionNote,
  });

  return (
    <TaxFormPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      disclaimerText={formScheduleSEDisclaimerText}
      error={error}
      footerNote={footerNote}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      onSelectTaxYear={onSelectTaxYear}
      palette={palette}
      renderCanvas={(canvasProps) => (
        <ParsedFormCanvas
          getLayoutPage={getScheduleSELayoutPage}
          {...canvasProps}
        />
      )}
      renderLauncher={renderLauncher}
      selectedTaxYear={selectedTaxYear}
      sectionEyebrow={sectionEyebrow}
      slots={slots}
      taxYearOptions={taxYearOptions}
    />
  );
}
