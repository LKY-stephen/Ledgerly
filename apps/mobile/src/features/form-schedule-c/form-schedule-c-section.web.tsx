import { useState } from "react";
import type { ReactNode } from "react";
import type { SurfaceTokens } from "@ledgerly/ui";

import type { AppCopy } from "../app-shell/copy";
import { LocalStorageProvider } from "../../storage/provider.web";
import { getCurrentFormScheduleCTaxYear } from "./form-schedule-c-model";
import { FormScheduleCPreview } from "./form-schedule-c-preview";
import { useFormScheduleC } from "./use-form-schedule-c.web";

interface FormScheduleCSectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleC"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function FormScheduleCSection(props: FormScheduleCSectionProps) {
  return (
    <LocalStorageProvider>
      <FormScheduleCWebSection {...props} />
    </LocalStorageProvider>
  );
}

function FormScheduleCWebSection(props: FormScheduleCSectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;
  const currentTaxYear = getCurrentFormScheduleCTaxYear();
  const taxYearOptions = [currentTaxYear - 1, currentTaxYear];
  const [selectedTaxYear, setSelectedTaxYear] = useState(currentTaxYear);
  const { error, isLoaded, snapshot } = useFormScheduleC({ taxYear: selectedTaxYear });

  return (
    <FormScheduleCPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={error}
      footerNote={copy.footerWeb}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      selectedTaxYear={selectedTaxYear}
      sectionEyebrow="Schedule C"
      snapshot={snapshot}
      taxYearOptions={taxYearOptions}
      onSelectTaxYear={setSelectedTaxYear}
    />
  );
}
