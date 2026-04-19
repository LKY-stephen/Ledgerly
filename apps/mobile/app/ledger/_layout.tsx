import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function LedgerFlowLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="upload" options={{
        presentation: Platform.OS === "web" ? "transparentModal" : "card",
        animation: Platform.OS === "web" ? "fade" : "default",
        contentStyle: Platform.OS === "web" ? { backgroundColor: "transparent" } : undefined,
      }} />
    </Stack>
  );
}
