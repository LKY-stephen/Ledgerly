import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { useResponsive } from "../hooks/use-responsive";
import { useAppShell } from "../features/app-shell/provider";

interface WebLayoutOverride {
  setFullWidth: (enabled: boolean) => void;
}

const WebLayoutOverrideContext = createContext<WebLayoutOverride>({
  setFullWidth: () => {},
});

export function useWebLayoutFullWidth(enabled: boolean) {
  const { setFullWidth } = useContext(WebLayoutOverrideContext);

  useEffect(() => {
    setFullWidth(enabled);
    return () => setFullWidth(false);
  }, [enabled, setFullWidth]);
}

interface WebLayoutContainerProps {
  children: ReactNode;
}

export function WebLayoutContainer({ children }: WebLayoutContainerProps) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return <WebLayoutInner>{children}</WebLayoutInner>;
}

function WebLayoutInner({ children }: { children: ReactNode }) {
  const { contentMaxWidth } = useResponsive();
  const { palette } = useAppShell();
  const [fullWidth, setFullWidthRaw] = useState(false);

  const setFullWidth = useCallback((v: boolean) => setFullWidthRaw(v), []);

  const override = useMemo(() => ({ setFullWidth }), [setFullWidth]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousBackground = document.body.style.backgroundColor;
    document.body.style.backgroundColor = palette.shell;

    return () => {
      document.body.style.backgroundColor = previousBackground;
    };
  }, [palette.shell]);

  return (
    <WebLayoutOverrideContext.Provider value={override}>
      <View style={[styles.outerContainer, { backgroundColor: palette.shell }]}>
        <View
          style={[
            styles.innerContainer,
            {
              backgroundColor: palette.shell,
              maxWidth: fullWidth ? undefined : contentMaxWidth,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </WebLayoutOverrideContext.Provider>
  );
}

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    width: "100%",
  },
  outerContainer: {
    alignItems: "center",
    flex: 1,
  },
});
