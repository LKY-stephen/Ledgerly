import { useState } from "react";
import type { ReactNode } from "react";
import type { SurfaceTokens } from "@ledgerly/ui";

import type { AppCopy } from "../app-shell/copy";
import { LocalStorageProvider } from "../../storage/provider.native";
import { FormScheduleSEPreview } from "./form-schedule-se-preview";
import { useFormScheduleSE } from "./use-form-schedule-se.native";

interface FormScheduleSESectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleSE"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function FormScheduleSESection(props: FormScheduleSESectionProps) {
  return (
    <LocalStorageProvider>
      <FormScheduleSENativeSection {...props} />
    </LocalStorageProvider>
  );
}

function FormScheduleSENativeSection(props: FormScheduleSESectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;
  const currentTaxYear = new Date().getFullYear();
  const taxYearOptions = [currentTaxYear - 1, currentTaxYear];
  const [selectedTaxYear, setSelectedTaxYear] = useState(currentTaxYear);
  const { error, isLoaded, snapshot } = useFormScheduleSE({ taxYear: selectedTaxYear });

  return (
    <FormScheduleSEPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={error}
      footerNote={copy.footerNative}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      onSelectTaxYear={setSelectedTaxYear}
      palette={palette}
      renderLauncher={renderLauncher}
      selectedTaxYear={selectedTaxYear}
      sectionEyebrow="Schedule SE"
      snapshot={snapshot}
      taxYearOptions={taxYearOptions}
    />
  );
}
