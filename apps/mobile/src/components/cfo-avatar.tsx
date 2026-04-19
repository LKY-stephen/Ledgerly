import { Image, StyleSheet } from "react-native";

import ledgerlyIcon from "../../assets/ledgerly_icon.png";

interface CfoAvatarProps {
  size?: number;
}

export function CfoAvatar({ size = 34 }: CfoAvatarProps) {
  return <Image source={ledgerlyIcon} style={[styles.image, { borderRadius: size / 2, height: size, width: size }]} />;
}

const styles = StyleSheet.create({
  image: {
    overflow: "hidden",
  },
});
