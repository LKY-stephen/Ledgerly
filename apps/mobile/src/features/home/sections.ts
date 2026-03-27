import { productModules, supportedPlatforms, workflowPrinciples } from "@creator-cfo/schemas";
import { deviceStateContract, fileVaultContract, structuredStoreContract } from "@creator-cfo/storage";

import type { AppCopy } from "../app-shell/copy";
import type { AppSession } from "../app-shell/types";
import type { AppIconName } from "../../components/app-icon";

interface MetricDefinition {
  icon: AppIconName;
  label: string;
  summary: string;
  value: string;
}

export function buildHomeSections(copy: AppCopy, session: AppSession | null) {
  const sessionTitle =
    session?.kind === "apple"
      ? copy.home.sessionApple
      : session?.kind === "guest"
      ? copy.home.sessionGuest
        : copy.home.sessionSignedOut;

  const heroMetrics: MetricDefinition[] = [
    {
      icon: "modules",
      label: copy.home.metricModulesLabel,
      summary: copy.home.metricModulesSummary,
      value: productModules.length.toString(),
    },
    {
      icon: "platforms",
      label: copy.home.metricPlatformsLabel,
      summary: copy.home.metricPlatformsSummary,
      value: supportedPlatforms.length.toString(),
    },
    {
      icon: "bootstrap",
      label: copy.home.metricBootstrapLabel,
      summary: copy.home.metricBootstrapSummary,
      value: copy.home.metricBootstrapReady,
    },
  ];

  return {
    focusCards: copy.home.focusCards,
    heroMetrics,
    modules: productModules,
    platforms: supportedPlatforms,
    sessionTitle,
    storageCards: [
      {
        icon: "bootstrap" as const,
        title: copy.home.storageTitle,
        value: structuredStoreContract.tables.length.toString(),
        label: copy.home.storageLabel,
      },
      {
        icon: "vault" as const,
        title: copy.home.collectionsTitle,
        value: fileVaultContract.collections.length.toString(),
        label: copy.home.collectionsLabel,
      },
      {
        icon: "device" as const,
        title: copy.home.storageDeviceTitle,
        value: deviceStateContract.records.length.toString(),
        label: copy.home.storageDeviceLabel,
      },
    ],
    storageCollections: fileVaultContract.collections,
    workflowPrinciples,
  };
}
