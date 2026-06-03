import { useRouter } from "expo-router";
import { useCallback } from "react";

const GAME_HOME_ROUTE = "/(game)" as const;

export function useBackOrHome() {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(GAME_HOME_ROUTE);
  }, [router]);
}
