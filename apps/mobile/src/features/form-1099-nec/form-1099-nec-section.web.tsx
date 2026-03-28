import type { ReactNode } from "react";
import type { SurfaceTokens } from "@creator-cfo/ui";

import type { AppCopy } from "../app-shell/copy";
import { Form1099NecPreview } from "./form-1099-nec-preview";
import { createEmptyForm1099NecSnapshot } from "./form-1099-nec-model";

interface Form1099NecSectionProps {
  copy: AppCopy["discover"]["form1099Nec"];
  manualBadge: string;
  palette: SurfaceTokens;
  renderLauncher?: (openPreview: () => void) => ReactNode;
}

export function Form1099NecSection(props: Form1099NecSectionProps) {
  const { copy, manualBadge, palette, renderLauncher } = props;

  return (
    <Form1099NecPreview
      copy={copy}
      error={null}
      footerNote={copy.footerWeb}
      isLoaded={true}
      manualBadge={manualBadge}
      palette={palette}
      recipients={[]}
      renderLauncher={renderLauncher}
      sectionEyebrow={copy.webPreviewLabel}
      selectedRecipientId={null}
      snapshot={createEmptyForm1099NecSnapshot()}
      onSelectRecipient={() => {
        return;
      }}
    />
  );
}
