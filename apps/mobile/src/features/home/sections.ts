import { productModules, supportedPlatforms, workflowPrinciples } from "@creator-cfo/schemas";
import {
  deviceStateContract,
  fileVaultContract,
  getLocalStorageOverview,
} from "@creator-cfo/storage";

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
  const overview = getLocalStorageOverview();
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

  const storageCards: MetricDefinition[] = [
    {
      icon: "bootstrap",
      label: copy.home.storageTitle,
      summary: copy.home.storageLabel,
      value: overview.tableCount.toString(),
    },
    {
      icon: "workflow",
      label: copy.home.storageViewsTitle,
      summary: copy.home.storageViewsLabel,
      value: overview.viewCount.toString(),
    },
    {
      icon: "vault",
      label: copy.home.collectionsTitle,
      summary: copy.home.collectionsLabel,
      value: overview.collectionCount.toString(),
    },
    {
      icon: "device",
      label: copy.home.storageDeviceTitle,
      summary: copy.home.storageDeviceLabel,
      value: deviceStateContract.records.length.toString(),
    },
  ];

  return {
    focusCards: copy.home.focusCards,
    heroMetrics,
    modules: productModules,
    platforms: supportedPlatforms,
    sessionTitle,
    storageCards,
    storageCollections: fileVaultContract.collections,
    workflowPrinciples,
  };
}
