import { Image, StyleSheet, View } from "react-native";

import ledgerlyIcon from "../../assets/ledgerly_icon.png";

interface LedgerlyIconMarkProps {
  size?: number;
}

export function LedgerlyIconMark({
  size = 96,
}: LedgerlyIconMarkProps) {
  const radius = Math.round(size * 0.18);

  return (
    <View
      style={[
        styles.frame,
        {
          borderRadius: radius,
          height: size,
          width: size,
        },
      ]}
    >
      <Image
        source={ledgerlyIcon}
        style={[
          styles.image,
          {
            borderRadius: radius,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
  image: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
});
