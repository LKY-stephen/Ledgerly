import { SQLiteProvider } from "expo-sqlite";
import type { ReactNode } from "react";
import { getLocalStorageBootstrapPlan } from "@creator-cfo/storage";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { initializeLocalDatabase } from "../../storage/database";
import { FormScheduleCPreview } from "./form-schedule-c-preview";
import { useFormScheduleC } from "./use-form-schedule-c.native";

interface FormScheduleCSectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["formScheduleC"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

const storagePlan = getLocalStorageBootstrapPlan();

export function FormScheduleCSection(props: FormScheduleCSectionProps) {
  return (
    <SQLiteProvider databaseName={storagePlan.databaseName} onInit={initializeLocalDatabase}>
      <FormScheduleCNativeSection {...props} />
    </SQLiteProvider>
  );
}

function FormScheduleCNativeSection(props: FormScheduleCSectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;
  const { error, isLoaded, snapshot } = useFormScheduleC();

  return (
    <FormScheduleCPreview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={error}
      footerNote={copy.footerNative}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      sectionEyebrow="Schedule C"
      snapshot={snapshot}
    />
  );
}
