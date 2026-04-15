import type { ReactNode } from "react";
import { Children } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useResponsive, type ResponsiveInfo } from "../hooks/use-responsive";

interface ColumnSpec {
  compact?: number;
  expanded?: number;
  medium?: number;
}

interface ResponsiveGridProps {
  children: ReactNode;
  columns: ColumnSpec;
  gap?: number;
  style?: ViewStyle;
}

function getColumns(spec: ColumnSpec, bp: ResponsiveInfo["breakpoint"]): number {
  if (bp === "expanded") return spec.expanded ?? spec.medium ?? spec.compact ?? 1;
  if (bp === "medium") return spec.medium ?? spec.compact ?? 1;
  return spec.compact ?? 1;
}

export function ResponsiveGrid({
  children,
  columns,
  gap = 10,
  style,
}: ResponsiveGridProps) {
  const responsive = useResponsive();
  const cols = getColumns(columns, responsive.breakpoint);
  const items = Children.toArray(children);

  return (
    <View style={[styles.grid, { gap }, style]}>
      {items.map((child: ReactNode, index: number) => (
        <View
          key={index}
          style={{
            flexBasis: `${100 / cols}%`,
            flexGrow: 0,
            flexShrink: 0,
            maxWidth: `${100 / cols}%`,
            paddingLeft: index % cols === 0 ? 0 : gap / 2,
            paddingRight: (index + 1) % cols === 0 ? 0 : gap / 2,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
