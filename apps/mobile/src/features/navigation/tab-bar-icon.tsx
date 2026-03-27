import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import type { SurfaceTokens } from "@creator-cfo/ui";

interface AnimatedTabBarButtonProps extends BottomTabBarButtonProps {
  children: ReactNode;
  palette: SurfaceTokens;
}

export function TabBarIcon({
  accessibilityState,
  children,
  onLongPress,
  onPress,
  palette,
}: AnimatedTabBarButtonProps) {
  const focused = accessibilityState?.selected ?? false;
  const wobble = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(focused ? 1 : 0.98)).current;

  const runFocusAnimation = () => {
    wobble.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 95,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: -0.85,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0.5,
          duration: 95,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(scale, {
        damping: 9,
        mass: 0.72,
        stiffness: 220,
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
  }, [focused, scale, wobble]);

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
            backgroundColor: focused ? palette.accentSoft : "transparent",
            borderColor: focused ? palette.border : "transparent",
          },
        ]}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                { scale },
                {
                  rotate: wobble.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ["-9deg", "0deg", "9deg"],
                  }),
                },
                {
                  translateY: wobble.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [0, 0, -2],
                  }),
                },
              ],
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
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  wrap: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 74,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
