import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { LocalStorageProvider } from "../../storage/provider.native";
import { Form1040Preview } from "./form-1040-preview";
import { useForm1040 } from "./use-form-1040";

interface Form1040SectionProps {
  calculatedBadge: string;
  copy: AppCopy["discover"]["form1040"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function Form1040Section(props: Form1040SectionProps) {
  return (
    <LocalStorageProvider>
      <Form1040NativeSection {...props} />
    </LocalStorageProvider>
  );
}

function Form1040NativeSection(props: Form1040SectionProps) {
  const { calculatedBadge, copy, manualBadge, palette, renderLauncher } = props;
  const { error, isLoaded, snapshot } = useForm1040();

  return (
    <Form1040Preview
      calculatedBadge={calculatedBadge}
      copy={copy}
      error={error}
      footerNote={copy.footerNative}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      palette={palette}
      renderLauncher={renderLauncher}
      sectionEyebrow="Form 1040"
      snapshot={snapshot}
    />
  );
}
