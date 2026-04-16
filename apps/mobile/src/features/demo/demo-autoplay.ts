const demoAutoplayFlow = (
  process.env.EXPO_PUBLIC_DEMO_AUTOPLAY_FLOW ?? ""
).trim();

type DemoAutoplayStep =
  | "home"
  | "upload"
  | "planner"
  | "review"
  | "approve"
  | "ledger";

const completedSteps = new Set<DemoAutoplayStep>();

export function isUploadParsePersistDemoEnabled(): boolean {
  return demoAutoplayFlow === "upload_parse_persist";
}

export function beginDemoAutoplayStep(step: DemoAutoplayStep): boolean {
  if (!isUploadParsePersistDemoEnabled()) {
    return false;
  }

  if (completedSteps.has(step)) {
    return false;
  }

  completedSteps.add(step);
  return true;
}

export function resetDemoAutoplaySteps() {
  completedSteps.clear();
}
