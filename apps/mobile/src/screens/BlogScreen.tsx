import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/colors';

export default function BlogScreen() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://rentdanang.app/en/blog' }}
        style={styles.webview}
        startInLoadingState
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  webview: {
    flex: 1,
  },
});
