import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useResponsive } from "../hooks/use-responsive";

interface ResponsiveColumnsProps {
  children: ReactNode;
  gap?: number;
  left: ReactNode;
  ratio?: `${number}:${number}`;
  right: ReactNode;
  style?: ViewStyle;
}

export function ResponsiveColumns({
  gap = 16,
  left,
  ratio = "1:1",
  right,
  style,
}: ResponsiveColumnsProps) {
  const { isCompact } = useResponsive();
  const [leftFlex, rightFlex] = ratio.split(":").map(Number);

  if (isCompact) {
    return (
      <View style={style}>
        {left}
        {right}
      </View>
    );
  }

  return (
    <View style={[styles.row, { gap }, style]}>
      <View style={{ flex: leftFlex }}>{left}</View>
      <View style={{ flex: rightFlex }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
});
