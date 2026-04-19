import type { ReactNode } from "react";
import type { SurfaceTokens } from "@ledgerly/ui";

import type { AppCopy } from "../app-shell/copy";
import { LocalStorageProvider } from "../../storage/provider.native";
import { Form1099NecPreview } from "./form-1099-nec-preview";
import { useForm1099Nec } from "./use-form-1099-nec.native";

interface Form1099NecSectionProps {
  copy: AppCopy["discover"]["form1099Nec"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function Form1099NecSection(props: Form1099NecSectionProps) {
  return (
    <LocalStorageProvider>
      <Form1099NecNativeSection {...props} />
    </LocalStorageProvider>
  );
}

function Form1099NecNativeSection(props: Form1099NecSectionProps) {
  const { copy, manualBadge, palette, renderLauncher } = props;
  const { error, isLoaded, recipients, selectedRecipientId, selectRecipient, snapshot } =
    useForm1099Nec();

  return (
    <Form1099NecPreview
      copy={copy}
      error={error}
      footerNote={copy.footerNative}
      isLoaded={isLoaded}
      manualBadge={manualBadge}
      palette={palette}
      recipients={recipients}
      renderLauncher={renderLauncher}
      sectionEyebrow="1099-NEC"
      selectedRecipientId={selectedRecipientId}
      snapshot={snapshot}
      onSelectRecipient={selectRecipient}
    />
  );
}
