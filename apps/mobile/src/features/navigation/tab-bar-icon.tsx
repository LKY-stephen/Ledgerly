import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

import { useAppShell } from "../app-shell/provider";
import { getNavigationTheme } from "../app-shell/theme-utils";

interface AnimatedTabBarButtonProps extends BottomTabBarButtonProps {
  children: ReactNode;
}

export function TabBarIcon({
  accessibilityState,
  children,
  onLongPress,
  onPress,
}: AnimatedTabBarButtonProps) {
  const { palette } = useAppShell();
  const focused = accessibilityState?.selected ?? false;
  const scale = useRef(new Animated.Value(focused ? 1 : 0.98)).current;
  const navigationTheme = getNavigationTheme(palette);

  const runFocusAnimation = () => {
    Animated.sequence([
      Animated.spring(scale, {
        damping: 11,
        mass: 0.78,
        stiffness: 220,
        toValue: 1.02,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        damping: 13,
        mass: 0.82,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (focused) {
      runFocusAnimation();
      return;
    }

    Animated.parallel([
      Animated.spring(scale, {
        damping: 12,
        mass: 0.86,
        stiffness: 160,
        toValue: 0.98,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onLongPress={onLongPress}
      onPress={(event) => {
        runFocusAnimation();
        onPress?.(event);
      }}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.wrap,
          {
            backgroundColor: focused
              ? navigationTheme.tabIndicatorBackground
              : "transparent",
            borderColor: focused
              ? navigationTheme.tabIndicatorBorder
              : "transparent",
          },
        ]}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.contentInner}>{children}</View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  contentInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressable: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  wrap: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minWidth: 84,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
});
