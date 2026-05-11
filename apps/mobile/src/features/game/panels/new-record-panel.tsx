import { StyleSheet, View } from "react-native";

import { LedgerUploadScreen } from "../../ledger/ledger-upload-screen";

export function NewRecordPanel() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <LedgerUploadScreen embedded />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
});
