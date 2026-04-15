import { Platform, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

interface WebLayoutContainerProps {
  children: ReactNode;
}

export function WebLayoutContainer({ children }: WebLayoutContainerProps) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.innerContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  innerContainer: {
    flex: 1,
    maxWidth: 480,
    width: "100%",
  },
  outerContainer: {
    alignItems: "center",
    flex: 1,
  },
});
