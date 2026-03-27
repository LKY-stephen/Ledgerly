import type { AppCopy } from "../app-shell/copy";
import type { AppIconName } from "../../components/app-icon";

export interface TabScreenSpec {
  icon: AppIconName;
  name: "index" | "ledger" | "discover" | "profile";
  title: string;
}

export function buildTabScreenSpecs(copy: AppCopy): TabScreenSpec[] {
  return [
    {
      icon: "home",
      name: "index",
      title: copy.tabs.home,
    },
    {
      icon: "ledger",
      name: "ledger",
      title: copy.tabs.ledger,
    },
    {
      icon: "discover",
      name: "discover",
      title: copy.tabs.discover,
    },
    {
      icon: "profile",
      name: "profile",
      title: copy.tabs.profile,
    },
  ];
}
