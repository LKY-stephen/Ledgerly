import { StyleSheet, Text, View } from "react-native";

interface StatPillProps {
  label: string;
  value: string;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: "#5b6472",
    fontSize: 12,
  },
  pill: {
    minWidth: 132,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#dff8f4",
  },
  value: {
    color: "#0f766e",
    fontSize: 20,
    fontWeight: "700",
  },
});

