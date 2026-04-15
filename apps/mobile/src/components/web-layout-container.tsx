import { Platform, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { useResponsive } from "../hooks/use-responsive";

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

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { maxWidth: contentMaxWidth }]}>
        {children}
      </View>
    </View>
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
